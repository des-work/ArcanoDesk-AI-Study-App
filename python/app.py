import os, io, csv, json, time, hashlib, base64, sqlite3, threading, requests, importlib.util, glob
from typing import Optional, List, Dict, Any
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# -------- Paths & Config --------
HERE = os.path.dirname(__file__)
ROOT = os.path.abspath(os.path.join(HERE, ".."))
DATA_DIR = os.path.join(ROOT, "data")
LOGS_DIR = os.path.join(ROOT, "logs")
LIBRARY_DIR = os.path.join(ROOT, "Library")
DOWNLOADS_DIR = os.path.join(os.path.expanduser("~"), "Downloads")
PLUGINS_DIR = os.path.join(ROOT, "plugins")
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(LOGS_DIR, exist_ok=True)
os.makedirs(LIBRARY_DIR, exist_ok=True)
os.makedirs(PLUGINS_DIR, exist_ok=True)

CONFIG_PATH = os.path.join(DATA_DIR, "config.json")
PERMS_PATH  = os.path.join(DATA_DIR, "permissions.json")
DB_PATH     = os.path.join(DATA_DIR, "index.sqlite")
KEY_PATH    = os.path.join(DATA_DIR, "secret.key.enc")

def load_json(path, default):
    if not os.path.exists(path): return default
    try:
        with open(path, "r", encoding="utf-8") as f: return json.load(f)
    except Exception:
        return default

def save_json(path, data):
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f: json.dump(data, f, ensure_ascii=False, indent=2)
    os.replace(tmp, path)

cfg = load_json(CONFIG_PATH, {
    "offline": True,               # internet off by default (kill-switch)
    "internet_enabled": False,
    "last_warm_ts": 0.0,
    "warm_ttl_sec": 7200,
    "agent": { "gen_model": "llama3.1", "embed_model": "nomic-embed-text", "temperature": 0.2, "chunk_chars": 1200, "chunk_overlap": 120 },
    "personality": { "quips": True } # fun personality layer
})
save_json(CONFIG_PATH, cfg)

perms = load_json(PERMS_PATH, {"allowed_dirs": [], "suggested_dirs": [LIBRARY_DIR, DOWNLOADS_DIR]})
for d in [LIBRARY_DIR, DOWNLOADS_DIR]:
    if d not in perms.get("suggested_dirs", []): perms.setdefault("suggested_dirs", []).append(d)
save_json(PERMS_PATH, perms)

OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://127.0.0.1:11434")
APP_PORT   = int(os.environ.get("ARCANO_PY_PORT", "5112"))

def get_gen_model():
    c = load_json(CONFIG_PATH, {})
    return ((c.get("agent") or {}).get("gen_model")) or os.environ.get("OLLAMA_MODEL", "llama3.1")
def get_embed_model():
    c = load_json(CONFIG_PATH, {})
    return ((c.get("agent") or {}).get("embed_model")) or os.environ.get("OLLAMA_EMBED_MODEL", "nomic-embed-text")

# -------- Crypto (local encryption wrapper) --------
def dpapi_protect(b: bytes) -> bytes:
    try:
        from win32crypt import CryptProtectData
        return CryptProtectData(b, None)
    except Exception:
        return b
def dpapi_unprotect(b: bytes) -> bytes:
    try:
        from win32crypt import CryptUnprotectData
        res = CryptUnprotectData(b, None)
        if isinstance(res, tuple): return res[1]
        return res
    except Exception:
        return b

def get_cipher():
    from cryptography.fernet import Fernet
    if not os.path.exists(KEY_PATH):
        key = Fernet.generate_key()
        with open(KEY_PATH, "wb") as f: f.write(dpapi_protect(key))
        return Fernet(key)
    with open(KEY_PATH, "rb") as f: enc = f.read()
    key = dpapi_unprotect(enc); return Fernet(key)

CIPHER = get_cipher()
def enc_b64(text: str) -> str:
    if not text: return ""
    ct = CIPHER.encrypt(text.encode("utf-8"))
    return base64.b64encode(ct).decode("ascii")
def dec_b64(data: str) -> str:
    if not data: return ""
    try:
        ct = base64.b64decode(data.encode("ascii"))
        pt = CIPHER.decrypt(ct)
        return pt.decode("utf-8", errors="ignore")
    except Exception:
        return ""

# -------- Text extraction (lazy heavy deps) --------
def read_pdf(path: str) -> str:
    from PyPDF2 import PdfReader
    with open(path, "rb") as f:
        reader = PdfReader(f); out=[]
        for p in reader.pages:
            try: out.append(p.extract_text() or "")
            except Exception: pass
        return "\n".join(out).strip()

def read_docx(path: str) -> str:
    from docx import Document
    doc = Document(path)
    return "\n".join(p.text for p in doc.paragraphs if p.text).strip()

def read_csv_text(path: str, max_rows: int = 200) -> str:
    import chardet
    with open(path, "rb") as fb:
        raw = fb.read(40000)
        enc = chardet.detect(raw)["encoding"] or "utf-8"
    out = io.StringIO()
    with open(path, "r", encoding=enc, errors="ignore", newline="") as f:
        r = csv.reader(f)
        for i, row in enumerate(r):
            if i >= max_rows: break
            out.write(", ".join(row) + "\n")
    return out.getvalue().strip()

def read_image_text(path: str) -> str:
    # OCR if Tesseract is installed; otherwise return hint
    try:
        from PIL import Image
        import pytesseract
        img = Image.open(path)
        txt = pytesseract.image_to_string(img)
        return txt.strip()
    except Exception:
        return "[No OCR available]"

def extract_text(path: str) -> str:
    low = path.lower()
    if low.endswith(".pdf"):  return read_pdf(path)
    if low.endswith(".docx"): return read_docx(path)
    if low.endswith(".csv"):  return read_csv_text(path)
    if low.endswith((".png",".jpg",".jpeg",".bmp",".tif",".tiff")): return read_image_text(path)
    raise ValueError("Unsupported file type. Use PDF, DOCX, CSV, PNG, JPG.")

# -------- Chunking & Embeddings --------
def chunk_params():
    c = load_json(CONFIG_PATH, {}); a = (c.get("agent") or {})
    return int(a.get("chunk_chars", 1200)), int(a.get("chunk_overlap", 120))

def chunk_text(text: str):
    cc, ov = chunk_params()
    if not text: return []
    i, n, out = 0, len(text), []
    while i < n:
        end = min(i+cc, n); seg = text[i:end].strip()
        if seg: out.append(seg)
        i = max(end - ov, 0)
    return out

def sha256_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024*1024), b""): h.update(chunk)
    return h.hexdigest()

def db_connect():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("""CREATE TABLE IF NOT EXISTS docs(id INTEGER PRIMARY KEY, path TEXT UNIQUE, mtime REAL, sha256 TEXT);""")
    conn.execute("""CREATE TABLE IF NOT EXISTS chunks(id INTEGER PRIMARY KEY, doc_id INTEGER, ord INTEGER, text_enc TEXT, embedding_enc TEXT);""")
    conn.execute("""CREATE TABLE IF NOT EXISTS memory(id INTEGER PRIMARY KEY, mkey TEXT, value_enc TEXT, score REAL DEFAULT 0.0, created REAL);""")
    conn.execute("""CREATE TABLE IF NOT EXISTS feedback(id INTEGER PRIMARY KEY, sid TEXT, action TEXT, thumbs INTEGER, created REAL, meta TEXT);""")
    return conn

def embed(texts: List[str]):
    model = get_embed_model(); out=[]
    for t in texts:
        try:
            r = requests.post(f"{OLLAMA_URL}/api/embeddings", json={"model": model, "prompt": t}, timeout=60)
            r.raise_for_status()
            data = r.json()
            vec = data.get("embedding") or data.get("embeddings") or []
            out.append(vec)
        except Exception:
            out.append([])
    return out

def cosine(a,b):
    if not a or not b or len(a)!=len(b): return 0.0
    num=0.0; da=0.0; db=0.0
    for x,y in zip(a,b): num+=x*y; da+=x*x; db+=y*y
    den = (da**0.5)*(db**0.5)
    return (num/den) if den else 0.0

def ollama_generate(prompt: str) -> str:
    model = get_gen_model()
    try:
        r = requests.post(f"{OLLAMA_URL}/api/generate", json={"model": model, "prompt": prompt, "stream": False}, timeout=120)
        r.raise_for_status()
        return (r.json().get("response") or "").strip()
    except Exception as e:
        return f"[Ollama error] {e}"

# -------- Warmup --------
app = FastAPI(title="Arcano Desk Service", version="0.6.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

_warmup = {"running": False, "progress": 0, "stage": "Idle", "started_at": 0.0, "steps": []}
_warmup_lock = threading.Lock()

def _set_stage(pct:int, stage:str):
    with _warmup_lock:
        _warmup["progress"]=pct; _warmup["stage"]=stage

def warmup_worker(quick: bool):
    try:
        with _warmup_lock:
            _warmup.update({"running":True,"progress":0,"stage":"Starting…","started_at":time.time(),"steps":[]})
        def step(p,label,fn=None):
            _set_stage(p,label)
            with _warmup_lock: _warmup["steps"].append({"pct":p,"label":label})
            if fn:
                try: fn()
                except Exception: pass

        def ping_server(): requests.get(f"{OLLAMA_URL}/", timeout=2)
        def probe_gen():   _ = ollama_generate("Return: PING")
        def probe_emb():   _ = embed(["ping"])
        def touch_db():
            c = db_connect()
            c.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
            c.close()

        step(12,"Checking Ollama…", ping_server)
        step(30,"Warming generation…", probe_gen)
        step(45,"Warming embeddings…", probe_emb)
        step(58,"Opening index…", touch_db)
        if not quick:
            step(76,"Priming vectors…", lambda: embed(["hello world"]))
            step(90,"Priming quill…",   lambda: ollama_generate("Say: ready."))

        step(100,"Ready.")
    finally:
        with _warmup_lock: _warmup["running"]=False
        c = load_json(CONFIG_PATH, {})
        c["last_warm_ts"] = time.time()
        save_json(CONFIG_PATH, c)

# -------- Schemas --------
class ScanRequest(BaseModel): dir: Optional[str] = None
class SearchRequest(BaseModel): query: str; top_k: Optional[int] = 5
class SummarizeRequest(BaseModel):
    path: Optional[str] = None
    max_words: Optional[int] = 350
    style: Optional[str] = "bullet"
    with_context: Optional[bool] = True
    query: Optional[str] = None
class SuggestRequest(BaseModel):
    mode: str  # "summary" | "library" | "upload"
    path: Optional[str] = None
    query: Optional[str] = None
    summary: Optional[str] = None
class FeedbackRequest(BaseModel):
    sid: str
    action: str
    thumbs: int  # +1 / -1
    meta: Optional[Dict[str, Any]] = None

def style_hint_key(s:str)->str:
    return {
        "bullet":"bullet points with clear indentation and short lines",
        "exam":"exam-focused bullets with must-know facts and pitfalls",
        "cheatsheet":"tight cheat-sheet bullets with formulas, defs, key steps"
    }.get((s or "bullet").lower(),"bullet points")

def walk_files(base:str):
    for root, dirs, files in os.walk(base):
        for n in files:
            low=n.lower()
            if low.endswith((".pdf",".docx",".csv",".png",".jpg",".jpeg",".bmp",".tif",".tiff")):
                yield os.path.join(root,n)

# -------- Plugins (minimal) --------
def load_plugins():
    tools=[]
    for fp in glob.glob(os.path.join(PLUGINS_DIR, "*_plugin.py")):
        try:
            spec = importlib.util.spec_from_file_location(os.path.basename(fp)[:-3], fp)
            mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(mod)  # type: ignore
            if hasattr(mod, "register"):
                obj = mod.register()
                if obj: tools.append(obj)
        except Exception:
            pass
    return tools

PLUGINS = load_plugins()

# -------- API --------
@app.get("/health")
def health():
    c = load_json(CONFIG_PATH, {"offline":True})
    warm_recent = (time.time() - float(c.get("last_warm_ts",0))) < float(c.get("warm_ttl_sec",7200))
    return {"ok": True, "ollama": OLLAMA_URL, "gen_model": get_gen_model(), "embed_model": get_embed_model(),
            "offline": c.get("offline",True), "internet_enabled": c.get("internet_enabled", False), "warm_recent": warm_recent}

@app.post("/warmup/start")
def warmup_start(body: Dict[str, Any] = None):
    now = time.time()
    c = load_json(CONFIG_PATH, {})
    ttl = float(c.get("warm_ttl_sec",7200))
    recent = (now - float(c.get("last_warm_ts",0))) < ttl
    quick_req = bool((body or {}).get("quick", False))
    quick = quick_req or recent
    with _warmup_lock: already = _warmup["running"]
    if not already:
        t = threading.Thread(target=warmup_worker, kwargs={"quick": quick}, daemon=True); t.start()
    return warmup_status()

@app.get("/warmup/status")
def warmup_status():
    with _warmup_lock: return dict(_warmup)

@app.get("/config")
def get_config(): return load_json(CONFIG_PATH, {"offline":True,"agent":{}})
@app.post("/config")
def set_config(body: Dict[str, Any]):
    c = load_json(CONFIG_PATH, {"offline":True,"agent":{}})
    for k,v in (body or {}).items(): c[k]=v
    save_json(CONFIG_PATH, c); return {"ok":True,"config":c}

@app.get("/permissions")
def get_permissions(): return load_json(PERMS_PATH, {"allowed_dirs": [], "suggested_dirs": [LIBRARY_DIR, DOWNLOADS_DIR]})
@app.post("/permissions/grant")
def grant_permission(body: Dict[str, Any]):
    dirp = os.path.abspath(body.get("dir",""))
    if not dirp: return {"ok":False,"error":"Missing dir"}
    p = load_json(PERMS_PATH, {"allowed_dirs": [], "suggested_dirs": []})
    if dirp not in p["allowed_dirs"]: p["allowed_dirs"].append(dirp)
    if dirp not in p.get("suggested_dirs", []): p.setdefault("suggested_dirs", []).append(dirp)
    save_json(PERMS_PATH, p); return {"ok":True,"permissions":p}

@app.post("/library/scan")
def library_scan(req: ScanRequest):
    target = os.path.abspath(req.dir or LIBRARY_DIR)
    p = load_json(PERMS_PATH, {"allowed_dirs": [], "suggested_dirs": []})
    if target not in p["allowed_dirs"]: return {"ok":False,"need_permission":True,"dir":target}
    conn=db_connect(); cur=conn.cursor(); added=0; updated=0
    for path in walk_files(target):
        try:
            st=os.stat(path); m=st.st_mtime; sha=sha256_file(path)
            cur.execute("SELECT id, mtime, sha256 FROM docs WHERE path=?",(path,)); row=cur.fetchone()
            if row:
                doc_id, old_m, old_sha = row
                if old_sha == sha: continue
                cur.execute("DELETE FROM chunks WHERE doc_id=?",(doc_id,))
                cur.execute("UPDATE docs SET mtime=?, sha256=? WHERE id=?",(m,sha,doc_id)); updated+=1
            else:
                cur.execute("INSERT INTO docs(path,mtime,sha256) VALUES(?,?,?)",(path,m,sha))
                doc_id=cur.lastrowid; added+=1
            text=extract_text(path); pieces=chunk_text(text); vecs=embed(pieces)
            cur.execute("SELECT id FROM docs WHERE path=?",(path,)); doc_id=cur.fetchone()[0]
            for i,(t,v) in enumerate(zip(pieces,vecs)):
                cur.execute("INSERT INTO chunks(doc_id,ord,text_enc,embedding_enc) VALUES(?,?,?,?)",
                    (doc_id,i,enc_b64(t),enc_b64(json.dumps(v))))
            conn.commit()
        except Exception:
            conn.rollback()
    conn.commit(); conn.close()
    return {"ok":True,"added":added,"updated":updated,"scanned_dir":target}

@app.get("/library/list")
def library_list():
    c=db_connect(); cur=c.cursor()
    cur.execute("SELECT id, path, mtime FROM docs ORDER BY mtime DESC LIMIT 2000")
    rows=cur.fetchall(); c.close()
    return {"ok":True,"docs":[{"id":r[0],"path":r[1],"mtime":r[2]} for r in rows]}

@app.post("/search")
def search(req: SearchRequest):
    q=req.query.strip()
    if not q: return {"ok":False,"error":"Empty query"}
    qv_list=embed([q]); qv=qv_list[0] if qv_list else []
    c=db_connect(); cur=c.cursor()
    cur.execute("SELECT chunks.id, docs.path, chunks.text_enc, chunks.embedding_enc FROM chunks JOIN docs ON docs.id=chunks.doc_id")
    hits=[]
    for cid, path, text_enc, emb_enc in cur.fetchall():
        try:
            v=json.loads(dec_b64(emb_enc) or "[]")
            score=cosine(qv,v)
        except Exception:
            score=0.0
        if score>0:
            excerpt=dec_b64(text_enc)[:600]
            hits.append((score,path,excerpt))
    hits.sort(key=lambda x:x[0], reverse=True)
    top=hits[:(req.top_k or 5)]; c.close()
    return {"ok":True,"results":[{"score":float(s),"path":p,"excerpt":t} for s,p,t in top]}

def _spell(label:str)->str:
    # Map step labels to spell names for UI animations
    label_low = label.lower()
    if "vector" in label_low or "embed" in label_low: return "Arcane Vector Spark"
    if "warm" in label_low or "quill" in label_low:  return "Quill Ignition"
    if "index" in label_low or "open" in label_low:  return "Index Scry"
    if "search" in label_low:                        return "Library Seek"
    if "summary" in label_low:                       return "Scroll Condense"
    return "Minor Cantrip"

@app.post("/summarize")
def summarize(req: SummarizeRequest):
    trace=[]
    def mark(step): trace.append({"label": step, "spell": _spell(step)})
    try:
        base_text=""
        if req.path:
            if not os.path.exists(req.path): return {"ok":False,"error":f"File not found: {req.path}"}
            mark("Extract content")
            base_text = extract_text(req.path)
        elif req.query:
            mark("Search Library")
            s = search(SearchRequest(query=req.query, top_k=5))
            ctx = "\n\n".join([f"[{i+1}] {r['path']}\n{r['excerpt']}" for i,r in enumerate(s.get('results',[]))])
            base_text = f"QUERY:\n{req.query}\n\nCONTEXT FROM LIBRARY:\n{ctx}"
        else:
            return {"ok":False,"error":"Provide 'path' or 'query'."}
        mark("Compose summary prompt")
        prompt=f"""You are Arcano, a meticulous study-note wizard.
Summarize the content into {style_hint_key(req.style)}. Limit to ~{req.max_words or 350} words.
Prioritize key terms, definitions, steps, and actionable takeaways.
Use clear headers and sub-bullets.

CONTENT START
{base_text[:20000]}
CONTENT END
"""
        mark("Generate summary")
        out=ollama_generate(prompt)
        mark("Done")
        return {"ok":True,"summary":out,"trace":trace}
    except Exception as e:
        return {"ok":False,"error":str(e),"trace":trace}

# -------- Agent Suggestions & Feedback --------
DEFAULT_SUGGESTIONS = [
    {"id":"summ_quiz","title":"Generate 5 quiz questions","desc":"Create quick questions to self-test."},
    {"id":"summ_flash","title":"Build flashcards","desc":"Front/back cards from key points."},
    {"id":"summ_outline","title":"Draft exam outline","desc":"One-page outline for quick review."},
    {"id":"summ_filehint","title":"File to Exam Prep","desc":"Suggest placing in Exam Prep bucket."}
]

def plugin_suggestions(context: Dict[str, Any]) -> List[Dict[str, Any]]:
    out=[]
    for tool in PLUGINS:
        try:
            if "suggest" in tool:
                s = tool["suggest"](context) or []
                out.extend(s)
        except Exception:
            pass
    return out

def suggestion_sig(s: Dict[str, Any], context: Dict[str, Any]) -> str:
    m = hashlib.sha256()
    base = json.dumps({"id":s.get("id"),"mode":context.get("mode"),"path":context.get("path"),"query":context.get("query")}, sort_keys=True)
    m.update(base.encode("utf-8"))
    return m.hexdigest()[:16]

@app.post("/agent/suggest")
def agent_suggest(req: SuggestRequest):
    # baseline + plugin suggestions, then rank with memory feedback
    ctx = {"mode": req.mode, "path": req.path, "query": req.query, "summary_len": len(req.summary or "")}
    sug = list(DEFAULT_SUGGESTIONS)
    sug.extend(plugin_suggestions(ctx))
    # rank by past feedback score
    conn=db_connect(); cur=conn.cursor()
    ranked=[]
    for s in sug:
        sid = suggestion_sig(s, ctx)
        cur.execute("SELECT SUM(thumbs) FROM feedback WHERE sid=?", (sid,))
        score = cur.fetchone()[0] or 0
        ranked.append((score, sid, s))
    ranked.sort(key=lambda x: x[0], reverse=True)
    out=[{"sid": sid, "title": s["title"], "desc": s.get("desc",""), "score": int(sc)} for sc, sid, s in ranked]
    conn.close()
    return {"ok":True,"suggestions": out[:6]}

@app.post("/agent/feedback")
def agent_feedback(req: FeedbackRequest):
    conn=db_connect(); cur=conn.cursor()
    cur.execute("INSERT INTO feedback(sid,action,thumbs,created,meta) VALUES(?,?,?,?,?)",
                (req.sid, req.action, int(req.thumbs), time.time(), json.dumps(req.meta or {})))
    conn.commit(); conn.close()
    return {"ok":True}

# -------- Security: kill-switch for internet --------
@app.get("/security/status")
def security_status():
    try:
        import win32crypt; dpapi=True
    except Exception:
        dpapi=False
    c = load_json(CONFIG_PATH, {})
    return {"ok":True,"encrypted":True,"dpapi":dpapi,"key_path":KEY_PATH,
            "internet_enabled": c.get("internet_enabled", False), "offline": c.get("offline", True)}

@app.post("/security/killswitch")
def security_kill(body: Dict[str, Any]):
    # body: {"internet_enabled": true/false}
    c = load_json(CONFIG_PATH, {})
    val = bool((body or {}).get("internet_enabled", False))
    c["internet_enabled"] = val
    c["offline"] = (not val)
    save_json(CONFIG_PATH, c)
    return {"ok":True, "internet_enabled": val, "offline": (not val)}
from fastapi import Body
import os, json, requests

def _ollama_chat(messages):
    url = os.environ.get("OLLAMA_URL","http://127.0.0.1:11434") + "/api/chat"
    model = os.environ.get("OLLAMA_MODEL","llama3.1")
    r = requests.post(url, json={"model": model, "messages": messages, "stream": False}, timeout=25)
    r.raise_for_status()
    return r.json()

@app.post("/style/suggest")
def suggest_style(payload: dict = Body(...)):
    # payload: { base:{name,tokens,knobs}, constraints:[], mood:str, tweak:{} }
    base = payload.get("base",{}) or {}
    constraints = payload.get("constraints",[]) or []
    mood = payload.get("mood","") or ""
    tweak = payload.get("tweak",{}) or {}

    sys = (
        "You are a UI theme assistant. "
        "Return ONLY compact JSON with keys: name, tokens, knobs. "
        "tokens may include bg, panel, text, accent, accentText, line, success, warn. "
        "Respect accessibility: ensure text contrasts bg and panel. "
        "Prefer subtle modern-retro fantasy palette. "
        "Never add unexpected keys."
    )
    user = {
        "base": base,
        "constraints": constraints,
        "mood": mood,
        "tweak": tweak
    }
    try:
        resp = _ollama_chat([
            {"role":"system","content": sys},
            {"role":"user","content": json.dumps(user)}
        ])
        # Some models nest content; try to parse JSON from message
        out_text = resp.get("message",{}).get("content","{}")
        # best-effort JSON extraction
        start = out_text.find("{")
        end = out_text.rfind("}")
        if start != -1 and end != -1 and end>start:
            out_text = out_text[start:end+1]
        data = json.loads(out_text)
        # sanitize allowlist
        name = data.get("name","AITheme")
        t = data.get("tokens") or {}
        allowed = { k:v for k,v in t.items() if k in ["bg","panel","text","accent","accentText","line","success","warn"] }
        knobs = data.get("knobs") or {}
        return {"ok": True, "name": name, "tokens": allowed, "knobs": knobs}
    except Exception as e:
        return {"ok": False, "error": str(e)}


@app.post("/warm")
def warm():
    # Put any lazy imports/model loads here. Keep it fast.
    return {"ok": True, "warmed": True}
