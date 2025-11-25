# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LLM Council Local is a 3-stage deliberation system where multiple **local LLMs via Ollama** collaboratively answer user questions. Forked from the OpenRouter-based LLM Council to run entirely offline with no API costs.

## Prerequisites

**Ollama must be installed and running:**
```bash
# Install Ollama (macOS)
brew install ollama

# Start Ollama server
ollama serve

# Pull the models you want to use
ollama pull llama3.2
ollama pull mistral
ollama pull qwen2.5
```

## Development Commands

**Setup:**
```bash
uv sync                    # Install Python dependencies
cd frontend && npm install # Install frontend dependencies
```

**Running the app:**
```bash
./start.sh                 # Start both backend and frontend (recommended)

# Or manually:
uv run python -m backend.main  # Backend on port 8001
cd frontend && npm run dev     # Frontend on port 5173
```

**Configuration:**
- Edit `backend/config.py` to change which Ollama models are in the council
- No API keys needed - runs entirely locally

## Architecture

### Backend Structure (`backend/`)

**`config.py`**
- `COUNCIL_MODELS`: List of Ollama model names (must be pulled locally)
- `CHAIRMAN_MODEL`: Model that synthesizes the final answer
- `OLLAMA_API_URL`: Default `http://localhost:11434/api/chat`

**`ollama.py`**
- `query_model()`: Single async model query to Ollama
- `query_models_parallel()`: Parallel queries (Ollama queues these internally)
- `check_ollama_available()`: Verify Ollama is running
- `list_available_models()`: Get list of pulled models
- Longer default timeout (300s) for local inference

**`council.py`** - Core Logic
- `stage1_collect_responses()`: Queries to all council models
- `stage2_collect_rankings()`: Anonymized peer review with "Response A, B, C" labels
- `stage3_synthesize_final()`: Chairman synthesizes final answer
- `parse_ranking_from_text()`: Extracts "FINAL RANKING:" section

**`storage.py`**
- JSON-based conversation storage in `data/conversations/`

**`main.py`**
- FastAPI app on port 8001
- CORS enabled for localhost:5173 and localhost:3000

### Frontend Structure (`frontend/src/`)

Unchanged from original - React + Vite with tab-based UI for viewing each stage.

## Key Differences from OpenRouter Version

| Aspect | OpenRouter | Local (Ollama) |
|--------|------------|----------------|
| API | Cloud-based | `localhost:11434` |
| Auth | API key required | None |
| Cost | Per-token pricing | Free |
| Speed | Fast (cloud GPUs) | Depends on hardware |
| Models | GPT-5, Claude, etc. | Llama, Mistral, Qwen, etc. |
| Privacy | Data sent to cloud | Fully local |

## Performance Considerations

1. **Memory**: Running multiple models requires RAM. Ollama swaps models as needed.
2. **Inference time**: Local inference is slower than cloud APIs. Expect 30-60s per stage.
3. **Model quality**: 7B-13B local models won't match GPT-5/Claude quality.
4. **Sequential queries**: Ollama runs one model at a time, so queries are sequential.

## Common Issues

1. **"Cannot connect to Ollama"**: Run `ollama serve` in a separate terminal
2. **Model not found**: Run `ollama pull <model-name>` first
3. **Slow responses**: Normal for local inference. Consider smaller models.
4. **Out of memory**: Use fewer/smaller models

## Data Flow

```
User Query
    ↓
Stage 1: Sequential Ollama queries → [individual responses]
    ↓
Stage 2: Anonymize → Sequential ranking queries → [evaluations]
    ↓
Stage 3: Chairman synthesis
    ↓
Frontend: Display with tabs
```
