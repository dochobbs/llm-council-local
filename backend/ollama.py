"""Ollama API client for making local LLM requests."""

import httpx
from typing import List, Dict, Any, Optional
from .config import OLLAMA_API_URL


async def query_model(
    model: str,
    messages: List[Dict[str, str]],
    timeout: float = 300.0  # Longer timeout for local models
) -> Optional[Dict[str, Any]]:
    """
    Query a single model via Ollama API.

    Args:
        model: Ollama model name (e.g., "llama3.2", "mistral")
        messages: List of message dicts with 'role' and 'content'
        timeout: Request timeout in seconds (longer for local inference)

    Returns:
        Response dict with 'content', or None if failed
    """
    payload = {
        "model": model,
        "messages": messages,
        "stream": False,  # Get complete response at once
    }

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                OLLAMA_API_URL,
                json=payload
            )
            response.raise_for_status()

            data = response.json()
            message = data.get('message', {})

            return {
                'content': message.get('content', '')
            }

    except httpx.ConnectError:
        print(f"Error: Cannot connect to Ollama at {OLLAMA_API_URL}")
        print("Make sure Ollama is running: ollama serve")
        return None
    except Exception as e:
        print(f"Error querying model {model}: {e}")
        return None


async def query_models_parallel(
    models: List[str],
    messages: List[Dict[str, str]]
) -> Dict[str, Optional[Dict[str, Any]]]:
    """
    Query multiple models in parallel.

    Note: Ollama typically runs one model at a time, so "parallel" requests
    will be queued. However, using asyncio.gather still allows the code to
    proceed efficiently.

    Args:
        models: List of Ollama model names
        messages: List of message dicts to send to each model

    Returns:
        Dict mapping model name to response dict (or None if failed)
    """
    import asyncio

    # Create tasks for all models
    tasks = [query_model(model, messages) for model in models]

    # Wait for all to complete
    responses = await asyncio.gather(*tasks)

    # Map models to their responses
    return {model: response for model, response in zip(models, responses)}


async def check_ollama_available() -> bool:
    """Check if Ollama is running and accessible."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get("http://localhost:11434/api/tags")
            return response.status_code == 200
    except:
        return False


async def list_available_models() -> List[str]:
    """List models available in Ollama."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get("http://localhost:11434/api/tags")
            if response.status_code == 200:
                data = response.json()
                return [model['name'] for model in data.get('models', [])]
    except:
        pass
    return []
