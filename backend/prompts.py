from pydantic import BaseModel, Field
from typing import List, Optional

# --- Schemas ---

class ClassificationResult(BaseModel):
    has_study_content: bool = Field(description="True if the input contains academic concepts, lecture notes, formulas, or general knowledge worth saving.")
    has_tasks: bool = Field(description="True if the input contains actionable tasks, to-dos, assignments, or chores.")
    has_calendar_events: bool = Field(description="True if the input contains specific upcoming events, exams, or meetings with dates/times.")

class StudyNotes(BaseModel):
    markdown_content: str = Field(description="Beautifully formatted Markdown summarizing the study or knowledge content. Use ## headings, * bullet points, and LaTeX blocks $$...$$ for math formulas if applicable.")

class Task(BaseModel):
    title: str = Field(description="A concise title for the task.")
    deadline: Optional[str] = Field(description="The deadline for the task. IMPORTANT: Must be formatted as a valid ISO 8601 datetime string (e.g. 2026-07-20T17:00:00).")
    notes: Optional[str] = Field(description="Any extra context or details about the task.")

class TaskList(BaseModel):
    tasks: List[Task] = Field(description="A list of actionable tasks extracted from the input.")

class CalendarEvent(BaseModel):
    title: str = Field(description="The title of the event.")
    start_time: str = Field(description="The start time/date of the event. IMPORTANT: Must be formatted as a valid ISO 8601 datetime string (e.g. 2026-07-20T17:00:00).")
    location: Optional[str] = Field(description="Where the event takes place, if mentioned.")
    description: Optional[str] = Field(description="Details or prep work required for the event.")

class CalendarEventList(BaseModel):
    events: List[CalendarEvent] = Field(description="A list of calendar events extracted from the input.")

class GraphNode(BaseModel):
    id: str = Field(description="A unique identifier for the node (usually the concept name).")
    label: str = Field(description="The display label for the node.")
    group: str = Field(description="The category or group this node belongs to (e.g. 'task', 'event', 'concept', 'person').")

class GraphLink(BaseModel):
    source: str = Field(description="The id of the source node.")
    target: str = Field(description="The id of the target node.")
    label: str = Field(description="A short label describing how they are connected.")

class KnowledgeGraph(BaseModel):
    nodes: List[GraphNode] = Field(description="A list of conceptual nodes.")
    links: List[GraphLink] = Field(description="A list of links connecting the nodes.")

# --- System Prompts ---

CLASSIFIER_SYSTEM_PROMPT = """You are the first stage of an intelligent note-taking agent.
Your job is to analyze chaotic, unstructured text dumps from a user and determine what types of information are present.

Categories:
1. Study Content: Academic notes, formulas, conceptual explanations, reading summaries.
2. Tasks: Actionable items, homework assignments to submit, errands to run, people to call.
3. Calendar Events: Specific events occurring at a certain date/time like exams, meetings, or classes.

Output a structured JSON response indicating which categories are present."""

STUDY_SYSTEM_PROMPT = """You are an expert academic tutor and note formatter.
Extract any study-related information, concepts, or formulas from the raw chaotic text.
Format it beautifully in Markdown.
- Use headings and bullet points.
- If there are math or logic formulas, format them strictly in LaTeX using $$ blocks.
- Ignore personal tasks or calendar dates—focus ONLY on the conceptual/study content."""

TASK_SYSTEM_PROMPT = """You are a highly organized productivity assistant.
Extract all actionable tasks, chores, or assignments from the raw chaotic text.
- Be concise.
- Extract any mentioned deadlines.
- If it's just a general concept to study, do not make it a task unless there is a specific action attached (e.g. 'read page 45')."""

CALENDAR_SYSTEM_PROMPT = """You are an executive assistant managing a busy schedule.
Extract all events, meetings, or exams from the raw chaotic text that belong on a calendar.
- Extract the title, time, and location.
- Include any relevant context in the description.
- Ignore general to-do list items unless they are tied to a specific block of time."""

CHAT_SYSTEM_PROMPT = """You are a highly intelligent personal assistant with total access to the user's brain dumps (notes, tasks, calendar events).
Use the provided JSON data of their life to answer their question directly, accurately, and conversationally.
If the answer is not in the data, simply state that you don't know."""

GRAPH_SYSTEM_PROMPT = """You are a knowledge architect.
Given a raw JSON dump of the user's notes, tasks, and calendar events, you must extract an interconnected Knowledge Graph.
- Create 'nodes' for key concepts, tasks, events, and people.
- Create 'links' that connect related nodes (e.g., a task belonging to a project, a concept related to another concept).
- Be thorough but avoid creating disconnected or overly vague nodes."""
