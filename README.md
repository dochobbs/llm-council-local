# LLM Council Local

![llmcouncil](header.jpg)

A fork of [LLM Council](https://github.com/karpathy/llm-council) that runs entirely locally using **Ollama**. No API keys, no costs, full privacy.

Instead of asking a question to a single LLM, you can group multiple local models into your "LLM Council". This web app sends your query to multiple local LLMs, has them review and rank each other's work anonymously, and then a Chairman LLM produces the final synthesized response.

## How It Works

1. **Stage 1: First opinions**. The user query is given to all LLMs individually, and the responses are collected. The individual responses are shown in a "tab view", so that the user can inspect them all one by one.
2. **Stage 2: Review**. Each individual LLM is given the responses of the other LLMs. Under the hood, the LLM identities are anonymized so that the LLM can't play favorites when judging their outputs. The LLM is asked to rank them in accuracy and insight.
3. **Stage 3: Final response**. The designated Chairman of the LLM Council takes all of the model's responses and compiles them into a single final answer that is presented to the user.

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

### 2. Configure Models (Optional)

Edit `backend/config.py` to customize the council:

```python
COUNCIL_MODELS = [
    "llama3.2",
    "mistral",
    "qwen2.5",
]

CHAIRMAN_MODEL = "llama3.2"
```

Use any models you have pulled with `ollama pull`.

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

## Performance Notes

- **Speed**: Local inference is slower than cloud APIs. Expect 30-60 seconds per stage depending on your hardware and model size.
- **Memory**: Ollama swaps models in and out of memory as needed. More RAM = faster model switching.
- **Quality**: 7B-13B parameter local models won't match GPT-4/Claude quality, but they're free and private.

## Tech Stack

- **Backend:** FastAPI (Python 3.10+), async httpx, Ollama API
- **Frontend:** React + Vite, react-markdown for rendering
- **Storage:** JSON files in `data/conversations/`
- **Package Management:** uv for Python, npm for JavaScript

## Credits

Forked from [Andrej Karpathy's LLM Council](https://github.com/karpathy/llm-council), modified to use local Ollama models instead of OpenRouter.
