import React, { useEffect, useMemo, useRef, useState } from "react";
import { useHealth } from "@hooks/useHealth";
import { useSummarize } from "@hooks/useSummarize";
import "./global.css";

declare global {
  interface Window {
    arcano?: {
      ping: () => Promise<any>;
      summarizePath: (path: string, opts?: any) => Promise<any>;
      chooseFiles?: () => Promise<{ok:boolean; paths:string[]}>;
      chooseFolder?: () => Promise<{ok:boolean; dir:string}>;
      importPaths?: (p:{paths:string[]; tags?:string[]})=>Promise<any>;
      importFolder?: (p:{dir:string; tags?:string[]})=>Promise<any>;
      listLibrary?: (p?:{limit?:number})=>Promise<{ok:boolean; items:any[]}>;
      finalizeSummary?: (p:{stored_path:string; summary:string; preset?:string})=>Promise<any>;
      attachDropTarget?: (selector:string)=>void;
    };
  }
}

type View = "loading" | "desk";
type Tab  = "library" | "summarize" | "upload";
type Preset = "short" | "medium" | "long";

export default function App(){
  const [view, setView] = useState<any>("desk");
  const [health, setHealth] = useState<any>(null);

  // Enter is manual; load to 100% then wait for click
  const [canEnter, setCanEnter] = useState(false);

  // Tabs
  const [tab, setTab] = useState<Tab>("upload");

  // Summarize defaults (Short by default)
  const [sumMode, setSumMode] = useState<"path"|"query">("path");
  const [sumInput, setSumInput] = useState("");
  const [summary, setSummary] = useState<string>("");
  const [preset, setPreset] = useState<Preset>("short");  // Short & Quick default
  const [maxWords, setMaxWords] = useState<number>(200);  // ~200 words

  // Progress modal for summarization
  const [busy, setBusy]   = useState(false);
  const [pcent, setPcent] = useState(0);
  const [stage, setStage] = useState("Preparing spellbook…");
  const [blastType, setBlastType] = useState<"fire"|"lightning">("fire");

  useEffect(()=>{
    // Randomize blast type (fire or lightning)
    setBlastType(Math.random() < 0.5 ? "fire" : "lightning");
  },[]);

  // Loading page sequencing (staged & then manual entry)
  useEffect(()=>{
    let live = true;
    const staged = async ()=>{
      const h = await window.arcano?.ping?.();
      if (!live) return;
      setHealth(h);
      // staged progress feel
      await sleep(400); if(!live) return;
      await sleep(500); if(!live) return;
      // Fully ready—let user enter manually
      setCanEnter(true);
    };
    staged();
    return ()=>{ live=false; };
  },[]);

  function sleep(ms:number){ return new Promise(r=>setTimeout(r,ms)); }

  const { summarize } = useSummarize();
const doSummarize = async () => {
  try {
    if (!sumInput) return;
    const args: any = sumMode === "path"
      ? { path: sumInput, max_words: maxWords }
      : { query: sumInput, max_words: maxWords };
    const res = await summarize(args);
    if (res?.ok && res?.summary) setSummary(res.summary);
    else setSummary(JSON.stringify(res, null, 2));
  } catch (e: any) {
    setSummary(String(e?.message || e));
  }
};

  return (
    <div style={{ padding: 24 }}>
      {view==="loading"
        ? <EpicLoading canEnter={canEnter} onEnter={()=>setView("desk")} />
        : <Desk
            health={health}
            tab={tab} setTab={setTab}
            sumMode={sumMode} setSumMode={setSumMode}
            sumInput={sumInput} setSumInput={setSumInput}
            summary={summary} setSummary={setSummary}
            preset={preset} setPreset={setPreset}
            maxWords={maxWords} setMaxWords={setMaxWords}
            doSummarize={doSummarize}
          />
      }

      {busy && <ProgressModal pcent={pcent} stage={stage} blast={blastType} />}
    </div>
  );
}

/* =================== Desk =================== */
function Desk(props:any){
  const { health, tab, setTab, sumMode, setSumMode, sumInput, setSumInput, summary, setSummary, preset, setPreset, maxWords, setMaxWords, doSummarize } = props;
  return (
    <div className="grid" style={{maxWidth: 1100, margin:"0 auto"}}>
      <header className="card">
        <h2 style={{marginTop:0}}>🧙 Arcano Desk</h2>
        <div className="small">{health?.ok ? "Models ready at the desk." : "Preparing scrolls…"}</div>
        <nav style={{display:"flex", gap:8, marginTop:12, flexWrap:"wrap"}}>
          <button className={`tab ${tab==="library"?"active":""}`} onClick={()=>setTab("library")}>Library</button>
          <button className={`tab ${tab==="summarize"?"active":""}`} onClick={()=>setTab("summarize")}>Summarize</button>
          <button className={`tab ${tab==="upload"?"active":""}`} onClick={()=>setTab("upload")}>Forefetting to Wizard</button>
        </nav>
      </header>

      {tab==="summarize" && <SummarizeSection
        sumMode={sumMode} setSumMode={setSumMode}
        sumInput={sumInput} setSumInput={setSumInput}
        summary={summary} setSummary={setSummary}
        preset={preset} setPreset={setPreset}
        maxWords={maxWords} setMaxWords={setMaxWords}
        doSummarize={props.doSummarize}
      />}

      {tab==="upload" && <UploadSection onSummarize={(p:string)=>{ setTab("summarize"); setSumMode("path"); setSumInput(p); }} />}

      {tab==="library" && <LibrarySection onSummarize={(p:string)=>{ setTab("summarize"); setSumMode("path"); setSumInput(p); }} />}
    </div>
  );
}

/* ================= Loading Scene ================= */
function EpicLoading(props:{canEnter:boolean; onEnter:()=>void}){
  const [hover, setHover] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("Warming the cosmos…");

  // lively sparkle & comets – progress staged while app preps
  useEffect(()=>{
    let pct = 0;
    const stages = [
      { upto: 30, text: "Summoning stars…" },
      { upto: 55, text: "Animating landscapes…" },
      { upto: 80, text: "Awakening guardians…" },
      { upto: 100, text: "Arming the wizard…" }
    ];
    let si = setInterval(()=>{
      pct = Math.min(100, pct + (pct<70 ? 2 + Math.random()*3 : 1 + Math.random()*2));
      const s = stages.find(x=> pct <= x.upto) || stages[stages.length-1];
      setStage(s.text);
      setProgress(pct);
    }, 140);
    return ()=> clearInterval(si);
  },[]);

  const fireworks = useMemo(()=> {
    // rare fireworks particles preset
    const arr = [];
    for (let i=0;i<12;i++){
      arr.push({ left: `${Math.random()*100}%`, top:`${Math.random()*50+10}%`, dx: `${(Math.random()*140-70)}px`, dy: `${(Math.random()*140-70)}px`, delay: `${Math.random()*6+5}s` });
    }
    return arr;
  },[]);

  return (
    <div className="loading-wrap">
      <h1 className="pixel-title">ARCANO DESK</h1>
      <div className="scene" onMouseLeave={()=>setHover(false)}>
        {/* Stars */}
        <div className="stars hidden">
          {Array.from({length: 120}).map((_,i)=>(
            <div key={i} className="star" style={{left:`${Math.random()*100}%`, top:`${Math.random()*100}%`, animationDelay:`${Math.random()*2}s`}}/>
          ))}
        </div>
        {/* Comets */}
        <div className="comets hidden">
          {Array.from({length: 6}).map((_,i)=>(
            <div key={i} className="comet" style={{ top:`${Math.random()*40+5}%`, left:`${Math.random()*50-10}%`, animationDelay:`${Math.random()*5}s` }}/>
          ))}
        </div>
        {/* Rare fireworks */}
        <div className="fireworks">
          {fireworks.map((f,i)=>(
            <div key={i} className="firework" style={{ left:f.left, top:f.top, animationDelay:f.delay, ['--dx' as any]:f.dx, ['--dy' as any]:f.dy }}/>
          ))}
        </div>

        {/* Parallax layers */}
        <div className="layer hills" style={{ transform:"translateY(60px)" }}/>
        <div className="layer trees" style={{ transform:"translateY(100px)" }}/>
        <div className="layer ground" style={{ transform:"translateY(160px)" }}/>

        {/* Castle (hover-to-enter prompt) */}
        <div className="castle"
          onMouseEnter={()=>setHover(true)}
          onMouseLeave={()=>setHover(false)}
        >
          <div className="tower t1"><div className="flag"/></div>
          <div className="tower t2"><div className="flag"/></div>
          <div className="keep">
            <div className="torch"><div className="flame"/></div>
          </div>
        </div>
        <div className={`enter-prompt ${hover?'hover':''}`}>
          {props.canEnter ? (
            <>
              <div>✨ Hover found the secret gate…</div>
              <button className="enter-btn" onClick={props.onEnter}>Enter the Castle</button>
            </>
          ) : (
            <div>Preparing the castle…</div>
          )}
        </div>

        {/* Progress (bottom overlay) */}
        <div style={{position:"absolute", left:16, right:16, bottom:12}}>
          <div className="pbar"><div className="pfill" style={{width:`${Math.min(progress, 99.5)}%`}}/></div>
          <div className="stage">{stage}</div>
          { !props.canEnter && <div className="small">You will be able to enter once preparation finishes. No auto-enter.</div> }
        </div>
      </div>
    </div>
  );
}

/* ============== Progress Modal (Summary) ============== */
function ProgressModal(p:{ pcent:number; stage:string; blast:"fire"|"lightning" }){
  return (
    <div className="progress-overlay">
      <div className="progress-card">
        <div className="duel">
          <div className="wizard"/>
          <div className={`blast ${p.blast==="lightning"?"lightning":""}`}/>
          <div className="dragon"/>
        </div>
        <div className="pbar"><div className="pfill" style={{width:`${Math.min(100, Math.round(p.pcent))}%`}}/></div>
        <div className="stage">{p.stage}</div>
      </div>
    </div>
  );
}

/* ============== Upload, Library, Summarize ============== */
function UploadSection(p:{ onSummarize:(path:string)=>void }){
  return (
    <section className="card">
      <h3 style={{marginTop:0}}>📜 Forefetting to Wizard (Import)</h3>
      <div className="card" style={{background:"#0f0b19", marginBottom:8}}>
        <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
          <button className="button" onClick={async ()=>{
            const r = await window.arcano?.chooseFiles?.(); if (r?.ok){
              const imp = await window.arcano?.importPaths?.({ paths:(r.paths||[]).slice(0,10), tags:[] });
              if (imp?.ok) window.dispatchEvent(new CustomEvent("arcano-imported"));
            }
          }}>Choose Files (up to 10)</button>
          <button className="button ghost" onClick={async ()=>{
            const r = await window.arcano?.chooseFolder?.(); if (r?.ok && r.dir){
              const imp = await window.arcano?.importFolder?.({ dir:r.dir, tags:[] });
              if (imp?.ok) window.dispatchEvent(new CustomEvent("arcano-imported"));
            }
          }}>Choose Folder</button>
        </div>
      </div>
      <DropImport />
      <LibraryList onSummarize={p.onSummarize} />
    </section>
  );
}

function DropImport(){
  useEffect(()=>{ window.arcano?.attachDropTarget?.("#dropzone"); },[]);
  return (
    <div id="dropzone" style={{
      border:"2px dashed #3b2b59", borderRadius:12, padding:24, textAlign:"center",
      background:"#0d0a17", color:"#e9e4ff", marginBottom:12
    }}>
      <div style={{fontWeight:800, marginBottom:6}}>Drag & drop files here</div>
      <div className="small">PDF, DOCX, CSV • up to 10 • Files will be moved into the Library</div>
    </div>
  );
}

function LibraryList(p:{ onSummarize:(path:string)=>void }){
  const [items, setItems] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const refresh = async ()=>{ setBusy(true); try{ const r = await window.arcano?.listLibrary?.({limit:100}); if(r?.ok) setItems(r.items||[]);} finally{ setBusy(false); } };
  useEffect(()=>{ refresh(); },[]);
  useEffect(()=>{ const onImp=()=>refresh(); window.addEventListener("arcano-imported", onImp); return()=>window.removeEventListener("arcano-imported", onImp); },[]);
  return (
    <div className="card" style={{marginTop:12}}>
      <h4 style={{marginTop:0}}>📚 Library</h4>
      {busy? <div className="small">Loading…</div> :
        items.length===0? <div className="small">No items in Library yet.</div> :
        <div className="grid" style={{gap:8}}>
          {items.map((it:any)=>(
            <div key={it.id} className="card" style={{background:"#0f0b19"}}>
              <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center"}}>
                <div style={{maxWidth:"75%"}}>
                  <div style={{fontWeight:800,color:"#efeaff"}}>{it.name}</div>
                  <div className="small" title={it.stored_path}>{it.stored_path}</div>
                  <div className="small">Status: {it.status}</div>
                </div>
                <button className="button" onClick={()=>p.onSummarize(it.stored_path)}>Summarize</button>
              </div>
            </div>
          ))}
        </div>
      }
    </div>
  );
}

function SummarizeSection(props:{
  sumMode:"path"|"query"; setSumMode:(v:"path"|"query")=>void;
  sumInput:string; setSumInput:(s:string)=>void;
  summary:string; setSummary:(s:string)=>void;
  preset: Preset; setPreset:(p:Preset)=>void;
  maxWords:number; setMaxWords:(n:number)=>void;
  doSummarize: ()=>Promise<void>;
}){
  const { sumMode, setSumMode, sumInput, setSumInput, summary, setSummary, preset, setPreset, maxWords, setMaxWords, doSummarize } = props;

  useEffect(()=>{
    // keep maxWords in sync with preset
    if (preset==="short" && maxWords!==200) setMaxWords(200);
    if (preset==="medium" && maxWords!==400) setMaxWords(400);
    if (preset==="long" && maxWords!==800) setMaxWords(800);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[preset]);

  return (
    <section className="card">
      <h3 style={{marginTop:0}}>✒️ Summarize</h3>
      <div style={{display:"flex",gap:8,marginBottom:8}}>
        <button className={`tab ${sumMode==="path"?"active":""}`} onClick={()=>setSumMode("path")}>By Path</button>
        <button className={`tab ${sumMode==="query"?"active":""}`} onClick={()=>setSumMode("query")}>By Query</button>
      </div>
      <input className="input" placeholder={sumMode==="path"?"e.g. C:\\Users\\desmo\\Downloads\\paper.pdf":"Search topic across Library"} value={sumInput} onChange={e=>setSumInput(e.target.value)} />

      <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap"}}>
        <button className={`tab ${preset==="short"?"active":""}`} onClick={()=>setPreset("short")}>Short & Quick</button>
        <button className={`tab ${preset==="medium"?"active":""}`} onClick={()=>setPreset("medium")}>Medium (~400)</button>
        <button className={`tab ${preset==="long"?"active":""}`} onClick={()=>setPreset("long")}>Long (~800)</button>

        <label className="badge">Max words:
          <input type="number" className="input" style={{width:100, marginLeft:8}}
            value={maxWords} onChange={e=>setMaxWords(parseInt(e.target.value||"200"))}/>
        </label>

        <button className="button" onClick={doSummarize}>⚡ Conjure Summary</button>
      </div>

      <div className="card" style={{marginTop:12}}>
        <h4 style={{marginTop:0}}>🧾 Summary</h4>
        <pre style={{whiteSpace:"pre-wrap"}}>{summary || "Your summary will appear here…"}</pre>
      </div>
    </section>
  );
}

function LibrarySection(p:{ onSummarize:(path:string)=>void }){
  return <LibraryList onSummarize={p.onSummarize} />;
}

function CastleLoading(props: { ready?: boolean; onEnter: ()=>void }) {
  const { ready=false, onEnter } = props;
  return (
    <div className="card" style={{ maxWidth: 880, margin: "60px auto", textAlign: "center" }}>
      <h1 style={{ marginTop: 0, letterSpacing: 1 }}>🔮 Arcano Desk</h1>

      {/* Scene container — your starfield/castle stays as-is; this wrapper just adds hover hint */}
      <div
        className="castle pixel"
        title={ready ? "The portcullis creaks open… Click ENTER to step inside." : "Preparing scrolls and awakening sprites…"}
        style={{ cursor: ready ? "pointer" : "default" }}
        onClick={()=> { if (ready) onEnter(); }}
      />

      {/* Status + gated Enter */}
      <div style={{ marginTop: 12, color: "#c6c1dd" }}>
        {ready ? "Models ready. The drawbridge lowers…" : "Conjuring components… sharpening quills… brewing tea…"}
      </div>

      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 16 }}>
        <button
          className="button"
          disabled={!ready}
          aria-disabled={!ready}
          onClick={onEnter}
          style={{ opacity: ready ? 1 : 0.5, transition: "opacity 200ms" }}
        >
          ✨ ENTER THE CASTLE
        </button>
        <span className="small" style={{ alignSelf: "center", color: "#9b93b8" }}>
          {ready ? "You may enter when ready." : "Please wait…"}
        </span>
      </div>
    </div>
  );
}



