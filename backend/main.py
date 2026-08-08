import os
from dotenv import load_dotenv
load_dotenv()
from fastapi import FastAPI, File, UploadFile, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import agent

app = FastAPI(title="No-Look Note Taker API")

# Enable CORS for the Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TextRequest(BaseModel):
    text: str

class ChatRequest(BaseModel):
    query: str
    data: dict

class GraphRequest(BaseModel):
    data: dict

@app.post("/api/process/text")
async def process_text_endpoint(req: TextRequest, x_gemini_api_key: str = Header(default=None)):
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    try:
        results = agent.process_text(req.text, api_key=x_gemini_api_key)
        
        # Convert pydantic models in results to dicts before returning
        def to_dict(obj):
            if hasattr(obj, 'model_dump'):
                return obj.model_dump()
            elif hasattr(obj, 'dict'):
                return obj.dict()
            return obj
            
        serializable_results = {k: to_dict(v) if v is not None else None for k, v in results.items()}
        return {"status": "success", "data": serializable_results}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/process/audio")
async def process_audio_endpoint(file: UploadFile = File(...), x_gemini_api_key: str = Header(default=None)):
    try:
        audio_bytes = await file.read()
        mime_type = file.content_type
        
        results = agent.process_audio(audio_bytes, mime_type, api_key=x_gemini_api_key)
        
        def to_dict(obj):
            if hasattr(obj, 'model_dump'):
                return obj.model_dump()
            elif hasattr(obj, 'dict'):
                return obj.dict()
            return obj
            
        serializable_results = {k: to_dict(v) if v is not None else None for k, v in results.items()}
        return {"status": "success", "data": serializable_results}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest, x_gemini_api_key: str = Header(default=None)):
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    try:
        answer = agent.chat_with_brain(req.data, req.query, api_key=x_gemini_api_key)
        return {"status": "success", "answer": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/graph")
async def graph_endpoint(req: GraphRequest, x_gemini_api_key: str = Header(default=None)):
    try:
        graph = agent.generate_knowledge_graph(req.data, api_key=x_gemini_api_key)
        return {"status": "success", "data": graph}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
