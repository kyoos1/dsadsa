// componentsAdmin/BuildingManager.jsx

import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Building2, Plus, Trash2, Edit2, X, Eye, EyeOff, Maximize, Minus, Compass } from 'lucide-react';
import { supabase } from '../supabaseClient';

const BuildingManager = ({ onNavigate, user }) => {
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // Map State
  const [scale, setScale] = useState(1.0);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDraggingMap, setIsDraggingMap] = useState(false);
  const [isDraggingBuilding, setIsDraggingBuilding] = useState(false);
  
  const mapRef = useRef(null);
  const startPanRef = useRef({ x: 0, y: 0 });
  const buildingDragOffsetRef = useRef({ x: 0, y: 0 });

  const [formData, setFormData] = useState({
    building_code: '',
    building_name: '',
    building_type: 'academic',
    description: '',
    color: '#601214',
    coordinates: { x: 360, y: 200, width: 80, height: 60 },
    is_active: true
  });

  const buildingTypes = [
    { value: 'academic', label: 'Academic Building' },
    { value: 'admin', label: 'Administration' },
    { value: 'library', label: 'Library' },
    { value: 'student', label: 'Student Services' },
    { value: 'sports', label: 'Sports Facility' },
    { value: 'arts', label: 'Arts & Culture' },
    { value: 'dorm', label: 'Residential/Dorm' },
    { value: 'cafeteria', label: 'Cafeteria/Dining' },
    { value: 'parking', label: 'Parking' },
    { value: 'medical', label: 'Medical/Health' },
    { value: 'entrance', label: 'Entrance/Gate' },
    { value: 'facility', label: 'Facility/Utility' },
  ];

  // --- NEW MASTER PLAN LAYOUT (Non-Overlapping) ---
  const campusZones = {
    // Top Section
    entrance: { x: 300, y: 10, width: 200, height: 80, label: 'MAIN ENTRANCE', color: '#ef4444' },
    
    // West Wing (Left)
    administration: { x: 40, y: 100, width: 180, height: 140, label: 'ADMINISTRATION', color: '#7e22ce' },
    library: { x: 40, y: 260, width: 180, height: 120, label: 'LIBRARY DISTRICT', color: '#2563eb' },
    
    // Central Core (Middle)
    academic: { x: 240, y: 110, width: 320, height: 220, label: 'ACADEMIC CORE', color: '#1e40af' },
    student_life: { x: 240, y: 350, width: 320, height: 100, label: 'STUDENT PLAZA', color: '#dc2626' },
    
    // East Wing (Right)
    arts: { x: 580, y: 100, width: 180, height: 140, label: 'ARTS & CULTURE', color: '#db2777' },
    residential: { x: 580, y: 260, width: 180, height: 300, label: 'RESIDENTIAL VILLAGE', color: '#ea580c' },
    
    // South Complex (Bottom)
    sports: { x: 40, y: 400, width: 180, height: 180, label: 'SPORTS COMPLEX', color: '#059669' },
    parking: { x: 240, y: 470, width: 320, height: 110, label: 'MAIN PARKING', color: '#4b5563' }
  };

  useEffect(() => {
    fetchBuildings();
  }, []);

  const fetchBuildings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('buildings').select('*').order('building_name');
      if (error) throw error;
      setBuildings(data || []);
      setError('');
    } catch (error) {
      setError('Failed to load buildings: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Map Logic ---
  const getSVGPoint = (clientX, clientY) => {
    if (!mapRef.current) return { x: 0, y: 0 };
    const rect = mapRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left - panX) / scale,
      y: (clientY - rect.top - panY) / scale
    };
  };

  const handleMouseDownMap = (e) => {
    if (isDraggingBuilding) return;
    e.preventDefault();
    setIsDraggingMap(true);
    startPanRef.current = { x: e.clientX - panX, y: e.clientY - panY };
  };

  const handleMouseDownBuilding = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDraggingBuilding(true);
    const worldPos = getSVGPoint(e.clientX, e.clientY);
    buildingDragOffsetRef.current = {
      x: worldPos.x - formData.coordinates.x,
      y: worldPos.y - formData.coordinates.y
    };
  };

  const handleMouseMove = (e) => {
    if (isDraggingBuilding) {
       const worldPos = getSVGPoint(e.clientX, e.clientY);
       // Snap to 5px grid
       const snap = 5;
       let newX = Math.round((worldPos.x - buildingDragOffsetRef.current.x) / snap) * snap;
       let newY = Math.round((worldPos.y - buildingDragOffsetRef.current.y) / snap) * snap;
       setFormData(prev => ({ ...prev, coordinates: { ...prev.coordinates, x: newX, y: newY } }));
    } else if (isDraggingMap) {
      setPanX(e.clientX - startPanRef.current.x);
      setPanY(e.clientY - startPanRef.current.y);
    }
  };

  const handleMouseUp = () => { setIsDraggingMap(false); setIsDraggingBuilding(false); };
  const zoomIn = () => setScale(s => Math.min(s + 0.2, 3));
  const zoomOut = () => setScale(s => Math.max(s - 0.2, 0.5));
  const resetView = () => { setScale(1); setPanX(0); setPanY(0); };

  // --- Form Logic ---
  const handleInputChange = (field, value) => {
    if (field.includes('coordinates.')) {
      const coordField = field.split('.')[1];
      setFormData({ ...formData, coordinates: { ...formData.coordinates, [coordField]: parseInt(value) || 0 } });
    } else {
      setFormData({ ...formData, [field]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.building_code.trim() || !formData.building_name.trim()) return setError('Code and Name required');

    setLoading(true);
    try {
      const payload = {
        building_code: formData.building_code.trim(),
        building_name: formData.building_name.trim(),
        building_type: formData.building_type,
        description: formData.description.trim(),
        color: formData.color,
        coordinates: formData.coordinates, 
        is_active: formData.is_active,
        created_by: user?.id
      };

      if (editingId) {
        const { error } = await supabase.from('buildings').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('buildings').insert([payload]);
        if (error) throw error;
      }
      resetForm();
      fetchBuildings();
    } catch (error) { setError(error.message); } finally { setLoading(false); }
  };

  const handleEdit = (building) => {
    setFormData({
      building_code: building.building_code,
      building_name: building.building_name,
      building_type: building.building_type,
      description: building.description || '',
      color: building.color || '#601214',
      coordinates: building.coordinates || { x: 360, y: 200, width: 80, height: 60 },
      is_active: building.is_active
    });
    setEditingId(building.id);
    setShowForm(true);
    if (building.coordinates) { setPanX(-building.coordinates.x * scale + 400); setPanY(-building.coordinates.y * scale + 300); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this building?')) return;
    try { await supabase.from('buildings').delete().eq('id', id); fetchBuildings(); } catch (error) { setError(error.message); }
  };

  const handleToggleStatus = async (b) => {
      try { await supabase.from('buildings').update({ is_active: !b.is_active }).eq('id', b.id); fetchBuildings(); } catch (e) { setError(e.message); }
  };

  const resetForm = () => {
    setFormData({ building_code: '', building_name: '', building_type: 'academic', description: '', color: '#601214', coordinates: { x: 360, y: 200, width: 80, height: 60 }, is_active: true });
    setEditingId(null); setShowForm(false); setError('');
  };

  // --- Visual Helper Components ---
  const Tree = ({ x, y }) => (
    <g transform={`translate(${x}, ${y})`}>
      <circle cx="0" cy="0" r="10" fill="#16a34a" opacity="0.6" />
      <circle cx="3" cy="-5" r="8" fill="#22c55e" opacity="0.7" />
    </g>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
       <div className="bg-white px-6 pt-12 pb-6 flex items-center border-b border-gray-100 sticky top-0 z-20">
        <button onClick={() => onNavigate('admin')} className="p-2 -ml-2 mr-2 hover:bg-gray-100 rounded-full text-gray-700"><ChevronLeft size={24} /></button>
        <div className="flex items-center gap-3">
          <div className="bg-[#601214] p-2 rounded-xl"><Building2 className="text-white" size={24} /></div>
          <div><h1 className="text-2xl font-bold text-gray-900">Building Manager</h1><p className="text-gray-500 text-sm">Interactive Map Editor</p></div>
        </div>
      </div>

      <div className="flex-1 p-6 flex flex-col lg:flex-row gap-6">
        {/* Left Column */}
        <div className="w-full lg:w-1/3 flex flex-col gap-6 order-2 lg:order-1">
          {error && <div className="p-3 bg-red-100 text-red-700 rounded-lg">{error}</div>}

          {!showForm && (
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 h-full flex flex-col">
               <div className="flex justify-between items-center mb-4">
                 <h2 className="text-xl font-bold">Buildings</h2>
                 <button onClick={() => setShowForm(true)} className="bg-[#601214] text-white px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-bold"><Plus size={16} /> New</button>
               </div>
               <div className="flex-1 overflow-y-auto pr-2 space-y-3 max-h-[600px]">
                 {buildings.map(b => (
                   <div key={b.id} className="bg-white p-3 rounded-lg border border-gray-200 flex justify-between items-center hover:shadow-md transition-all">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded text-white flex items-center justify-center font-bold text-xs" style={{ backgroundColor: b.color }}>{b.building_code}</div>
                         <div className="truncate w-32"><h4 className="font-bold text-sm truncate">{b.building_name}</h4><p className="text-xs text-gray-500 capitalize">{b.building_type}</p></div>
                      </div>
                      <div className="flex gap-1">
                         <button onClick={() => handleToggleStatus(b)} className={`p-1.5 rounded ${b.is_active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>{b.is_active ? <Eye size={14}/> : <EyeOff size={14}/>}</button>
                         <button onClick={() => handleEdit(b)} className="p-1.5 bg-blue-50 text-blue-600 rounded"><Edit2 size={14} /></button>
                         <button onClick={() => handleDelete(b.id)} className="p-1.5 bg-red-50 text-red-600 rounded"><Trash2 size={14} /></button>
                      </div>
                   </div>
                 ))}
                 {buildings.length === 0 && !loading && <p className="text-center text-gray-400 text-sm">No buildings yet.</p>}
               </div>
            </div>
          )}

          {showForm && (
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
              <div className="flex justify-between mb-4"><h3 className="font-bold text-lg">{editingId ? 'Edit' : 'New'}</h3><button onClick={resetForm}><X size={20} className="text-gray-400" /></button></div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <input placeholder="Code (SCI)" value={formData.building_code} onChange={e => handleInputChange('building_code', e.target.value)} className="border p-2 rounded-lg text-sm" required />
                  <input placeholder="Name (Science Hall)" value={formData.building_name} onChange={e => handleInputChange('building_name', e.target.value)} className="border p-2 rounded-lg text-sm" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <select value={formData.building_type} onChange={e => handleInputChange('building_type', e.target.value)} className="border p-2 rounded-lg text-sm">
                     {buildingTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <div className="flex items-center gap-2 border rounded-lg p-1">
                     <input type="color" value={formData.color} onChange={e => handleInputChange('color', e.target.value)} className="w-8 h-8 cursor-pointer rounded" />
                     <span className="text-xs text-gray-500">{formData.color}</span>
                  </div>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                   <div className="flex justify-between items-center mb-2"><p className="text-xs font-bold text-blue-800 uppercase">Map Position</p><p className="text-[10px] text-blue-600 italic">Drag box on map</p></div>
                   <div className="grid grid-cols-4 gap-2">
                      <div><label className="text-[10px] text-gray-500">X</label><input type="number" value={formData.coordinates.x} onChange={e => handleInputChange('coordinates.x', e.target.value)} className="w-full border p-1 rounded text-sm bg-white" /></div>
                      <div><label className="text-[10px] text-gray-500">Y</label><input type="number" value={formData.coordinates.y} onChange={e => handleInputChange('coordinates.y', e.target.value)} className="w-full border p-1 rounded text-sm bg-white" /></div>
                      <div><label className="text-[10px] text-gray-500">W</label><input type="number" value={formData.coordinates.width} onChange={e => handleInputChange('coordinates.width', e.target.value)} className="w-full border p-1 rounded text-sm bg-white" /></div>
                      <div><label className="text-[10px] text-gray-500">H</label><input type="number" value={formData.coordinates.height} onChange={e => handleInputChange('coordinates.height', e.target.value)} className="w-full border p-1 rounded text-sm bg-white" /></div>
                   </div>
                </div>
                <div className="flex gap-2 pt-2">
                   <button type="submit" disabled={loading} className="flex-1 bg-[#601214] text-white py-2 rounded-lg font-bold text-sm">{loading ? 'Saving...' : 'Save'}</button>
                   <button type="button" onClick={resetForm} className="px-4 bg-gray-200 text-gray-700 rounded-lg font-bold text-sm">Cancel</button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Right Column: Map */}
        <div className="w-full lg:w-2/3 h-[600px] bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden relative flex flex-col order-1 lg:order-2">
           <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur px-3 py-1 rounded-full border shadow text-xs font-bold text-gray-600">{showForm ? '🛠️ DRAG & DROP MODE' : '👁️ VIEW MODE'}</div>
           <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
              <button onClick={zoomIn} className="w-8 h-8 bg-white rounded-lg shadow flex items-center justify-center border hover:bg-gray-50"><Maximize size={16}/></button>
              <button onClick={zoomOut} className="w-8 h-8 bg-white rounded-lg shadow flex items-center justify-center border hover:bg-gray-50"><Minus size={16}/></button>
              <button onClick={resetView} className="w-8 h-8 bg-white rounded-lg shadow flex items-center justify-center border hover:bg-gray-50"><Compass size={16}/></button>
           </div>

           <div className="w-full h-full bg-[#f0fdf4] cursor-move relative overflow-hidden"
             onMouseDown={handleMouseDownMap} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} ref={mapRef}>
              <div style={{ transform: `translate(${panX}px, ${panY}px) scale(${scale})`, transformOrigin: '0 0', transition: isDraggingMap || isDraggingBuilding ? 'none' : 'transform 0.2s ease-out' }} className="absolute top-0 left-0 w-full h-full">
                  <svg width="800" height="600" viewBox="0 0 800 600" className="bg-[#f0fdf4] shadow-sm">
                      <defs>
                        <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse"><path d="M 100 0 L 0 0 0 100" fill="none" stroke="#d1d5db" strokeWidth="0.5" opacity="0.3"/></pattern>
                        <linearGradient id="roadGradient" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#9ca3af" /><stop offset="50%" stopColor="#d1d5db" /><stop offset="100%" stopColor="#9ca3af" /></linearGradient>
                      </defs>
                      <rect width="800" height="600" fill="url(#grid)" />

                      {/* --- 1. ZONES (Bottom Layer) --- */}
                      {Object.values(campusZones).map((zone, i) => (
                        <g key={i}>
                            <rect x={zone.x} y={zone.y} width={zone.width} height={zone.height} fill={zone.color} fillOpacity="0.08" stroke={zone.color} strokeWidth="1" strokeDasharray="4 4" rx="12" />
                            <text x={zone.x + zone.width/2} y={zone.y + 15} textAnchor="middle" fontSize="10" fill={zone.color} fontWeight="bold" opacity="0.6" style={{textTransform: 'uppercase', letterSpacing: '1px'}}>{zone.label}</text>
                        </g>
                      ))}

                      {/* --- 2. ROADS (Between Zones) --- */}
                      <g className="opacity-90">
                        {/* Main Ring Road - Flows around the zones */}
                        <path d="M20,90 L780,90 L780,590 L20,590 Z" fill="none" stroke="url(#roadGradient)" strokeWidth="25" strokeLinecap="round" strokeLinejoin="round" />
                        
                        {/* Vertical Avenues */}
                        <path d="M230,90 L230,590" fill="none" stroke="url(#roadGradient)" strokeWidth="18" />
                        <path d="M570,90 L570,590" fill="none" stroke="url(#roadGradient)" strokeWidth="18" />
                        
                        {/* Horizontal Streets */}
                        <path d="M20,250 L230,250" fill="none" stroke="url(#roadGradient)" strokeWidth="15" /> {/* Admin/Lib Separator */}
                        <path d="M570,250 L780,250" fill="none" stroke="url(#roadGradient)" strokeWidth="15" /> {/* Arts/Res Separator */}
                        <path d="M230,340 L570,340" fill="none" stroke="url(#roadGradient)" strokeWidth="15" /> {/* Acad/Student Separator */}
                        <path d="M20,460 L780,460" fill="none" stroke="url(#roadGradient)" strokeWidth="15" /> {/* Lower Cross Road */}
                        
                        {/* Entrance Drive */}
                        <path d="M400,0 L400,90" fill="none" stroke="url(#roadGradient)" strokeWidth="30" />
                      </g>

                      {/* --- 3. TREES & DECORATION --- */}
                      <g opacity="0.8">
                         {/* Entrance Line */}
                         <Tree x={350} y={50} /> <Tree x={450} y={50} />
                         {/* Central Green */}
                         <rect x={380} y={200} width="40" height="40" fill="#22c55e" opacity="0.2" rx="20" />
                         <Tree x={400} y={220} />
                         {/* Border Trees */}
                         <Tree x={100} y={80} /> <Tree x={700} y={80} /> <Tree x={100} y={450} /> <Tree x={700} y={450} />
                         <Tree x={230} y={300} /> <Tree x={570} y={300} />
                      </g>

                      {/* --- 4. EXISTING BUILDINGS (Ghosts) --- */}
                      {buildings.filter(b => b.id !== editingId).map(b => (
                         <g key={b.id} opacity="0.7">
                            <rect x={b.coordinates?.x||0} y={b.coordinates?.y||0} width={b.coordinates?.width||50} height={b.coordinates?.height||50} fill={b.color} rx="4" stroke="white" strokeWidth="1" />
                            <text x={(b.coordinates?.x||0)+(b.coordinates?.width||0)/2} y={(b.coordinates?.y||0)+(b.coordinates?.height||0)/2} textAnchor="middle" fontSize="9" fill="white" fontWeight="bold" style={{pointerEvents:'none'}}>{b.building_code}</text>
                         </g>
                      ))}

                      {/* --- 5. DRAGGABLE BUILDING --- */}
                      {showForm && (
                         <g onMouseDown={handleMouseDownBuilding} className="cursor-grab active:cursor-grabbing hover:opacity-100" style={{ cursor: isDraggingBuilding ? 'grabbing' : 'grab' }}>
                            <rect x={formData.coordinates.x-4} y={formData.coordinates.y-4} width={formData.coordinates.width+8} height={formData.coordinates.height+8} fill="none" stroke="#2563eb" strokeWidth="2" strokeDasharray="4 4" rx="6" className="animate-pulse" />
                            <rect x={formData.coordinates.x} y={formData.coordinates.y} width={formData.coordinates.width} height={formData.coordinates.height} fill={formData.color} rx="4" stroke="white" strokeWidth="2" className="shadow-2xl" />
                            <text x={formData.coordinates.x+formData.coordinates.width/2} y={formData.coordinates.y+formData.coordinates.height/2+4} textAnchor="middle" fill="white" fontWeight="bold" fontSize="11" className="pointer-events-none">{formData.building_code || 'NEW'}</text>
                         </g>
                      )}
                  </svg>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default BuildingManager;