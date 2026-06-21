# Documentation: Behind the Scenes

This document explains the technical architecture and logic powering the No-Look Contextual Note Taker. The application is built using a multi-agent orchestration framework (LangGraph) integrated with Google's Gemini 2.5 Flash model and Streamlit for the frontend.

## 1. System Architecture

The core of the application is a Directed Acyclic Graph (DAG) managed by LangGraph. Instead of relying on a single, massive prompt to do everything at once, the workload is distributed across specialized "nodes." This makes the system faster, highly accurate, and cost-efficient.

The workflow follows this path:
Input -> Classifier Node -> [Parallel Extraction Nodes] -> Synthesizer -> UI

## 2. The Ingestion Layer

The system accepts two types of input:
- **Text Dump**: Raw strings are passed directly into the agent state.
- **Audio Dump**: When an audio file (.mp3, .wav) is uploaded, it bypasses traditional speech-to-text APIs. Instead, the raw audio bytes are encoded in Base64 and sent directly to Gemini 2.5. Gemini natively listens to the audio and produces an exact, unformatted transcription, which is then fed into the standard pipeline.

## 3. The Classifier Node (The Router)

The first node in the graph is the Classifier. Its only job is to read the raw input and determine what types of data are present. 

It uses Pydantic to strictly return a JSON object with three boolean values:
- `has_study_content`
- `has_tasks`
- `has_calendar_events`

Why do this? If a user uploads a note that only contains a grocery list, the Classifier sets `has_calendar_events = False` and `has_study_content = False`. LangGraph uses this information to route the data, completely skipping the Calendar and Study extraction nodes. This prevents the LLM from hallucinating empty events and saves API tokens.

## 4. The Extraction Nodes (Parallel Processing)

If the Classifier determines a data type is present, the input is routed to the respective extraction node(s). These nodes run in parallel:

- **Study Extractor**: Prompted to act as an academic tutor. It extracts facts, concepts, and formats them in Markdown (including LaTeX for math).
- **Task Extractor**: Prompted to act as a productivity assistant. It pulls out actionable items and deadlines.
- **Calendar Extractor**: Prompted to act as an executive assistant. It identifies dates, times, locations, and event titles.

Each extractor uses `with_structured_output` (powered by Pydantic schemas) to guarantee the response is a perfectly formatted JSON object. This ensures the frontend code never breaks trying to parse plain text.

## 5. The Synthesizer Node

Once the parallel extraction nodes finish their work, the graph converges at the Synthesizer node. This node collects the structured JSON outputs from the extractors and bundles them into a final dictionary containing the `study_notes`, `tasks`, and `calendar_events`.

## 6. Frontend Persistent State

The Streamlit frontend receives the finalized dictionary. To create a "Persistent Hub" experience, the app uses Streamlit's `st.session_state`. 

Instead of wiping the screen every time a new note is processed, the newly extracted tasks and events are appended to the existing lists in memory. This allows the user to process multiple voice memos throughout the day and watch their master list grow, only removing items when they manually click the "Done" button.
