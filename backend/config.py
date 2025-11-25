"""Configuration for the Local LLM Council (Ollama)."""

# Council members - list of Ollama model names
# These should be models you have pulled with `ollama pull <model>`
COUNCIL_MODELS = [
    "gemma3:27b",
    "gpt-oss:20b",
    "medgemma:27b",
]

# Chairman model - synthesizes final response
CHAIRMAN_MODEL = "gemma3:27b"

# Ollama API endpoint (default local installation)
OLLAMA_API_URL = "http://localhost:11434/api/chat"

# Data directory for conversation storage
DATA_DIR = "data/conversations"
