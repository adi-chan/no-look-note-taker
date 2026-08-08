"use client";

import React, { useState } from 'react';
import axios from 'axios';
import { Send, Loader2, Bot, User, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function ChatView({ data }: { data: any }) {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([
    { role: 'assistant', content: "Hi! I have access to your entire brain dump. Ask me anything about your notes, tasks, or schedule!" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userQuery = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userQuery }]);
    setIsLoading(true);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await axios.post(`${API_URL}/api/chat`, {
        query: userQuery,
        data: data
      }, {
        headers: {
          'x-gemini-api-key': typeof window !== 'undefined' ? localStorage.getItem('gemini_api_key') || '' : ''
        }
      });

      setMessages(prev => [...prev, { role: 'assistant', content: response.data.answer }]);
    } catch (error) {
      console.error("Failed to query chat:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I ran into an error connecting to your brain." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white/5 border border-gray-800 rounded-xl overflow-hidden flex flex-col h-[700px]">
      <div className="flex items-center justify-between p-6 border-b border-gray-800">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Bot className="w-5 h-5 text-indigo-400" />
          Chat With Your Brain
        </h2>
        <button 
          onClick={() => setMessages([{ role: 'assistant', content: "Hi! I have access to your entire brain dump. Ask me anything about your notes, tasks, or schedule!" }])}
          className="text-gray-400 hover:text-white flex items-center gap-2 text-sm transition-colors"
        >
          <Trash2 className="w-4 h-4" /> Clear Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-indigo-600' : 'bg-gray-800'}`}>
              {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-indigo-400" />}
            </div>
            <div className={`max-w-[80%] rounded-2xl p-4 ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-gray-800 text-gray-200 rounded-tl-sm'}`}>
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown>{typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)}</ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="bg-gray-800 rounded-2xl rounded-tl-sm p-4 flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
              <span className="text-sm text-gray-400">Searching your brain...</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-gray-900/80 border-t border-gray-800">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your notes, tasks, or events..."
            className="flex-1 bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
