const { app, BrowserWindow, shell, net, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const fse = require("fs-extra");

const isDev = !!process.env.VITE_DEV_SERVER_URL;
const DEV_URL = process.env.VITE_DEV_SERVER_URL || "http://localhost:5173";
const STARTUP_TRIES = 15;
const STARTUP_DELAY_MS = 1000;

const ROOT = path.resolve(__dirname, "..", "..");
const LIB  = path.join(ROOT, "library");
const INBOX = path.join(LIB, "inbox");
const PROCESSED = path.join(LIB, "processed");
const SUMMARIES = path.join(LIB, "summaries");
const TRASH = path.join(LIB, "trash");
const INDEX = path.join(LIB, "index.json");

app.setAppLogsPath();
process.env.ELECTRON_ENABLE_LOGGING = "1";

function log(...args){ console.log("[ELN]", ...args); }

// ===== Utilities =====
function readIndex(){
  try {
    if (!fs.existsSync(INDEX)) return {};
    const raw = fs.readFileSync(INDEX, "utf8") || "{}";
    return JSON.parse(raw);
  } catch(e){
    log("index read error", e);
    return {};
  }
}
function writeIndex(obj){
  fs.writeFileSync(INDEX, JSON.stringify(obj, null, 2), "utf8");
}
function newId(){ return (Date.now().toString(36) + Math.random().toString(36).slice(2,8)).toUpperCase(); }
function sanitizeName(name){
  // ASCII-safe: replace anything not alnum, dot, dash, underscore, or space
  return String(name).replace(/[^A-Za-z0-9.\-_\s]/g, "_").slice(0,255);
}
function isAllowed(p){
  const ext = p.toLowerCase().split(".").pop();
  return ["pdf","docx","csv"].includes(ext);
}
async function safeMove(src, dst){
  await fse.ensureDir(path.dirname(dst));
  try {
    await fse.move(src, dst, { overwrite: false });
  } catch(e){
    await fse.copy(src, dst, { overwrite: false });
    await fse.remove(src);
  }
}
function monthFolder(){
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  return path.join(INBOX, `${y}-${m}`);
}
async function importPaths(paths, tags){
  const idx = readIndex();
  const created = [];
  const limit = Math.min(paths.length, 10);
  for (let i=0;i<limit;i++){
    const src = paths[i];
    if (!isAllowed(src)) continue;
    if (!fs.existsSync(src)) continue;
    const base = sanitizeName(path.basename(src));
    const targetDir = monthFolder();
    await fse.ensureDir(targetDir);
    let dst = path.join(targetDir, base);
    let cnt=1;
    const parsed = path.parse(base);
    while (fs.existsSync(dst)){
      dst = path.join(targetDir, `${parsed.name} (${cnt++})${parsed.ext}`);
    }
    await safeMove(src, dst);
    const id = newId();
    idx[id] = {
      id,
      name: path.basename(dst),
      stored_path: dst,
      original_path: src,
      ext: (parsed.ext||"").replace(".","").toLowerCase(),
      imported_at: new Date().toISOString(),
      tags: Array.isArray(tags)? tags.slice(0,10) : [],
      status: "inbox",
      summary_path: ""
    };
    created.push(idx[id]);
  }
  writeIndex(idx);
  return created;
}
function collectFolderFiles(rootDir){
  const out = [];
  const EXCLUDES = new Set(["node_modules",".git",".venv","__pycache__","build","dist","AppData"]);
  function walk(dir){
    const ents = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of ents){
      if (EXCLUDES.has(e.name)) continue;
      const p = path.join(dir, e.name);
      try {
        if (e.isDirectory()){ walk(p); }
        else { if (isAllowed(p)) out.push(p); }
      } catch(_e){}
    }
  }
  walk(rootDir);
  return out;
}
async function finalizeSummary(storedPath, summary, preset){
  const idx = readIndex();
  const entry = Object.values(idx).find(v => v.stored_path === storedPath);
  if (!entry) return { ok: false, error: "Entry not found" };
  const stem = path.parse(entry.name).name;
  const suff = preset ? `__${preset}` : "";
  const sumFile = path.join(SUMMARIES, sanitizeName(`${stem}${suff}.md`));
  await fse.ensureDir(path.dirname(sumFile));
  fs.writeFileSync(sumFile, summary || "", "utf8");
  const procFile = path.join(PROCESSED, entry.name);
  if (!fs.existsSync(procFile)){
    await safeMove(entry.stored_path, procFile);
  }
  entry.status = "processed";
  entry.summary_path = sumFile;
  writeIndex(idx);
  return { ok: true, summary_path: sumFile, processed_path: procFile };
}

// ===== Dev server wait =====
async function waitForVite(url, tries=STARTUP_TRIES){
  return new Promise((resolve,reject)=>{
    let left = tries;
    const tick = ()=>{
      const req = net.request(url);
      req.on("response", res=>{
        if(res.statusCode===200){ resolve(true); }
        else { left--; left>0 ? setTimeout(tick, STARTUP_DELAY_MS) : reject(new Error("Dev server not 200")); }
      });
      req.on("error", _=>{
        left--; left>0 ? setTimeout(tick, STARTUP_DELAY_MS) : reject(new Error("Dev server not reachable"));
      });
      req.end();
    };
    tick();
  });
}

// ===== Window =====
async function createWindow(){
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    backgroundColor: "#0e0b12",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.webContents.on("render-process-gone", (e, details)=> log("Renderer crashed:", details));
  win.webContents.on("unresponsive", ()=> log("Renderer unresponsive"));
  win.once("ready-to-show", ()=>win.show());

  if (isDev) {
    try {
      await waitForVite(DEV_URL);
      await win.loadURL(DEV_URL);
      log("Loaded DEV URL", DEV_URL);
    } catch (e) {
      log("Failed to connect to Vite:", e.message);
      const html = `<html><body style="background:#0e0b12;color:#eee;font-family:ui-monospace;padding:24px">
        <h2>Arcano Desk — Dev server not ready</h2>
        <p>Tried ${STARTUP_TRIES} times. Is Vite running on ${DEV_URL}?</p>
        <pre>${String(e)}</pre></body></html>`;
      win.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));
    }
  } else {
    await win.loadFile(path.join(__dirname, "..", "renderer", "dist", "index.html"));
  }

  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: "deny" }; });
}

// ===== IPC =====
ipcMain.handle("arcano:chooseFiles", async ()=>{
  const res = await dialog.showOpenDialog({ properties: ["openFile","multiSelections"], filters: [{ name: "Docs", extensions: ["pdf","docx","csv"] }] });
  if (res.canceled) return { ok: true, paths: [] };
  return { ok: true, paths: (res.filePaths || []).slice(0,10) };
});
ipcMain.handle("arcano:chooseFolder", async ()=>{
  const res = await dialog.showOpenDialog({ properties: ["openDirectory"] });
  if (res.canceled) return { ok: true, dir: "" };
  return { ok: true, dir: res.filePaths[0] || "" };
});
ipcMain.handle("arcano:importPaths", async (_e, payload)=>{
  try {
    const paths = Array.isArray(payload?.paths) ? payload.paths : [];
    const tags = Array.isArray(payload?.tags) ? payload.tags : [];
    const recs = await importPaths(paths.slice(0,10), tags);
    return { ok: true, imported: recs };
  } catch(e){
    return { ok: false, error: String(e) };
  }
});
ipcMain.handle("arcano:importFolder", async (_e, payload)=>{
  try {
    const dir = String(payload?.dir||"");
    if (!dir) return { ok: false, error: "No dir" };
    const found = collectFolderFiles(dir);
    const recs = await importPaths(found.slice(0,10), payload?.tags||[]);
    return { ok: true, imported: recs, found: found.length };
  } catch(e){
    return { ok: false, error: String(e) };
  }
});
ipcMain.handle("arcano:listLibrary", async (_e, payload)=>{
  const idx = readIndex();
  const arr = Object.values(idx).sort((a,b)=> String(b.imported_at).localeCompare(String(a.imported_at)));
  const limit = Math.min(arr.length, payload?.limit||100);
  return { ok: true, items: arr.slice(0,limit) };
});
ipcMain.handle("arcano:finalizeSummary", async (_e, payload)=>{
  try {
    const stored = String(payload?.stored_path||"");
    const summary = String(payload?.summary||"");
    const preset = String(payload?.preset||"");
    if (!stored) return { ok: false, error: "Missing stored_path" };
    return await finalizeSummary(stored, summary, preset);
  } catch(e){
    return { ok: false, error: String(e) };
  }
});
ipcMain.handle("arcano:importPathsFromData", async (_e, payload)=>{
  try{
    const files = Array.isArray(payload?.files)? payload.files : [];
    const tags = Array.isArray(payload?.tags)? payload.tags : [];
    const idx = readIndex();
    const created = [];
    const limit = Math.min(files.length, 10);
    const targetDir = monthFolder();
    await fse.ensureDir(targetDir);
    for (let i=0;i<limit;i++){
      const it = files[i];
      const base = sanitizeName(it?.name||("file_"+i));
      const ext = base.toLowerCase().split(".").pop();
      if (!["pdf","docx","csv"].includes(ext)) continue;
      let dst = path.join(targetDir, base);
      let cnt=1;
      const parsed = path.parse(base);
      while (fs.existsSync(dst)){ dst = path.join(targetDir, `${parsed.name} (${cnt++})${parsed.ext}`); }
      const buf = Buffer.from(String(it?.data||""), "base64");
      fs.writeFileSync(dst, buf);
      const id = newId();
      idx[id] = {
        id, name: path.basename(dst), stored_path: dst, original_path: "",
        ext: (parsed.ext||"").replace(".","").toLowerCase(),
        imported_at: new Date().toISOString(),
        tags: Array.isArray(tags)? tags.slice(0,10) : [],
        status: "inbox", summary_path: ""
      };
      created.push(idx[id]);
    }
    writeIndex(idx);
    return { ok:true, imported: created };
  }catch(e){ return { ok:false, error:String(e) } }
});

// ===== App lifecycle =====
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", ()=>{});
  app.whenReady().then(createWindow);
  app.on("window-all-closed", ()=>{ if (process.platform !== "darwin") app.quit(); });
  app.on("activate", ()=>{ if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
}
