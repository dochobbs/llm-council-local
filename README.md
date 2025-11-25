# LLM Council Local

![llmcouncil](header.jpg)

A fork of [LLM Council](https://github.com/karpathy/llm-council) that runs entirely locally using **Ollama**. No API keys, no costs, full privacy.

Instead of asking a question to a single LLM, you can group multiple local models into your "LLM Council". This web app sends your query to multiple local LLMs, has them review and rank each other's work anonymously, and then a Chairman LLM produces the final synthesized response.

## Features

- **Fully Local**: Runs entirely on your machine using Ollama - no data leaves your computer
- **Progressive Streaming**: See model responses as they complete, not all at once
- **Dark Mode**: Toggle between light and dark themes
- **Configurable Models**: Change council members and chairman via Settings UI or config file
- **Health Monitoring**: Startup checks warn you if Ollama or models are unavailable
- **Timing Display**: See how long each stage takes after completion
- **Conversation History**: Automatically saves and loads past conversations

## How It Works

1. **Stage 1: First opinions**. The user query is given to all LLMs individually. Responses stream in progressively as each model completes - you can read the first response while others are still generating.
2. **Stage 2: Review**. Each individual LLM evaluates the responses of the other LLMs. Identities are anonymized (Response A, B, C) so models can't play favorites.
3. **Stage 3: Final response**. The designated Chairman synthesizes all responses and rankings into a single final answer.

## Prerequisites

You need [Ollama](https://ollama.ai/) installed and running:

```bash
# Install Ollama (macOS)
brew install ollama

# Start Ollama server (keep this running)
ollama serve

# Pull the models you want to use
ollama pull llama3.2
ollama pull mistral
ollama pull qwen2.5
```

## Setup

### 1. Install Dependencies

The project uses [uv](https://docs.astral.sh/uv/) for Python and npm for JavaScript.

**Backend:**
```bash
uv sync
```

**Frontend:**
```bash
cd frontend
npm install
cd ..
```

### 2. Configure Models

You can configure models two ways:

**Option A: Via Settings UI** (changes reset on restart)
- Click the ⚙️ Settings button in the sidebar
- Select council members from your available Ollama models
- Choose a chairman model

**Option B: Edit config file** (permanent)

Edit `backend/config.py`:

```python
COUNCIL_MODELS = [
    "llama3.2",
    "mistral",
    "qwen2.5",
]

CHAIRMAN_MODEL = "llama3.2"
```

## Running the Application

**Option 1: Use the start script**
```bash
./start.sh
```

**Option 2: Run manually**

Terminal 1 (Backend):
```bash
uv run python -m backend.main
```

Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```

Then open http://localhost:5173 in your browser.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Check Ollama status and model availability |
| `/api/config` | GET | Get current model configuration |
| `/api/config` | POST | Update council/chairman models (runtime only) |
| `/api/conversations` | GET | List all conversations |
| `/api/conversations` | POST | Create a new conversation |
| `/api/conversations/{id}` | GET | Get conversation details |
| `/api/conversations/{id}/message/stream` | POST | Send message with SSE streaming |

## Performance Notes

- **Speed**: Local inference is slower than cloud APIs. Expect 30-60 seconds per stage depending on your hardware and model size. The progressive streaming helps - you can start reading the first response while others generate.
- **Memory**: Ollama swaps models in and out of memory as needed. More RAM = faster model switching.
- **Quality**: 7B-13B parameter local models won't match GPT-4/Claude quality, but they're free and private.
- **Timing**: Each stage shows elapsed time after completion so you can gauge what's normal for your setup.

## Tech Stack

- **Backend:** FastAPI (Python 3.10+), async httpx, Ollama API
- **Frontend:** React + Vite, react-markdown for rendering
- **Storage:** JSON files in `data/conversations/`
- **Package Management:** uv for Python, npm for JavaScript

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Cannot connect to Ollama" | Run `ollama serve` in a separate terminal |
| Model not found | Run `ollama pull <model-name>` first |
| Slow responses | Normal for local inference - try smaller models |
| Health check shows models unavailable | Verify model names match what's in `ollama list` |

## Credits

Forked from [Andrej Karpathy's LLM Council](https://github.com/karpathy/llm-council), modified to use local Ollama models instead of OpenRouter.
