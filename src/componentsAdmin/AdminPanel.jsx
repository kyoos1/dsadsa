// componentsAdmin/AdminPanel.jsx
import React, { useState, useEffect } from 'react';
// ADD Building2 here
import { Settings, Bell, Calendar, Plus, Trash2, X, BarChart3, Shield, LogOut, Building2 } from 'lucide-react'; 
import { supabase } from '../supabaseClient';

const AdminPanel = ({ onNavigate, user }) => {
  const [activeTab, setActiveTab] = useState('announcements');
  const [announcements, setAnnouncements] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [databaseError, setDatabaseError] = useState('');

  // RLS Helper (Preserved)
  const isRlsError = (err) => {
    if (!err) return false;
    const msg = (err.message || '').toString().toLowerCase();
    return msg.includes('violates row-level security') || 
           msg.includes('row-level security') || 
           msg.includes('permission denied') ||
           err.code === '42501';
  };

  // Forms (Preserved)
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);

  const [announcementForm, setAnnouncementForm] = useState({
    title: '', content: '', type: 'general', priority: 'normal', expires_at: ''
  });
  const [eventForm, setEventForm] = useState({
    title: '', description: '', location: '', building_id: '', 
    start_time: '', end_time: '', event_type: 'academic'
  });

  // Check Admin Status (Preserved)
  useEffect(() => {
    if (user) checkAdminStatus();
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) { setIsAdmin(false); setLoading(false); return; }
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (error || !data || data.role !== 'admin') {
        setIsAdmin(false);
      } else {
        setIsAdmin(true);
        fetchAllData();
      }
    } catch (error) {
      console.error('Error checking admin:', error);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllData = async () => {
    try {
      // Fetch Announcements (Preserved)
      const { data: annData } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
      setAnnouncements(annData || []);
      
      // Fetch Events (Preserved)
      const { data: evtData } = await supabase.from('events').select('*').order('start_time', { ascending: true });
      setEvents(evtData || []);
    } catch (error) {
      console.error('Fetch error:', error);
    }
  };

  // --- HANDLERS (Preserved) ---
  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    if (!announcementForm.title.trim() || !announcementForm.content.trim()) return;
    setLoading(true);
    try {
        let expiresAt = null;
        if (announcementForm.expires_at) expiresAt = new Date(announcementForm.expires_at).toISOString();
        
        const { error } = await supabase.from('announcements').insert([{
            title: announcementForm.title, content: announcementForm.content,
            type: announcementForm.type, priority: announcementForm.priority,
            expires_at: expiresAt, created_by: user.id, is_active: true
        }]);
        if (error) throw error;
        setShowAnnouncementForm(false);
        fetchAllData();
    } catch (err) { alert(err.message); } finally { setLoading(false); }
  };

  const handleDeleteAnnouncement = async (id) => {
      if(!confirm('Delete this announcement?')) return;
      try { await supabase.from('announcements').delete().eq('id', id); fetchAllData(); }
      catch(e) { alert(e.message); }
  };

  const toggleAnnouncementStatus = async (id, current) => {
      try { await supabase.from('announcements').update({is_active: !current}).eq('id', id); fetchAllData(); }
      catch(e) { alert(e.message); }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
        const { error } = await supabase.from('events').insert([{
            title: eventForm.title, description: eventForm.description, location: eventForm.location,
            start_time: new Date(eventForm.start_time).toISOString(), end_time: new Date(eventForm.end_time).toISOString(),
            event_type: eventForm.event_type, is_active: true
        }]);
        if (error) throw error;
        setShowEventForm(false);
        fetchAllData();
    } catch (err) { alert(err.message); } finally { setLoading(false); }
  };

  const handleDeleteEvent = async (id) => {
      if(!confirm('Delete this event?')) return;
      try { await supabase.from('events').delete().eq('id', id); fetchAllData(); } catch(e) { alert(e.message); }
  };

  const toggleEventStatus = async (id, current) => {
      try { await supabase.from('events').update({is_active: !current}).eq('id', id); fetchAllData(); } catch(e) { alert(e.message); }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onNavigate('login');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#601214]"></div></div>;
  
  if (!isAdmin) return (
    <div className="min-h-screen flex items-center justify-center flex-col p-6">
        <Shield size={48} className="text-red-500 mb-4"/>
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="text-gray-500 mb-4">You do not have admin permissions.</p>
        <button onClick={() => onNavigate('map')} className="text-[#601214] font-bold">Return to Map</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex flex-col text-gray-900">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md px-6 pt-12 pb-6 flex items-center justify-between border-b border-gray-200/50 shadow-sm sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-[#601214] to-[#8b1a1d] p-2 rounded-xl shadow-lg">
            <Settings className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
            <p className="text-gray-500 text-sm">Manage campus content</p>
          </div>
        </div>
        
        <div className="flex gap-2">
           {/* === NEW CONNECTED BUTTON === */}
          <button 
            onClick={() => onNavigate('building-manager')}
            className="bg-white text-gray-700 border border-gray-200 px-4 py-2 rounded-xl font-semibold hover:bg-gray-50 hover:shadow-md transition-all duration-200 flex items-center gap-2"
          >
            <Building2 size={18} />
            Manage Buildings
          </button>

          <button 
            onClick={handleLogout}
            className="bg-gradient-to-br from-[#601214] to-[#8b1a1d] text-white px-4 py-2 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 flex items-center gap-2"
          >
            <LogOut size={18} />
            Log Out
          </button>
        </div>
      </div>

      {/* Tabs (Preserved) */}
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-200/50">
        <div className="flex overflow-x-auto no-scrollbar px-6">
          {[
            { id: 'announcements', label: 'Announcements', icon: Bell },
            { id: 'events', label: 'Events', icon: Calendar },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                activeTab === tab.id ? 'border-[#601214] text-[#601214]' : 'border-transparent text-gray-500'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area (Preserved) */}
      <div className="flex-1 p-6 space-y-6">
        
        {/* ANNOUNCEMENTS TAB (Preserved) */}
        {activeTab === 'announcements' && (
          <div className="space-y-6 animate-enter">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Manage Announcements</h2>
              <button onClick={() => setShowAnnouncementForm(true)} className="bg-[#601214] text-white px-4 py-2 rounded-xl flex items-center gap-2"><Plus size={18}/> New</button>
            </div>

            {showAnnouncementForm && (
                <div className="bg-white p-6 rounded-2xl shadow-lg mb-6">
                    <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                        <input placeholder="Title" value={announcementForm.title} onChange={e=>setAnnouncementForm({...announcementForm, title: e.target.value})} className="w-full border p-2 rounded" required />
                        <textarea placeholder="Content" value={announcementForm.content} onChange={e=>setAnnouncementForm({...announcementForm, content: e.target.value})} className="w-full border p-2 rounded" required />
                        <div className="flex gap-2">
                            <select value={announcementForm.type} onChange={e=>setAnnouncementForm({...announcementForm, type:e.target.value})} className="border p-2 rounded"><option value="general">General</option><option value="emergency">Emergency</option></select>
                            <select value={announcementForm.priority} onChange={e=>setAnnouncementForm({...announcementForm, priority:e.target.value})} className="border p-2 rounded"><option value="normal">Normal</option><option value="high">High</option></select>
                        </div>
                        <div className="flex gap-2"><button type="submit" className="bg-[#601214] text-white px-4 py-2 rounded">Create</button><button type="button" onClick={()=>setShowAnnouncementForm(false)} className="bg-gray-200 px-4 py-2 rounded">Cancel</button></div>
                    </form>
                </div>
            )}

            <div className="bg-white rounded-2xl shadow overflow-hidden">
                {announcements.map(a => (
                    <div key={a.id} className="p-4 border-b flex justify-between items-start">
                        <div><h3 className="font-bold">{a.title}</h3><p className="text-sm text-gray-600">{a.content}</p></div>
                        <div className="flex gap-2">
                            <button onClick={()=>toggleAnnouncementStatus(a.id, a.is_active)} className="text-blue-600">{a.is_active ? 'Pause' : 'Activate'}</button>
                            <button onClick={()=>handleDeleteAnnouncement(a.id)} className="text-red-600"><Trash2 size={16}/></button>
                        </div>
                    </div>
                ))}
            </div>
          </div>
        )}

        {/* EVENTS TAB (Preserved) */}
        {activeTab === 'events' && (
             <div className="space-y-6 animate-enter">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold">Manage Events</h2>
                    <button onClick={() => setShowEventForm(true)} className="bg-[#601214] text-white px-4 py-2 rounded-xl flex items-center gap-2"><Plus size={18}/> New</button>
                </div>
                {showEventForm && (
                     <div className="bg-white p-6 rounded-2xl shadow-lg mb-6">
                        <form onSubmit={handleCreateEvent} className="space-y-4">
                            <input placeholder="Title" value={eventForm.title} onChange={e=>setEventForm({...eventForm, title: e.target.value})} className="w-full border p-2 rounded" required />
                            <div className="grid grid-cols-2 gap-4">
                                <input type="datetime-local" value={eventForm.start_time} onChange={e=>setEventForm({...eventForm, start_time: e.target.value})} className="border p-2 rounded" required />
                                <input type="datetime-local" value={eventForm.end_time} onChange={e=>setEventForm({...eventForm, end_time: e.target.value})} className="border p-2 rounded" required />
                            </div>
                             <div className="flex gap-2"><button type="submit" className="bg-[#601214] text-white px-4 py-2 rounded">Create</button><button type="button" onClick={()=>setShowEventForm(false)} className="bg-gray-200 px-4 py-2 rounded">Cancel</button></div>
                        </form>
                     </div>
                )}
                <div className="bg-white rounded-2xl shadow overflow-hidden">
                    {events.map(e => (
                        <div key={e.id} className="p-4 border-b flex justify-between">
                            <div><h3 className="font-bold">{e.title}</h3><p className="text-xs">{new Date(e.start_time).toLocaleString()}</p></div>
                            <button onClick={()=>handleDeleteEvent(e.id)} className="text-red-600"><Trash2 size={16}/></button>
                        </div>
                    ))}
                </div>
             </div>
        )}

        {/* ANALYTICS TAB (Preserved) */}
        {activeTab === 'analytics' && (
             <div className="grid grid-cols-2 gap-6 animate-enter">
                <div className="bg-white p-6 rounded-2xl shadow border flex items-center gap-4">
                    <div className="bg-blue-100 p-3 rounded-xl"><Bell className="text-blue-600"/></div>
                    <div><h3 className="text-2xl font-bold">{announcements.length}</h3><p className="text-gray-500">Announcements</p></div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow border flex items-center gap-4">
                    <div className="bg-green-100 p-3 rounded-xl"><Calendar className="text-green-600"/></div>
                    <div><h3 className="text-2xl font-bold">{events.length}</h3><p className="text-gray-500">Events</p></div>
                </div>
             </div>
        )}

      </div>
    </div>
  );
};

export default AdminPanel;