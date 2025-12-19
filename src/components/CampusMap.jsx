// components/CampusMap.jsx

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Menu, MapPin, Search, Navigation, Info as InfoIcon, Bell, Calendar, Compass, Plus, Minus, LogOut, Building2, BookOpen, Utensils, Dumbbell, FlaskRound, Shield, X, School, Users, Car, Home, Music, Palette, Wifi, ShoppingBag, Droplets } from 'lucide-react';
import { supabase } from '../supabaseClient';

const CampusMap = ({ onNavigate, user, onLogout }) => {
  const [activeBuilding, setActiveBuilding] = useState(null);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [scale, setScale] = useState(1.0);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showBuildingDetails, setShowBuildingDetails] = useState(false);
  const [mapBuildings, setMapBuildings] = useState([]);
  
  const startPanRef = useRef({ x: 0, y: 0 });
  const MIN_SCALE = 0.6;
  const MAX_SCALE = 3;

  // --- MATCHING MASTER PLAN LAYOUT ---
  const campusZones = {
    entrance: { x: 300, y: 10, width: 200, height: 80, label: 'MAIN ENTRANCE', color: '#ef4444' },
    administration: { x: 40, y: 100, width: 180, height: 140, label: 'ADMINISTRATION', color: '#7e22ce' },
    library: { x: 40, y: 260, width: 180, height: 120, label: 'LIBRARY DISTRICT', color: '#2563eb' },
    academic: { x: 240, y: 110, width: 320, height: 220, label: 'ACADEMIC CORE', color: '#1e40af' },
    student_life: { x: 240, y: 350, width: 320, height: 100, label: 'STUDENT PLAZA', color: '#dc2626' },
    arts: { x: 580, y: 100, width: 180, height: 140, label: 'ARTS & CULTURE', color: '#db2777' },
    residential: { x: 580, y: 260, width: 180, height: 300, label: 'RESIDENTIAL VILLAGE', color: '#ea580c' },
    sports: { x: 40, y: 400, width: 180, height: 180, label: 'SPORTS COMPLEX', color: '#059669' },
    parking: { x: 240, y: 470, width: 320, height: 110, label: 'MAIN PARKING', color: '#4b5563' }
  };
  
  useEffect(() => {
    const fetchMapBuildings = async () => {
      try {
        const { data, error } = await supabase.from('buildings').select('*').eq('is_active', true);
        if (error) throw error;
        if (data && data.length > 0) {
          setMapBuildings(data.map(b => ({
            id: b.id,
            x: b.coordinates?.x || 100, y: b.coordinates?.y || 100,
            width: b.coordinates?.width || 60, height: b.coordinates?.height || 40,
            label: b.building_code, name: b.building_name, type: b.building_type, color: b.color || '#601214'
          })));
        }
      } catch (e) { console.error('Error fetching buildings:', e); }
    };
    fetchMapBuildings();
  }, []); 

  const handleMouseDown = useCallback((e) => { e.preventDefault(); setIsDragging(true); startPanRef.current = { x: e.clientX - panX, y: e.clientY - panY }; }, [panX, panY]);
  const handleMouseMove = useCallback((e) => { if (isDragging) { setPanX(e.clientX - startPanRef.current.x); setPanY(e.clientY - startPanRef.current.y); } }, [isDragging]);
  const handleMouseUp = useCallback(() => setIsDragging(false), []);
  const zoomIn = () => setScale(p => Math.min(p + 0.2, MAX_SCALE));
  const zoomOut = () => setScale(p => Math.max(p - 0.2, MIN_SCALE));
  const resetView = () => { setScale(1.0); setPanX(0); setPanY(0); };

  const handleBuildingClick = (b) => { setActiveBuilding(b.name); setSelectedBuilding(b); setShowBuildingDetails(true); };
  const handleNavigateToBuilding = () => { if (selectedBuilding) { localStorage.setItem('selectedDestination', selectedBuilding.name); onNavigate('navigate'); } };

  const Tree = ({ x, y }) => (
    <g transform={`translate(${x}, ${y})`}>
      <circle cx="0" cy="0" r="10" fill="#16a34a" opacity="0.6" />
      <circle cx="3" cy="-5" r="8" fill="#22c55e" opacity="0.7" />
    </g>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex flex-col text-gray-900">
      <div className="bg-white/80 backdrop-blur-md px-6 pt-12 pb-4 flex items-center justify-between border-b border-gray-200/50 shadow-sm sticky top-0 z-50">
         <div className="relative">
             <button onClick={() => setShowMenu(!showMenu)} className="p-2 -ml-2 hover:bg-gray-100 rounded-full"><Menu size={24} /></button>
             {showMenu && <div className="absolute top-12 left-0 bg-white p-2 rounded-xl shadow-xl border min-w-48 z-50"><div className="px-4 py-2 border-b"><p className="font-bold">{user?.username || 'Guest'}</p></div><button onClick={onLogout} className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 flex gap-2"><LogOut size={16}/> Log Out</button></div>}
         </div>
         <div className="flex items-center"><MapPin className="text-[#601214] mr-2"/><span className="font-black text-[#601214]">CAMPUS NAVI</span></div>
         <div className="w-8"></div> 
      </div>

      <div className="flex-1 p-6 space-y-6">
        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-sm border flex gap-2">
           <div className="flex-1 bg-white border rounded-xl flex items-center px-3"><Search className="text-gray-400 mr-2" /><input type="text" placeholder="Search buildings..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full h-12 outline-none bg-transparent" /></div>
           <button onClick={resetView} className="bg-[#601214] text-white w-12 h-12 rounded-xl flex items-center justify-center"><Compass /></button>
        </div>

        <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 shadow-xl border border-gray-200/50">
           <div className="bg-gradient-to-br from-green-50/80 to-blue-50/80 rounded-2xl w-full h-80 relative overflow-hidden border-2 border-green-200/50 cursor-grab active:cursor-grabbing shadow-inner"
              onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
              <div style={{ transform: `translate(${panX}px, ${panY}px) scale(${scale})`, transformOrigin: '0 0', transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }} className="absolute inset-0">
                  <svg viewBox="0 0 800 600" width="800" height="600" className="drop-shadow-sm">
                     <defs>
                        <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse"><path d="M 100 0 L 0 0 0 100" fill="none" stroke="#d1d5db" strokeWidth="0.5" opacity="0.3"/></pattern>
                        <linearGradient id="roadGradient" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#9ca3af" /><stop offset="50%" stopColor="#d1d5db" /><stop offset="100%" stopColor="#9ca3af" /></linearGradient>
                     </defs>
                     <rect x="0" y="0" width="800" height="600" fill="#f0fdf4" />
                     <rect x="0" y="0" width="800" height="600" fill="url(#grid)" />
                     
                     {/* ZONES */}
                     {Object.values(campusZones).map((zone, i) => (
                       <g key={i}>
                         <rect x={zone.x} y={zone.y} width={zone.width} height={zone.height} fill={zone.color} fillOpacity="0.08" stroke={zone.color} strokeWidth="1" strokeDasharray="4 4" rx="12" />
                         <text x={zone.x + zone.width/2} y={zone.y + 15} textAnchor="middle" className="font-bold pointer-events-none" style={{ fontSize: '10px', fill: zone.color, opacity: 0.7 }}>{zone.label}</text>
                       </g>
                     ))}

                     {/* ROADS */}
                     <g className="opacity-90">
                        <path d="M20,90 L780,90 L780,590 L20,590 Z" fill="none" stroke="url(#roadGradient)" strokeWidth="25" strokeLinecap="round" />
                        <path d="M230,90 L230,590" fill="none" stroke="url(#roadGradient)" strokeWidth="18" />
                        <path d="M570,90 L570,590" fill="none" stroke="url(#roadGradient)" strokeWidth="18" />
                        <path d="M20,250 L230,250" fill="none" stroke="url(#roadGradient)" strokeWidth="15" />
                        <path d="M570,250 L780,250" fill="none" stroke="url(#roadGradient)" strokeWidth="15" />
                        <path d="M230,340 L570,340" fill="none" stroke="url(#roadGradient)" strokeWidth="15" />
                        <path d="M20,460 L780,460" fill="none" stroke="url(#roadGradient)" strokeWidth="15" />
                        <path d="M400,0 L400,90" fill="none" stroke="url(#roadGradient)" strokeWidth="30" />
                     </g>

                     {/* TREES */}
                     <g opacity="0.8">
                       <Tree x={350} y={50} /> <Tree x={450} y={50} /> <Tree x={400} y={220} />
                       <Tree x={100} y={80} /> <Tree x={700} y={80} /> <Tree x={100} y={450} />
                       <Tree x={700} y={450} /> <Tree x={230} y={300} /> <Tree x={570} y={300} />
                     </g>

                     {/* BUILDINGS */}
                     {mapBuildings.filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase())).map(b => (
                       <g key={b.id} onClick={() => handleBuildingClick(b)} className={`cursor-pointer transition-all hover:drop-shadow-lg ${activeBuilding === b.name ? 'opacity-100 drop-shadow-lg' : 'opacity-90'}`}>
                         <rect x={b.x} y={b.y} width={b.width} height={b.height} rx="8" fill="white" stroke={activeBuilding === b.name ? '#10b981' : '#e5e7eb'} strokeWidth="2" />
                         <rect x={b.x} y={b.y} width={b.width} height={b.height * 0.3} rx="8" fill={activeBuilding === b.name ? '#10b981' : b.color} fillOpacity="0.9" />
                         <text x={b.x + b.width/2} y={b.y + b.height/2 + 2} textAnchor="middle" className="font-bold pointer-events-none" style={{ fontSize: '10px', fill: '#1f2937' }}>{b.label}</text>
                       </g>
                     ))}

                     {/* YOU ARE HERE */}
                     <g transform="translate(400, 180)" className="animate-pulse">
                       <circle cx="10" cy="10" r="15" fill="#ef4444" opacity="0.3" /><circle cx="10" cy="10" r="10" fill="#dc2626" opacity="0.6" /><circle cx="10" cy="10" r="5" fill="#b91c1c" /><circle cx="10" cy="10" r="2" fill="white" />
                       <text x="30" y="15" textAnchor="start" className="font-bold" style={{ fontSize: '11px', fill: '#dc2626' }}>YOU ARE HERE</text>
                     </g>
                  </svg>
              </div>
              <div className="absolute top-4 right-4 flex flex-col space-y-3 z-10">
                 <button onClick={zoomIn} disabled={scale >= MAX_SCALE} className="w-10 h-10 bg-white/90 rounded-xl shadow-lg border flex items-center justify-center"><Plus size={20} /></button>
                 <button onClick={zoomOut} disabled={scale <= MIN_SCALE} className="w-10 h-10 bg-white/90 rounded-xl shadow-lg border flex items-center justify-center"><Minus size={20} /></button>
                 <button onClick={resetView} className="w-10 h-10 bg-white/90 rounded-xl shadow-lg border flex items-center justify-center"><Compass size={20} /></button>
              </div>
           </div>
        </div>
        
        {/* Footer Buttons */}
        <div className="grid grid-cols-4 gap-4"> 
             <button onClick={() => onNavigate('announcements')} className="p-4 bg-white rounded-xl shadow flex items-center gap-3"><Bell size={24} className="text-[#601214]"/><div className="text-left font-bold hidden sm:block">News</div></button>
             <button onClick={() => onNavigate('navigate')} className="p-4 bg-white rounded-xl shadow flex items-center gap-3"><Navigation size={24} className="text-[#601214]"/><div className="text-left font-bold hidden sm:block">Go</div></button>
             <button onClick={() => onNavigate('info')} className="p-4 bg-white rounded-xl shadow flex items-center gap-3"><InfoIcon size={24} className="text-[#601214]"/><div className="text-left font-bold hidden sm:block">Info</div></button>
             <button onClick={() => onNavigate('schedule')} className="p-4 bg-white rounded-xl shadow flex items-center gap-3"><Calendar size={24} className="text-[#601214]"/><div className="text-left font-bold hidden sm:block">Plan</div></button>
        </div>

        {/* Modal */}
        {showBuildingDetails && selectedBuilding && (
           <div className="fixed bottom-6 left-6 right-6 bg-white p-5 rounded-2xl shadow-xl border z-50 animate-enter">
              <div className="flex justify-between items-start mb-4">
                 <div><h3 className="font-bold text-xl">{selectedBuilding.name}</h3><span className="text-sm bg-[#601214] text-white px-2 py-1 rounded mt-1 inline-block">{selectedBuilding.label}</span></div>
                 <button onClick={() => setShowBuildingDetails(false)}><X className="text-gray-400"/></button>
              </div>
              <button onClick={handleNavigateToBuilding} className="w-full bg-[#601214] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"><Navigation size={18}/> Get Directions</button>
           </div>
        )}
      </div>
    </div>
  );
};

export default CampusMap;