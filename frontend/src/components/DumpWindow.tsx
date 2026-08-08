"use client";

import { useState, useRef } from "react";
import { Mic, Type, Upload, Loader2, Send, Square, Play } from "lucide-react";
import axios from "axios";

export default function DumpWindow({ onResults, notes = [] }: { onResults: (data: any, targetNoteId?: string) => void, notes?: any[] }) {
  const [activeTab, setActiveTab] = useState<"text" | "audio">("text");
  const [textInput, setTextInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [targetNoteId, setTargetNoteId] = useState<string>("new");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    setError("");
    setFile(null); // Clear previous file if any
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], "voice_memo.webm", { type: 'audio/webm' });
        setFile(audioFile);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setError("Microphone permission denied or not available.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleProcessText = async () => {
    if (!textInput.trim()) return;
    
    setIsLoading(true);
    setError("");
    
    try {
      const apiKey = typeof window !== 'undefined' ? localStorage.getItem('gemini_api_key') : '';
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await axios.post(`${API_URL}/api/process/text`, {
        text: textInput
      }, {
        headers: { "x-gemini-api-key": apiKey || "" }
      });
      onResults(res.data.data, targetNoteId);
      setTextInput("");
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || "An error occurred while processing.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleProcessAudio = async () => {
    if (!file) return;
    
    setIsLoading(true);
    setError("");
    
    const formData = new FormData();
    formData.append("file", file);

    try {
      const apiKey = typeof window !== 'undefined' ? localStorage.getItem('gemini_api_key') : '';
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await axios.post(`${API_URL}/api/process/audio`, formData, {
        headers: { 
          "Content-Type": "multipart/form-data",
          "x-gemini-api-key": apiKey || ""
        }
      });
      onResults(res.data.data, targetNoteId);
      setFile(null);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || "An error occurred while processing.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white/5 border border-gray-800 rounded-xl overflow-hidden flex flex-col">
      <div className="flex border-b border-gray-800">
        <button
          onClick={() => setActiveTab("text")}
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
            activeTab === "text" 
              ? "bg-indigo-500/10 text-indigo-400 border-b-2 border-indigo-500" 
              : "text-gray-400 hover:bg-white/5 hover:text-gray-300"
          }`}
        >
          <Type className="w-4 h-4" />
          Text Dump
        </button>
        <button
          onClick={() => setActiveTab("audio")}
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
            activeTab === "audio" 
              ? "bg-indigo-500/10 text-indigo-400 border-b-2 border-indigo-500" 
              : "text-gray-400 hover:bg-white/5 hover:text-gray-300"
          }`}
        >
          <Mic className="w-4 h-4" />
          Voice Memo
        </button>
      </div>

      <div className="p-6 flex-1 flex flex-col relative">
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}

        {activeTab === "text" ? (
          <>
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Dump your chaotic thoughts here..."
              className="w-full flex-1 min-h-[120px] bg-gray-900/50 border border-gray-700 rounded-lg p-4 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
            />
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-sm font-medium text-gray-400">Target Note:</span>
                <select
                  value={targetNoteId}
                  onChange={(e) => setTargetNoteId(e.target.value)}
                  className="bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2 transition-colors"
                >
                  <option value="new">+ Create New Note</option>
                  {notes.map((note) => (
                    <option key={note.id} value={note.id}>
                      {note.title}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleProcessText}
                disabled={!textInput.trim() || isLoading}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {isLoading ? "Processing..." : "Process Notes"}
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-700 rounded-lg p-8 bg-gray-900/30 relative">
            {isRecording ? (
              <div className="flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75"></div>
                  <div className="relative bg-red-500 p-6 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.5)]">
                    <Mic className="w-8 h-8 text-white" />
                  </div>
                </div>
                <h3 className="text-red-400 font-bold text-lg mb-8 animate-pulse">Recording...</h3>
                
                <button
                  onClick={stopRecording}
                  className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors border border-gray-700 shadow-lg"
                >
                  <Square className="w-5 h-5 text-red-400" />
                  Stop Recording
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center w-full max-w-sm">
                <button
                  onClick={startRecording}
                  className="w-full flex items-center justify-center gap-3 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 px-6 py-4 rounded-xl font-bold transition-all hover:scale-[1.02] active:scale-95 mb-8"
                >
                  <div className="bg-indigo-500 p-2 rounded-full">
                    <Mic className="w-5 h-5 text-white" />
                  </div>
                  Start Recording
                </button>

                <div className="w-full flex items-center gap-4 mb-8">
                  <div className="flex-1 h-px bg-gray-800"></div>
                  <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Or upload file</span>
                  <div className="flex-1 h-px bg-gray-800"></div>
                </div>

                <Upload className="w-8 h-8 text-gray-600 mb-3" />
                <p className="text-gray-500 text-sm text-center mb-6">
                  Supports .mp3, .wav, .m4a, and .webm formats.
                </p>
                
                <input
                  type="file"
                  accept=".mp3,.wav,.m4a,.webm"
                  id="audio-upload"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                
                <div className="flex flex-col items-center gap-4 w-full">
                  <label
                    htmlFor="audio-upload"
                    className="cursor-pointer bg-gray-800 hover:bg-gray-700 text-gray-200 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border border-gray-700 w-full text-center"
                  >
                    {file ? file.name : "Select File manually"}
                  </label>
                  
                  <div className="w-full flex flex-col gap-2 mt-4">
                    <label className="text-xs font-medium text-gray-400 self-start">Target Note:</label>
                    <select
                      value={targetNoteId}
                      onChange={(e) => setTargetNoteId(e.target.value)}
                      className="bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2 transition-colors mb-2"
                    >
                      <option value="new">+ Create New Note</option>
                      {notes.map((note) => (
                        <option key={note.id} value={note.id}>
                          {note.title}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={handleProcessAudio}
                      disabled={!file || isLoading}
                      className="flex w-full justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      {isLoading ? "Transcribing..." : "Process Audio"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
