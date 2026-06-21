# No-Look Contextual Note Taker

![App Screenshot](ss_vids/screenshot.png)

### 🎥 Watch the Demo Video

https://github.com/user-attachments/assets/8de44dca-2780-4f4b-b0f2-1a7a2f216702




The **No-Look Contextual Note Taker** solves a deeply human problem: chaotic, unstructured, panicked brain dumps. Whether you are running late to class and typing a disorganized paragraph, or speaking a panicked voice memo into your phone, this agentic app listens, untangles your thoughts, and perfectly organizes them.

## Features
- **"No-Look" Brain Dumps**: Paste completely chaotic text with mixed topics, hidden deadlines, and typos.
- **True Multimodal Voice Support**: Drag and drop raw `.mp3` or `.wav` files. The agent natively transcribes and processes your voice using Gemini 2.5.
- **Multi-Agent Orchestration**: Powered by **LangGraph**, the app dynamically routes data. A Classifier Node analyzes your input and only triggers the necessary extraction nodes (Study, Task, Calendar), saving time and API costs.
- **Structured Pydantic Outputs**: The LLM is forced to return strict JSON structures, guaranteeing the UI never hallucinates or breaks.
- **Persistent Organizer Hub**: Built with Streamlit, the app acts as a permanent dashboard where tasks and events stack up until you manually check them off.

## System Architecture

The core of the application is powered by a multi-agent Directed Acyclic Graph (DAG) orchestrated using **LangGraph**. The workflow dynamically routes, processes, and structures user inputs.

### Architecture Flowchart
```text
                 [ User Input ]
             (Text or .mp3 Audio)
                      │
                      ▼
               Ingestion Layer
                      │
                      ▼
            ┌───────────────────┐
            │  Classifier Node  │ (Gemini 2.5)
            └─────────┬─────────┘
                      │
         Determines payload intent
                      │
     ┌────────────────┼────────────────┐
     │                │                │
     ▼ (has_tasks)    ▼ (has_calendar) ▼ (has_study)
┌───────────┐    ┌───────────┐    ┌───────────┐
│   Task    │    │ Calendar  │    │   Study   │
│ Extractor │    │ Extractor │    │ Extractor │ (Extractors run in parallel)
└─────┬─────┘    └─────┬─────┘    └─────┬─────┘
      │                │                │
      └────────────────┼────────────────┘
                       │
                       ▼
             ┌───────────────────┐
             │ Synthesizer Node  │ (Merges outputs)
             └─────────┬─────────┘
                       │
                       ▼
            Streamlit Dashboard UI
            (Persistent st.session_state)
```

### In-Depth Component Breakdown

**1. Ingestion Layer**
* **Audio Input:** Native processing of audio (`.mp3`/`.wav`) using Gemini's multimodal audio understanding capability, skipping traditional speech-to-text translation.
* **Text Input:** Direct parsing of disorganized text blocks.

**2. Classifier Node (Router)**
The Classifier acts as the orchestrator:
* It reads the input and classifies it against a Pydantic schema (e.g. `has_tasks`, `has_calendar_events`, `has_study_notes`).
* By evaluating these flags, the graph utilizes **conditional edges** to only trigger the extraction nodes that are needed. If `has_calendar_events` is `False`, the Calendar node is completely bypassed, saving API cost and execution latency.

**3. Parallel Extraction Agents**
Each extractor is a specialized agent bound to a strict output schema:
* **Task Extractor:** Extracts to-do items, urgency, and categories.
* **Calendar Extractor:** Identifies meeting names, dates, times, and durations.
* **Study Extractor:** Synthesizes educational concepts, definitions, and summaries.

**4. Synthesizer & State Management**
* The results from the active extractors are collected and unified.
* The state is pushed to the Streamlit UI, where the dashboard appends the new objects into `st.session_state` to prevent data loss across multiple inputs.

## How to Run Locally

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/no-look-note-taker.git
   cd no-look-note-taker
   ```

2. **Set up a virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the app:**
   ```bash
   streamlit run app.py
   ```

5. **API Key Setup:**
   Grab a free API key from Google AI Studio and paste it directly into the Streamlit sidebar to start processing!

## Future Enhancements
- **Export to Calendar**: One-click `.ics` generation to automatically add extracted events to Apple/Google Calendar.
- **Notion Integration**: Directly push the "Study Notebook" formatted markdown into a Notion database via API.
- **Gemini File API for Large Videos**: Upgrade the ingestion node to use the Gemini File API, allowing users to upload massive 1-hour `.mp4` lecture videos instead of just short audio memos.

---
*Built with love using LangGraph, Streamlit, and Google Gemini 2.5.*
