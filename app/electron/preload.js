const { contextBridge, ipcRenderer } = require("electron");

const PY_PORT = process.env.ARCANO_PY_PORT || 5112;
const BASE = `http://127.0.0.1:${PY_PORT}`;

async function ping() {
  try {
    const r = await fetch(`${BASE}/health`);
    return await r.json();
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

async function summarizePath(path, opts = {}) {
  const payload = Object.assign({ path }, opts);
  const r = await fetch(`${BASE}/summarize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return await r.json();
}

contextBridge.exposeInMainWorld("arcano", {
  ping,
  summarizePath,
  // File pickers + library
  chooseFiles(){ return ipcRenderer.invoke("arcano:chooseFiles"); },
  chooseFolder(){ return ipcRenderer.invoke("arcano:chooseFolder"); },
  importPaths(payload){ return ipcRenderer.invoke("arcano:importPaths", payload); },
  importFolder(payload){ return ipcRenderer.invoke("arcano:importFolder", payload); },
  listLibrary(payload){ return ipcRenderer.invoke("arcano:listLibrary", payload||{}); },
  finalizeSummary(payload){ return ipcRenderer.invoke("arcano:finalizeSummary", payload); },

  // Attach basic drag&drop handler – Electron provides real file paths on drop
  attachDropTarget(selector){
    const el = document.querySelector(selector);
    if (!el) return;
    const onOver = (e)=>{ e.preventDefault(); e.dataTransfer.dropEffect = "copy"; };
    const onDrop = async (e)=>{
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files||[]);
      if (!files.length) return;
      const paths = files.map(f => f.path).filter(Boolean).slice(0,10);
      if (paths.length){
        await window.arcano.importPaths({ paths, tags: [] });
      }
      window.dispatchEvent(new CustomEvent("arcano-imported"));
    };
    el.addEventListener("dragover", onOver);
    el.addEventListener("drop", onDrop);
  }
});
