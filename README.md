# Arcano Desk (Layer 1)

Electron + React/TypeScript UI with a Python FastAPI microservice that calls a local Ollama model.

## Dev Run
1) Open PowerShell
2) `cd "C:\Users\desmo\OneDrive\AI Programs\ArcanoDesk"`
3) `npm run dev`

The UI shows a "Wizard Castle" loading view, then the Desk. Enter a file path (.pdf, .docx, .csv) to summarize.

## Requirements
- Node.js + npm
- Python 3.x
- Ollama running locally (default http://127.0.0.1:11434) with model `llama3.1` (adjust in `scripts/Start-PythonService.ps1` if needed)

## Structure
- `app/electron`: Electron main + preload
- `app/renderer`: React/TS (Vite)
- `python`: FastAPI service (PDF/DOCX/CSV -> summary via Ollama)
- `scripts`: helpers

Layer 2 will add: file watchers, “Library / Summarize / Forefetting to Wizard” flows, UI theming hooks, robust error UX, and packaging.
