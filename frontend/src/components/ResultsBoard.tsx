"use client";

import { Check, Calendar as CalendarIcon, Trash2 } from "lucide-react";
import 'katex/dist/katex.min.css'; 
import { format } from 'date-fns';

function formatDisplayDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      // Check if it has time or is just a date
      if (dateStr.includes('T')) {
        return format(d, 'MMM do, h:mm a');
      }
      return format(d, 'MMM do, yyyy');
    }
  } catch (e) {}
  return dateStr;
}

export default function ResultsBoard({ 
  data, 
  onRemoveTask, 
  onRemoveEvent 
}: { 
  data: any, 
  onRemoveTask: (id: string | number) => void,
  onRemoveEvent: (id: string | number) => void
}) {
  const { tasks, calendar_events } = data;
  
  return (
    <>
      <div className="bg-white/5 border border-gray-800 rounded-xl overflow-hidden flex flex-col h-[500px]">
        <div className="p-4 border-b border-gray-800 bg-gray-900/50 flex items-center gap-2">
          <Check className="w-5 h-5 text-emerald-400" />
          <h2 className="font-semibold text-gray-200">Tasks</h2>
        </div>
        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          {!tasks || tasks.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-500 text-sm">
              No tasks found.
            </div>
          ) : (
            tasks.map((task: any, idx: number) => (
              <div key={task.id || idx} className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 group relative">
                <button 
                  onClick={() => onRemoveTask(task.id || idx)}
                  className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-emerald-400 transition-all"
                  title="Mark as done"
                >
                  <Check className="w-5 h-5" />
                </button>
                <h3 className="font-medium text-gray-200 pr-8">{task.title}</h3>
                {task.deadline && (
                  <div className="mt-2 text-xs font-medium text-red-400 bg-red-500/10 inline-block px-2 py-1 rounded">
                    Due: {formatDisplayDate(task.deadline)}
                  </div>
                )}
                {task.notes && (
                  <p className="mt-2 text-sm text-gray-400">{task.notes}</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-white/5 border border-gray-800 rounded-xl overflow-hidden flex flex-col h-[500px]">
        <div className="p-4 border-b border-gray-800 bg-gray-900/50 flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-amber-400" />
          <h2 className="font-semibold text-gray-200">Calendar Events</h2>
        </div>
        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          {!calendar_events || calendar_events.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-500 text-sm">
              No calendar events found.
            </div>
          ) : (
            calendar_events.map((ev: any, idx: number) => (
              <div key={ev.id || idx} className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 group relative">
                <button 
                  onClick={() => onRemoveEvent(ev.id || idx)}
                  className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all"
                  title="Remove event"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <h3 className="font-medium text-gray-200 pr-8">{ev.title}</h3>
                {ev.start_time && (
                  <p className="mt-2 text-sm text-amber-400 flex items-center gap-1">
                    <CalendarIcon className="w-3 h-3" /> {formatDisplayDate(ev.start_time)}
                  </p>
                )}
                {ev.location && (
                  <p className="mt-1 text-sm text-gray-400">📍 {ev.location}</p>
                )}
                {ev.description && (
                  <p className="mt-2 text-sm text-gray-500">{ev.description}</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
