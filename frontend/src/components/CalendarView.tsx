"use client";

import React, { useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import enUS from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../app/calendar.css';
import { Loader2, RefreshCw, X, Calendar as CalendarIcon, Clock, AlignLeft } from 'lucide-react';
import axios from 'axios';
import * as chrono from 'chrono-node';

const locales = {
  'en-US': enUS,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

export default function CalendarView({ events, onEventSynced }: { events: any[], onEventSynced?: (localId: string, googleId: string) => void }) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<any>('month');

  // Convert our events to react-big-calendar format
  const mappedEvents = events.reduce((acc, ev) => {
    let start = null;
    let end = null;
    
    // Parse either start_time (for events) or deadline (for tasks)
    const timeString = ev.start_time || ev.deadline;
    
    if (timeString) {
      // 1. Try native Date (for ISO 8601)
      let parsedDate = new Date(timeString);
      
      // 2. If invalid, fallback to chrono-node for fuzzy strings ("Tomorrow", "Next week")
      if (isNaN(parsedDate.getTime())) {
        const chronoDate = chrono.parseDate(timeString);
        if (chronoDate) {
          parsedDate = chronoDate;
        }
      }

      // 3. If we finally have a valid date, set start and end
      if (!isNaN(parsedDate.getTime())) {
        start = parsedDate;
        end = new Date(parsedDate.getTime() + 60 * 60 * 1000); // 1 hour duration
      }
    }

    // Only add to calendar if we successfully extracted a date
    if (start && end) {
      acc.push({
        id: ev.id,
        title: ev.title,
        start,
        end,
        allDay: false,
        resource: ev,
      });
    }
    
    return acc;
  }, []);

  const handleGoogleSync = async () => {
    setIsSyncing(true);
    setSyncStatus(null);
    
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('google_calendar_access_token') : null;
      
      if (!token) {
        setSyncStatus({ type: 'error', message: 'Not authenticated with Google Calendar. Please log out and log back in using Google.' });
        setIsSyncing(false);
        return;
      }

      // Sync each event
      let syncedCount = 0;
      for (const ev of mappedEvents) {
        // Skip if already synced
        if (ev.resource.googleEventId) continue;

        const eventResource = {
          summary: ev.title,
          description: ev.resource.details || '',
          start: {
            dateTime: ev.start.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
          end: {
            dateTime: ev.end.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        };

        const response = await axios.post(
          'https://www.googleapis.com/calendar/v3/calendars/primary/events',
          eventResource,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );
        
        if (onEventSynced && ev.id) {
          onEventSynced(ev.id, response.data.id);
        }
        
        syncedCount++;
      }
      
      if (syncedCount === 0) {
        setSyncStatus({ type: 'success', message: 'All events are already synced!' });
      } else {
        setSyncStatus({ type: 'success', message: `Successfully synced ${syncedCount} new events to Google Calendar!` });
      }
    } catch (error: any) {
      console.error('Error syncing to Google Calendar', error);
      let errMsg = error.response?.data?.error?.message || 'Failed to sync to Google Calendar.';
      
      if (error.response?.status === 401) {
        errMsg = "Your Google session expired. Please Log Out and Log In again to re-authorize Calendar access.";
        // Clear the bad token
        if (typeof window !== 'undefined') {
          localStorage.removeItem('google_calendar_access_token');
        }
      }
      
      setSyncStatus({ type: 'error', message: errMsg });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="bg-white/5 border border-gray-800 rounded-xl overflow-hidden flex flex-col h-[700px]">
      <div className="flex items-center justify-between p-6 border-b border-gray-800">
        <h2 className="text-lg font-bold text-white">Calendar View</h2>
        
        <div className="flex items-center gap-4">
          {syncStatus && (
            <span className={`text-sm ${syncStatus.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
              {syncStatus.message}
            </span>
          )}
          <button
            onClick={handleGoogleSync}
            disabled={isSyncing || mappedEvents.length === 0}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Sync to Google Calendar
          </button>
        </div>
      </div>
      
      <div className="p-6 flex-1 bg-gray-900/50 animate-in fade-in duration-500">
        <Calendar
          localizer={localizer}
          events={mappedEvents}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          views={['month', 'week', 'day']}
          view={currentView}
          onView={setCurrentView}
          date={currentDate}
          onNavigate={setCurrentDate}
          popup={true}
          onSelectEvent={(event) => setSelectedEvent(event)}
        />
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-950/50">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-indigo-400" />
                Event Details
              </h3>
              <button 
                onClick={() => setSelectedEvent(null)}
                className="text-gray-400 hover:text-white transition-colors p-1 rounded-md hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h4 className="text-xl font-bold text-white mb-2">{selectedEvent.title}</h4>
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
                  <Clock className="w-4 h-4" />
                  <span>
                    {format(selectedEvent.start, 'MMM d, yyyy • h:mm a')}
                  </span>
                </div>
              </div>
              
              {selectedEvent.resource.details && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-300">
                    <AlignLeft className="w-4 h-4" />
                    Description
                  </div>
                  <div className="p-4 bg-gray-950/50 rounded-lg border border-gray-800 text-sm text-gray-400 leading-relaxed">
                    {selectedEvent.resource.details}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
