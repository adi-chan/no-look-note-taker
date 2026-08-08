import os
from dotenv import load_dotenv
load_dotenv()
import warnings
from typing import TypedDict, Optional
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import StateGraph, START, END
from datetime import datetime

warnings.filterwarnings("ignore", message=".*MALFORMED_RESPONSE is not a valid FinishReason.*")
warnings.filterwarnings("ignore", message=".*HumanMessage with empty content was removed.*")

from prompts import (
    ClassificationResult,
    StudyNotes,
    TaskList,
    CalendarEventList,
    CLASSIFIER_SYSTEM_PROMPT,
    STUDY_SYSTEM_PROMPT,
    TASK_SYSTEM_PROMPT,
    CALENDAR_SYSTEM_PROMPT,
    CHAT_SYSTEM_PROMPT,
    GRAPH_SYSTEM_PROMPT,
    KnowledgeGraph
)

# --- State Definition ---
class AgentState(TypedDict):
    raw_input: str
    classification: Optional[ClassificationResult]
    study_notes: Optional[StudyNotes]
    tasks: Optional[TaskList]
    calendar_events: Optional[CalendarEventList]
    final_output: dict

def process_text(text: str, api_key: str = None) -> dict:
    """Helper function to run the graph and return the final structured output."""
    
    if not api_key:
        api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable or header is not set.")

    # --- Initialize Model ---
    llm = ChatGoogleGenerativeAI(model="gemini-3.5-flash", temperature=0, api_key=api_key)

    classifier_llm = llm.with_structured_output(ClassificationResult)
    study_llm = llm.with_structured_output(StudyNotes)
    task_llm = llm.with_structured_output(TaskList)
    calendar_llm = llm.with_structured_output(CalendarEventList)

    # --- Nodes ---
    def classify_node(state: AgentState):
        raw_input = state["raw_input"]
        response = classifier_llm.invoke([
            ("system", CLASSIFIER_SYSTEM_PROMPT),
            ("human", raw_input)
        ])
        return {"classification": response}

    def extract_study_node(state: AgentState):
        classification = state.get("classification")
        if not classification or not classification.has_study_content:
            return {"study_notes": None}
        
        raw_input = state["raw_input"]
        response = study_llm.invoke([
            ("system", STUDY_SYSTEM_PROMPT),
            ("human", raw_input)
        ])
        return {"study_notes": response}

    def extract_tasks_node(state: AgentState):
        classification = state.get("classification")
        if not classification or not classification.has_tasks:
            return {"tasks": None}
        
        raw_input = state["raw_input"]
        current_time_context = f"\n\nCRITICAL CONTEXT: The current local date and time is {datetime.now().isoformat()}."
        response = task_llm.invoke([
            ("system", TASK_SYSTEM_PROMPT + current_time_context),
            ("human", raw_input)
        ])
        return {"tasks": response}

    def extract_calendar_node(state: AgentState):
        classification = state.get("classification")
        if not classification or not classification.has_calendar_events:
            return {"calendar_events": None}
        
        raw_input = state["raw_input"]
        current_time_context = f"\n\nCRITICAL CONTEXT: The current local date and time is {datetime.now().isoformat()}."
        response = calendar_llm.invoke([
            ("system", CALENDAR_SYSTEM_PROMPT + current_time_context),
            ("human", raw_input)
        ])
        return {"calendar_events": response}

    def synthesize_node(state: AgentState):
        output = {
            "study_notes": state.get("study_notes"),
            "tasks": state.get("tasks"),
            "calendar_events": state.get("calendar_events")
        }
        return {"final_output": output}

    # --- Graph Definition ---
    workflow = StateGraph(AgentState)

    workflow.add_node("classifier", classify_node)
    workflow.add_node("study_extractor", extract_study_node)
    workflow.add_node("task_extractor", extract_tasks_node)
    workflow.add_node("calendar_extractor", extract_calendar_node)
    workflow.add_node("synthesizer", synthesize_node)

    workflow.add_edge(START, "classifier")
    workflow.add_edge("classifier", "study_extractor")
    workflow.add_edge("classifier", "task_extractor")
    workflow.add_edge("classifier", "calendar_extractor")
    workflow.add_edge("study_extractor", "synthesizer")
    workflow.add_edge("task_extractor", "synthesizer")
    workflow.add_edge("calendar_extractor", "synthesizer")
    workflow.add_edge("synthesizer", END)

    app = workflow.compile()

    initial_state = {
        "raw_input": text,
        "classification": None,
        "study_notes": None,
        "tasks": None,
        "calendar_events": None,
        "final_output": {}
    }
    
    result = app.invoke(initial_state)
    return result.get("final_output", {})

def process_audio(audio_bytes: bytes, mime_type: str, api_key: str = None) -> dict:
    """Helper function to transcribe audio and run it through the graph."""
    if not api_key:
        api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable or header is not set.")

    import base64
    from langchain_core.messages import HumanMessage

    llm = ChatGoogleGenerativeAI(model="gemini-3.5-flash", temperature=0, api_key=api_key)
    
    # We ask Gemini to transcribe the audio precisely
    message = HumanMessage(
        content=[
            {"type": "text", "text": "Transcribe this audio exactly as spoken. Do not summarize or format it."},
            {
                "type": "media",
                "mime_type": mime_type,
                "data": base64.b64encode(audio_bytes).decode("utf-8")
            }
        ]
    )
    
    response = llm.invoke([message])
    transcription = response.content
    
    # Process the resulting transcription through our normal pipeline
    return process_text(transcription, api_key=api_key)

def chat_with_brain(data: dict, query: str, api_key: str = None) -> str:
    """Answers a user's query based on their entire data dump."""
    if not api_key:
        api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable or header is not set.")

    llm = ChatGoogleGenerativeAI(model="gemini-3.5-flash", temperature=0, api_key=api_key)
    
    context = f"USER DATA:\n{data}\n\nUSER QUESTION:\n{query}"
    
    response = llm.invoke([
        ("system", CHAT_SYSTEM_PROMPT),
        ("human", context)
    ])
    
    answer = response.content
    if isinstance(answer, list):
        return " ".join([block.get("text", "") for block in answer if isinstance(block, dict) and block.get("type") == "text"])
    return str(answer)

def generate_knowledge_graph(data: dict, api_key: str = None) -> dict:
    """Generates a structured knowledge graph from the user's data."""
    if not api_key:
        api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable or header is not set.")

    llm = ChatGoogleGenerativeAI(model="gemini-3.5-flash", temperature=0.1, api_key=api_key)
    graph_llm = llm.with_structured_output(KnowledgeGraph)
    
    context = f"USER DATA:\n{data}"
    
    response = graph_llm.invoke([
        ("system", GRAPH_SYSTEM_PROMPT),
        ("human", context)
    ])
    
    # Convert pydantic models in response to dict
    def to_dict(obj):
        if hasattr(obj, 'model_dump'):
            return obj.model_dump()
        elif hasattr(obj, 'dict'):
            return obj.dict()
        return obj

    if not response:
        return {"nodes": [], "links": []}
        
    return to_dict(response)
