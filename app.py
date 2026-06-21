import os
import streamlit as st
from agent import process_text, process_audio

# --- Initialize Persistent State ---
if 'tasks' not in st.session_state:
    st.session_state.tasks = []
if 'calendar_events' not in st.session_state:
    st.session_state.calendar_events = []
if 'study_notes' not in st.session_state:
    st.session_state.study_notes = []

# Define test cases for easy loading
TEST_CASES = {
    "Select a test case...": "",
    "Panicked Voice Memo (Tasks & Calendar)": "okay so i’m walking to class right now but professor srinivas just said the dbms midsem syllabus changed module 4 schema refinement is definitely on it functional dependencies and 3nf vs bcnf closure of attribute sets is a huge topic he said there will be a 10 mark question on finding candidate keys also we need to submit the assignment by thursday midnight or he cuts 5 marks wait i also need to buy groceries tonight milk and eggs and call junaid about the project split forgot his share is 2500 rupees oh and remind me we have that review session meeting tomorrow morning at 10 am in the library okay bye",
    "Late Night Study Session (Math & Exam)": "calc lecture notes partial derivatives chain rule ugh z = f(x,y) where x = g(t) and y = h(t) so dz/dt = (del z/del x)(dx/dt) + (del z/del y)(dy/dt) check page 45 of textbook for the proof exam is next monday morning 9am sharp room 302 wear ID card mandatory prep quiz open on portal closes sunday night at 11",
    "Screenshot Raw OCR (Deadlines)": "ATTENDANCE REQMNT!! 75% strict!! current math attendance 14/18 classes attended = 77% if i miss next 2 classes what happens? check portal. project milestone 1 due 24th june 2026. link to github repo in classroom stream. team name: NullPointers."
}

st.set_page_config(page_title="No-Look Note Taker", layout="wide")

st.title("🧠 No-Look Contextual Note Taker")
st.markdown("Dump your chaotic thoughts, voice transcripts, or OCR text below. The agent will classify and organize them automatically.")

# --- Sidebar ---
with st.sidebar:
    st.header("⚙️ Configuration")
    api_key = st.text_input("Gemini API Key", type="password", placeholder="AIzaSy...")
    if api_key:
        os.environ["GEMINI_API_KEY"] = api_key
    
    st.markdown("---")
    st.header("🧪 Test Cases")
    st.markdown("Click below to load a synthetic chaotic input.")
    selected_test = st.selectbox("Load Test Case", list(TEST_CASES.keys()))

    if st.button("🗑️ Clear All Data"):
        st.session_state.tasks = []
        st.session_state.calendar_events = []
        st.session_state.study_notes = []
        st.rerun()

def handle_results(results):
    """Update persistent state with newly extracted items."""
    study_res = results.get("study_notes")
    if study_res and hasattr(study_res, 'markdown_content'):
        st.session_state.study_notes.append(study_res.markdown_content)

    task_res = results.get("tasks")
    if task_res and hasattr(task_res, 'tasks') and task_res.tasks:
        st.session_state.tasks.extend(task_res.tasks)
        
    cal_res = results.get("calendar_events")
    if cal_res and hasattr(cal_res, 'events') and cal_res.events:
        st.session_state.calendar_events.extend(cal_res.events)

# --- Main UI ---
default_text = TEST_CASES[selected_test]

tab1, tab2 = st.tabs(["📝 Text Dump", "🎙️ Audio Dump"])

with tab1:
    raw_input = st.text_area("The 'Dump' Window", value=default_text, height=150, placeholder="Type your messy notes here...")
    if st.button("Process Text", type="primary"):
        if not os.environ.get("GEMINI_API_KEY"):
            st.error("Please enter your Gemini API Key in the sidebar first.")
        elif not raw_input.strip():
            st.warning("Please enter some text to process.")
        else:
            with st.spinner("Agent is processing your notes..."):
                try:
                    results = process_text(raw_input)
                    handle_results(results)
                    st.success("Notes Processed Successfully!")
                except Exception as e:
                    st.error(f"An error occurred: {str(e)}")

with tab2:
    audio_file = st.file_uploader("Upload Voice Memo (.mp3, .wav, .m4a)", type=["mp3", "wav", "m4a"])
    if st.button("Process Audio", type="primary"):
        if not os.environ.get("GEMINI_API_KEY"):
            st.error("Please enter your Gemini API Key in the sidebar first.")
        elif not audio_file:
            st.warning("Please upload an audio file.")
        else:
            with st.spinner("Agent is listening and transcribing..."):
                try:
                    audio_bytes = audio_file.read()
                    mime_type = audio_file.type
                    results = process_audio(audio_bytes, mime_type)
                    handle_results(results)
                    st.success("Audio Processed Successfully!")
                except Exception as e:
                    st.error(f"An error occurred: {str(e)}")

st.markdown("---")

# --- Persistent Display ---
col1, col2, col3 = st.columns(3)

with col1:
    st.header("📚 Study Notebook")
    if not st.session_state.study_notes:
        st.info("No study content yet.")
    else:
        for idx, note in enumerate(st.session_state.study_notes):
            st.markdown(note)
            st.markdown("---")

with col2:
    st.header("✅ Tasks")
    if not st.session_state.tasks:
        st.info("No actionable tasks yet.")
    else:
        for idx, task in enumerate(st.session_state.tasks):
            with st.container(border=True):
                col_title, col_btn = st.columns([0.8, 0.2])
                with col_title:
                    st.subheader(task.title)
                with col_btn:
                    if st.button("Done", key=f"del_task_{idx}"):
                        st.session_state.tasks.pop(idx)
                        st.rerun()
                
                if hasattr(task, 'deadline') and task.deadline:
                    st.write(f"**Deadline:** {task.deadline}")
                if hasattr(task, 'notes') and task.notes:
                    st.write(f"**Notes:** {task.notes}")

with col3:
    st.header("📅 Calendar Events")
    if not st.session_state.calendar_events:
        st.info("No calendar events yet.")
    else:
        for idx, ev in enumerate(st.session_state.calendar_events):
            with st.container(border=True):
                col_title, col_btn = st.columns([0.8, 0.2])
                with col_title:
                    st.subheader(ev.title)
                with col_btn:
                    if st.button("❌", key=f"del_ev_{idx}"):
                        st.session_state.calendar_events.pop(idx)
                        st.rerun()
                        
                if hasattr(ev, 'start_time') and ev.start_time:
                    st.write(f"🗓️ {ev.start_time}")
                if hasattr(ev, 'location') and ev.location:
                    st.write(f"📍 {ev.location}")
                if hasattr(ev, 'description') and ev.description:
                    st.write(ev.description)
