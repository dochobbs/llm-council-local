"""FastAPI backend for LLM Council."""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Any
import uuid
import json
import asyncio

from . import storage
from .council import run_full_council, generate_conversation_title, stage1_collect_responses, stage1_stream_responses, stage2_collect_rankings, stage3_synthesize_final, calculate_aggregate_rankings
from .ollama import check_ollama_available, list_available_models
from . import config

app = FastAPI(title="LLM Council Local API")

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CreateConversationRequest(BaseModel):
    """Request to create a new conversation."""
    pass


class SendMessageRequest(BaseModel):
    """Request to send a message in a conversation."""
    content: str


class UpdateConfigRequest(BaseModel):
    """Request to update model configuration."""
    council_models: List[str]
    chairman_model: str


class ConversationMetadata(BaseModel):
    """Conversation metadata for list view."""
    id: str
    created_at: str
    title: str
    message_count: int


class Conversation(BaseModel):
    """Full conversation with all messages."""
    id: str
    created_at: str
    title: str
    messages: List[Dict[str, Any]]


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "ok", "service": "LLM Council Local API"}


@app.get("/api/health")
async def health_check():
    """
    Comprehensive health check including Ollama status and model availability.
    """
    ollama_available = await check_ollama_available()
    available_models = await list_available_models() if ollama_available else []

    # Check which configured models are available
    council_status = []
    for model in config.COUNCIL_MODELS:
        # Check if model (or model without tag) is in available models
        is_available = any(
            model == avail or model.split(':')[0] == avail.split(':')[0]
            for avail in available_models
        )
        council_status.append({
            "model": model,
            "available": is_available
        })

    # Check chairman model
    chairman_available = any(
        config.CHAIRMAN_MODEL == avail or config.CHAIRMAN_MODEL.split(':')[0] == avail.split(':')[0]
        for avail in available_models
    )

    all_models_ready = all(m["available"] for m in council_status) and chairman_available

    return {
        "ollama_available": ollama_available,
        "available_models": available_models,
        "council_models": council_status,
        "chairman_model": {
            "model": config.CHAIRMAN_MODEL,
            "available": chairman_available
        },
        "ready": ollama_available and all_models_ready
    }


@app.get("/api/config")
async def get_config():
    """Get current model configuration."""
    available_models = await list_available_models()
    return {
        "council_models": config.COUNCIL_MODELS,
        "chairman_model": config.CHAIRMAN_MODEL,
        "available_models": available_models
    }


@app.post("/api/config")
async def update_config(request: UpdateConfigRequest):
    """Update model configuration (in memory only - resets on restart)."""
    config.COUNCIL_MODELS = request.council_models
    config.CHAIRMAN_MODEL = request.chairman_model
    return {
        "council_models": config.COUNCIL_MODELS,
        "chairman_model": config.CHAIRMAN_MODEL
    }


@app.get("/api/conversations", response_model=List[ConversationMetadata])
async def list_conversations():
    """List all conversations (metadata only)."""
    return storage.list_conversations()


@app.post("/api/conversations", response_model=Conversation)
async def create_conversation(request: CreateConversationRequest):
    """Create a new conversation."""
    conversation_id = str(uuid.uuid4())
    conversation = storage.create_conversation(conversation_id)
    return conversation


@app.get("/api/conversations/{conversation_id}", response_model=Conversation)
async def get_conversation(conversation_id: str):
    """Get a specific conversation with all its messages."""
    conversation = storage.get_conversation(conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


@app.post("/api/conversations/{conversation_id}/message")
async def send_message(conversation_id: str, request: SendMessageRequest):
    """
    Send a message and run the 3-stage council process.
    Returns the complete response with all stages.
    """
    # Check if conversation exists
    conversation = storage.get_conversation(conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Check if this is the first message
    is_first_message = len(conversation["messages"]) == 0

    # Add user message
    storage.add_user_message(conversation_id, request.content)

    # If this is the first message, generate a title
    if is_first_message:
        title = await generate_conversation_title(request.content)
        storage.update_conversation_title(conversation_id, title)

    # Run the 3-stage council process
    stage1_results, stage2_results, stage3_result, metadata = await run_full_council(
        request.content
    )

    # Add assistant message with all stages
    storage.add_assistant_message(
        conversation_id,
        stage1_results,
        stage2_results,
        stage3_result
    )

    # Return the complete response with metadata
    return {
        "stage1": stage1_results,
        "stage2": stage2_results,
        "stage3": stage3_result,
        "metadata": metadata
    }


@app.post("/api/conversations/{conversation_id}/message/stream")
async def send_message_stream(conversation_id: str, request: SendMessageRequest):
    """
    Send a message and stream the 3-stage council process.
    Returns Server-Sent Events as each stage completes.
    """
    # Check if conversation exists
    conversation = storage.get_conversation(conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Check if this is the first message
    is_first_message = len(conversation["messages"]) == 0

    async def event_generator():
        try:
            # Add user message
            storage.add_user_message(conversation_id, request.content)

            # Start title generation in parallel (don't await yet)
            title_task = None
            if is_first_message:
                title_task = asyncio.create_task(generate_conversation_title(request.content))

            # Stage 1: Stream individual model responses
            yield f"data: {json.dumps({'type': 'stage1_start'})}\n\n"
            stage1_results = []
            async for result in stage1_stream_responses(request.content):
                stage1_results.append(result)
                yield f"data: {json.dumps({'type': 'stage1_model_complete', 'data': result})}\n\n"
            yield f"data: {json.dumps({'type': 'stage1_complete', 'data': stage1_results})}\n\n"

            # Stage 2: Collect rankings
            yield f"data: {json.dumps({'type': 'stage2_start'})}\n\n"
            stage2_results, label_to_model = await stage2_collect_rankings(request.content, stage1_results)
            aggregate_rankings = calculate_aggregate_rankings(stage2_results, label_to_model)
            yield f"data: {json.dumps({'type': 'stage2_complete', 'data': stage2_results, 'metadata': {'label_to_model': label_to_model, 'aggregate_rankings': aggregate_rankings}})}\n\n"

            # Stage 3: Synthesize final answer
            yield f"data: {json.dumps({'type': 'stage3_start'})}\n\n"
            stage3_result = await stage3_synthesize_final(request.content, stage1_results, stage2_results)
            yield f"data: {json.dumps({'type': 'stage3_complete', 'data': stage3_result})}\n\n"

            # Wait for title generation if it was started
            if title_task:
                title = await title_task
                storage.update_conversation_title(conversation_id, title)
                yield f"data: {json.dumps({'type': 'title_complete', 'data': {'title': title}})}\n\n"

            # Save complete assistant message
            storage.add_assistant_message(
                conversation_id,
                stage1_results,
                stage2_results,
                stage3_result
            )

            # Send completion event
            yield f"data: {json.dumps({'type': 'complete'})}\n\n"

        except Exception as e:
            # Send error event
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
