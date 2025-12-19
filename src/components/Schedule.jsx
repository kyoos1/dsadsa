// components/Schedule.jsx
import React, { useState, useEffect } from 'react';
import { ChevronLeft, Calendar, Clock, MapPin, Users, Filter } from 'lucide-react';
import { supabase } from '../supabaseClient';

const Schedule = ({ onNavigate, user }) => {
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchEvents();
  }, [selectedDate, filter]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('events')
        .select('*')
        .eq('is_active', true)
        .order('start_time', { ascending: true });

      if (filter !== 'all') {
        query = query.eq('event_type', filter);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching events:', error);
        setError('Failed to load events: ' + error.message);
        setEvents([]);
        return;
      }
      
      console.log('Events fetched:', data?.length || 0);
      setEvents(data || []);
      setError('');
    } catch (error) {
      console.error('Error fetching events:', error);
      setError('An unexpected error occurred');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const getEventTypeColor = (type) => {
    switch (type) {
      case 'academic': return 'bg-blue-100 text-blue-800';
      case 'social': return 'bg-green-100 text-green-800';
      case 'sports': return 'bg-red-100 text-red-800';
      case 'maintenance': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (dateString) => {
    try {
      return new Date(dateString).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return 'Invalid time';
    }
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white px-6 pt-12 pb-6 flex items-center border-b border-gray-100 sticky top-0 z-20">
        <button onClick={() => onNavigate('map')} className="p-2 -ml-2 mr-2 hover:bg-gray-100 rounded-full transition-colors text-gray-700">
          <ChevronLeft size={24} />
        </button>
        <div className="flex items-center gap-3">
          <div className="bg-green-100 p-2 rounded-xl">
            <Calendar className="text-green-600" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Campus Schedule</h1>
            <p className="text-gray-500 text-sm">Events and activities</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <Filter size={18} className="text-gray-400" />
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {['all', 'academic', 'social', 'sports', 'maintenance'].map((type) => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  filter === type
                    ? 'bg-[#601214] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-pulse">
                <div className="flex gap-4">
                  <div className="w-16 h-16 bg-gray-200 rounded-xl"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : events.length > 0 ? (
          <div className="space-y-4">
            {events.map((event, index) => (
              <div 
                key={event.id || index}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all animate-enter"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-start gap-4">
                  {/* Date Box */}
                  <div className="flex-shrink-0 bg-gray-50 rounded-xl p-3 text-center min-w-16 border">
                    <div className="text-sm font-bold text-gray-900">
                      {formatDate(event.start_time)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatTime(event.start_time)}
                    </div>
                  </div>

                  {/* Event Details */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold text-gray-900 text-lg">{event.title || 'Untitled Event'}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${getEventTypeColor(event.event_type)}`}>
                        {event.event_type || 'general'}
                      </span>
                    </div>
                    
                    {event.description && (
                      <p className="text-gray-600 mb-3 leading-relaxed">{event.description}</p>
                    )}

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      {event.location && (
                        <div className="flex items-center gap-1">
                          <MapPin size={14} />
                          <span>{event.location}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Clock size={14} />
                        <span>{formatTime(event.start_time)} - {formatTime(event.end_time)}</span>
                      </div>
                    </div>

                    {event.building_id && (
                      <button 
                        onClick={() => onNavigate('navigate')}
                        className="mt-3 text-[#601214] font-semibold text-sm hover:underline flex items-center gap-1"
                      >
                        <MapPin size={14} />
                        Get Directions
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar size={24} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No upcoming events</h3>
            <p className="text-gray-500">
              {filter === 'all' 
                ? "No scheduled events. Check back later!"
                : `No ${filter} events scheduled.`
              }
            </p>
            <button
              onClick={fetchEvents}
              className="mt-4 text-[#601214] font-semibold text-sm hover:underline"
            >
              Refresh
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Schedule;