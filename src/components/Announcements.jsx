import React, { useState, useEffect } from 'react';
import { ChevronLeft, Bell, AlertTriangle, Calendar, Wrench, Megaphone, Clock, MapPin } from 'lucide-react';
import { supabase } from '../supabaseClient';

const Announcements = ({ onNavigate, user }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching announcements:', error);
        setError('Failed to load announcements: ' + error.message);
        setAnnouncements([]);
        return;
      }
      
      console.log('Announcements fetched:', data?.length || 0);
      setAnnouncements(data || []);
      setError('');
    } catch (error) {
      console.error('Error fetching announcements:', error);
      setError('An unexpected error occurred');
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'emergency': return <AlertTriangle size={20} className="text-red-500" />;
      case 'maintenance': return <Wrench size={20} className="text-orange-500" />;
      case 'event': return <Calendar size={20} className="text-blue-500" />;
      default: return <Megaphone size={20} className="text-green-500" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 border-red-300';
      case 'high': return 'bg-orange-100 border-orange-300';
      case 'normal': return 'bg-blue-100 border-blue-300';
      default: return 'bg-gray-100 border-gray-300';
    }
  };

  const filteredAnnouncements = filter === 'all' 
    ? announcements 
    : announcements.filter(a => a.type === filter);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white px-6 pt-12 pb-6 flex items-center border-b border-gray-100 sticky top-0 z-20">
        <button onClick={() => onNavigate('map')} className="p-2 -ml-2 mr-2 hover:bg-gray-100 rounded-full transition-colors text-gray-700">
          <ChevronLeft size={24} />
        </button>
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-xl">
            <Bell className="text-blue-600" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
            <p className="text-gray-500 text-sm">Campus updates and news</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white px-6 py-4 border-b border-gray-100">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {['all', 'emergency', 'maintenance', 'event', 'general'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filter === tab
                  ? 'bg-[#601214] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
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
                  <div className="w-10 h-10 bg-gray-200 rounded-xl"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredAnnouncements.length > 0 ? (
          <div className="space-y-4">
            {filteredAnnouncements.map((announcement, index) => (
              <div 
                key={announcement.id || index}
                className={`bg-white rounded-2xl p-6 shadow-sm border-2 ${getPriorityColor(announcement.priority)} animate-enter`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    {getIcon(announcement.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-gray-900 text-lg">{announcement.title || 'Untitled Announcement'}</h3>
                      {announcement.priority === 'urgent' && (
                        <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                          URGENT
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 mb-4 leading-relaxed">{announcement.content}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock size={14} />
                        <span>{new Date(announcement.created_at).toLocaleDateString()}</span>
                      </div>
                      {announcement.expires_at && (
                        <div className="flex items-center gap-1">
                          <Calendar size={14} />
                          <span>Expires: {new Date(announcement.expires_at).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell size={24} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No announcements</h3>
            <p className="text-gray-500">
              {filter === 'all' 
                ? "No current announcements. Check back later!"
                : `No ${filter} announcements at this time.`
              }
            </p>
            <button
              onClick={fetchAnnouncements}
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

export default Announcements;