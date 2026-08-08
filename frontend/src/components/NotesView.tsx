"use client";

import { useState } from "react";
import { BookOpen, Edit2, Check, Trash2, Plus, Clock } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import 'katex/dist/katex.min.css';

export default function NotesView({ 
  notes,
  onUpdateNote,
  onDeleteNote
}: { 
  notes: any[];
  onUpdateNote: (id: string, updates: any) => void;
  onDeleteNote: (id: string) => void;
}) {
  const [activeNoteId, setActiveNoteId] = useState<string | null>(notes.length > 0 ? notes[0].id : null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState("");

  const activeNote = notes.find(n => n.id === activeNoteId);

  const startEditingTitle = () => {
    if (activeNote) {
      setEditTitleValue(activeNote.title);
      setIsEditingTitle(true);
    }
  };

  const saveTitle = () => {
    if (activeNote && editTitleValue.trim()) {
      onUpdateNote(activeNote.id, { title: editTitleValue.trim() });
    }
    setIsEditingTitle(false);
  };

  const handleDelete = () => {
    if (activeNote && confirm("Are you sure you want to delete this note?")) {
      onDeleteNote(activeNote.id);
      setActiveNoteId(notes.length > 1 ? notes.find(n => n.id !== activeNote.id)?.id || null : null);
    }
  };

  return (
    <div className="bg-white/5 border border-gray-800 rounded-xl overflow-hidden flex h-[750px]">
      
      {/* Sidebar List */}
      <div className="w-1/3 min-w-[250px] border-r border-gray-800 bg-gray-900/50 flex flex-col">
        <div className="p-4 border-b border-gray-800 flex items-center gap-2 sticky top-0 bg-gray-900/90 backdrop-blur z-10">
          <BookOpen className="w-5 h-5 text-indigo-400" />
          <h2 className="font-semibold text-gray-200">Your Notes</h2>
        </div>
        
        <div className="overflow-y-auto flex-1 p-3 space-y-2">
          {!notes || notes.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 text-sm text-center p-4">
              <BookOpen className="w-8 h-8 opacity-20 mb-2" />
              <p>No notes found.</p>
              <p className="text-xs mt-1">Dump some thoughts to create your first note.</p>
            </div>
          ) : (
            notes.map((note) => (
              <button
                key={note.id}
                onClick={() => {
                  setActiveNoteId(note.id);
                  setIsEditingTitle(false);
                }}
                className={`w-full text-left p-3 rounded-lg transition-all border ${
                  activeNoteId === note.id 
                    ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-100" 
                    : "bg-transparent border-transparent text-gray-400 hover:bg-gray-800 hover:text-gray-300"
                }`}
              >
                <div className="font-medium truncate mb-1">{note.title || "Untitled Note"}</div>
                {note.updated_at && (
                  <div className="flex items-center gap-1 text-[10px] opacity-70">
                    <Clock className="w-3 h-3" />
                    {new Date(note.updated_at).toLocaleDateString()} {new Date(note.updated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col bg-gray-950/50">
        {activeNote ? (
          <>
            {/* Header */}
            <div className="p-6 md:p-8 border-b border-gray-800 bg-gray-900/30 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
              <div className="flex items-center gap-4 flex-1 mr-4">
                {isEditingTitle ? (
                  <div className="flex items-center gap-2 flex-1 max-w-lg animate-in fade-in slide-in-from-left-2">
                    <input
                      type="text"
                      autoFocus
                      value={editTitleValue}
                      onChange={(e) => setEditTitleValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveTitle()}
                      onBlur={saveTitle}
                      className="flex-1 bg-gray-950 border border-indigo-500/50 rounded-lg py-2 px-3 text-xl font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button onClick={saveTitle} className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors shadow-lg">
                      <Check className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 group">
                    <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                      {activeNote.title || "Untitled Note"}
                    </h2>
                    <button 
                      onClick={startEditingTitle}
                      className="p-1.5 text-gray-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                      title="Edit Title"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              
              <button
                onClick={handleDelete}
                className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                title="Delete Note"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            {/* Markdown Content */}
            <div className="p-6 md:p-8 overflow-y-auto flex-1">
              <div className="prose prose-invert prose-indigo prose-lg max-w-4xl mx-auto">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm, remarkMath]} 
                  rehypePlugins={[rehypeKatex]}
                >
                  {activeNote.content || "*Empty note.*"}
                </ReactMarkdown>
              </div>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-500">
            <BookOpen className="w-16 h-16 opacity-10 mb-4" />
            <p className="text-xl">Select a note to view</p>
          </div>
        )}
      </div>
    </div>
  );
}
