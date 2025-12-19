// components/Navigate.jsx

import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Play, RotateCcw, Plus, Minus, Compass } from 'lucide-react';
import { supabase } from '../supabaseClient';

const Navigate = ({ onNavigate }) => {
  const [route, setRoute] = useState({ start: '', destination: '' });
  const [buildings, setBuildings] = useState([]);
  const [userPosition, setUserPosition] = useState(null);
  const [availableStartPoints, setAvailableStartPoints] = useState([]);
  const [currentPathPoints, setCurrentPathPoints] = useState([]);
  const [isNavigating, setIsNavigating] = useState(false);
  
  // Map controls
  const [scale, setScale] = useState(1.0);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  
  const MIN_SCALE = 0.6;
  const MAX_SCALE = 3;

  const animationRef = useRef(null);
  const startTimeRef = useRef(null);
  const startPanRef = useRef({ x: 0, y: 0 });

  const SPEED = 0.05;

  /* ================= CAMPUS ZONES ================= */
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

  /* ================= WHITE ROAD HUBS ================= */
  const roadHubs = [
    { id: 'top', x: 400, y: 90 },
    { id: 'mid', x: 400, y: 340 },
    { id: 'bottom', x: 400, y: 470 },
    { id: 'left', x: 230, y: 340 },
    { id: 'right', x: 570, y: 340 }
  ];

  const roadConnections = {
    top: ['mid'],
    mid: ['top', 'bottom', 'left', 'right'],
    bottom: ['mid'],
    left: ['mid'],
    right: ['mid']
  };

  /* ================= HELPERS ================= */
  const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);

  const snapToRoad = (p) => {
    const roads = [
      { type: 'h', y: 90 },
      { type: 'h', y: 340 },
      { type: 'v', x: 230 },
      { type: 'v', x: 400 },
      { type: 'v', x: 570 }
    ];

    let best = null;
    let min = Infinity;

    roads.forEach(r => {
      const s = r.type === 'h'
        ? { x: p.x, y: r.y }
        : { x: r.x, y: p.y };

      const d = dist(p, s);
      if (d < min) {
        min = d;
        best = s;
      }
    });

    return best;
  };

  const orthoPath = (from, to) => ([
    from,
    { x: from.x, y: to.y },
    to
  ]);

  const nearestHub = (p) =>
    roadHubs.reduce((a, b) => dist(p, a) < dist(p, b) ? a : b);

  const bfsRoadPath = (start, end) => {
    const q = [[start.id]];
    const seen = new Set([start.id]);

    while (q.length) {
      const path = q.shift();
      const last = path[path.length - 1];

      if (last === end.id) {
        return path.map(id => roadHubs.find(h => h.id === id));
      }

      for (const n of roadConnections[last] || []) {
        if (!seen.has(n)) {
          seen.add(n);
          q.push([...path, n]);
        }
      }
    }
    return [];
  };

  /* ================= PATH CALCULATION ================= */
  const calculatePath = (start, destName) => {
    const dest = buildings.find(b => b.building_name === destName);
    if (!start || !dest) return [];

    const destPoint = {
      x: dest.x + dest.width / 2,
      y: dest.y + dest.height / 2
    };

    const startRoad = snapToRoad(start);
    const destRoad = snapToRoad(destPoint);

    const startHub = nearestHub(startRoad);
    const endHub = nearestHub(destRoad);

    const roadPath = bfsRoadPath(startHub, endHub);

    return [
      ...orthoPath(start, startRoad),
      ...roadPath,
      ...orthoPath(destRoad, destPoint).slice(1)
    ];
  };

  /* ================= NAVIGATION ================= */
  const startNavigation = () => {
    const path = calculatePath(userPosition, route.destination);
    if (!path.length) return;

    setCurrentPathPoints(path);
    setIsNavigating(true);
    startTimeRef.current = null;

    animationRef.current = requestAnimationFrame(move);
  };

  const move = (t) => {
    if (!startTimeRef.current) startTimeRef.current = t;

    const elapsed = (t - startTimeRef.current) * SPEED;
    let walked = 0;

    for (let i = 0; i < currentPathPoints.length - 1; i++) {
      const a = currentPathPoints[i];
      const b = currentPathPoints[i + 1];
      const d = dist(a, b);

      if (walked + d >= elapsed) {
        const r = (elapsed - walked) / d;
        setUserPosition({
          x: a.x + (b.x - a.x) * r,
          y: a.y + (b.y - a.y) * r
        });
        animationRef.current = requestAnimationFrame(move);
        return;
      }
      walked += d;
    }

    setUserPosition(currentPathPoints.at(-1));
    setIsNavigating(false);
  };

  /* ================= MAP CONTROLS ================= */
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    startPanRef.current = { x: e.clientX - panX, y: e.clientY - panY };
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPanX(e.clientX - startPanRef.current.x);
      setPanY(e.clientY - startPanRef.current.y);
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const zoomIn = () => setScale(p => Math.min(p + 0.2, MAX_SCALE));
  const zoomOut = () => setScale(p => Math.max(p - 0.2, MIN_SCALE));
  const resetView = () => { setScale(1.0); setPanX(0); setPanY(0); };

  /* ================= INIT ================= */
  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase.from('buildings').select('*');
      setBuildings(data.map(b => ({
        ...b,
        x: b.coordinates.x,
        y: b.coordinates.y,
        width: b.coordinates.width,
        height: b.coordinates.height
      })));
    };
    fetchData();

    const starts = [
      { name: 'Main Gate', x: 400, y: 50 },
      { name: 'Parking Area', x: 400, y: 520 }
    ];

    setAvailableStartPoints(starts);
    setUserPosition(starts[0]);
    setRoute(r => ({ ...r, start: starts[0].name }));
  }, []);

  /* ================= VISUAL HELPERS ================= */
  const Tree = ({ x, y }) => (
    <g transform={`translate(${x}, ${y})`}>
      <circle cx="0" cy="0" r="10" fill="#16a34a" opacity="0.6" />
      <circle cx="3" cy="-5" r="8" fill="#22c55e" opacity="0.7" />
    </g>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex flex-col">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md px-6 pt-12 pb-6 flex items-center border-b border-gray-200/50 sticky top-0 z-20">
        <button onClick={() => onNavigate('map')} className="p-2 -ml-2 mr-2 hover:bg-gray-100 rounded-full">
          <ChevronLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Navigate Campus</h1>
          <p className="text-gray-500 text-sm">Find your way around</p>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6">
        {/* Navigation Controls */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-sm border border-gray-200/50 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Starting Point</label>
            <select
              className="w-full p-3 border border-gray-200 rounded-xl bg-white focus:border-[#601214] focus:ring-1 focus:ring-[#601214] outline-none"
              value={route.start}
              onChange={e => {
                const start = availableStartPoints.find(s => s.name === e.target.value);
                setRoute({ ...route, start: e.target.value });
                setUserPosition(start);
              }}
            >
              {availableStartPoints.map(s => (
                <option key={s.name} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Destination</label>
            <select
              className="w-full p-3 border border-gray-200 rounded-xl bg-white focus:border-[#601214] focus:ring-1 focus:ring-[#601214] outline-none"
              value={route.destination}
              onChange={e => setRoute({ ...route, destination: e.target.value })}
            >
              <option value="">Select destination</option>
              {buildings.map(b => (
                <option key={b.id} value={b.building_name}>
                  {b.building_name} ({b.building_code})
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3">
            {!isNavigating ? (
              <button
                onClick={startNavigation}
                disabled={!route.destination}
                className="flex-1 bg-[#601214] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#4a0d0e] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Play size={18} /> Start Navigation
              </button>
            ) : (
              <button
                onClick={() => setIsNavigating(false)}
                className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-700 transition-all"
              >
                <RotateCcw size={18} /> Stop Navigation
              </button>
            )}
          </div>
        </div>

        {/* Styled Map */}
        <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 shadow-xl border border-gray-200/50">
          <div className="bg-gradient-to-br from-green-50/80 to-blue-50/80 rounded-2xl w-full h-96 relative overflow-hidden border-2 border-green-200/50 cursor-grab active:cursor-grabbing shadow-inner"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}>
            
            <div style={{
              transform: `translate(${panX}px, ${panY}px) scale(${scale})`,
              transformOrigin: '0 0',
              transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }} className="absolute inset-0">
              <svg viewBox="0 0 800 600" width="800" height="600" className="drop-shadow-sm">
                <defs>
                  <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
                    <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#d1d5db" strokeWidth="0.5" opacity="0.3"/>
                  </pattern>
                  <linearGradient id="roadGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#9ca3af" />
                    <stop offset="50%" stopColor="#d1d5db" />
                    <stop offset="100%" stopColor="#9ca3af" />
                  </linearGradient>
                </defs>

                {/* Background */}
                <rect x="0" y="0" width="800" height="600" fill="#f0fdf4" />
                <rect x="0" y="0" width="800" height="600" fill="url(#grid)" />

                {/* ZONES */}
                {Object.values(campusZones).map((zone, i) => (
                  <g key={i}>
                    <rect x={zone.x} y={zone.y} width={zone.width} height={zone.height} 
                      fill={zone.color} fillOpacity="0.08" stroke={zone.color} 
                      strokeWidth="1" strokeDasharray="4 4" rx="12" />
                    <text x={zone.x + zone.width/2} y={zone.y + 15} textAnchor="middle" 
                      className="font-bold pointer-events-none" 
                      style={{ fontSize: '10px', fill: zone.color, opacity: 0.7 }}>
                      {zone.label}
                    </text>
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
                {buildings.map(b => (
                  <g key={b.id} className="opacity-90">
                    <rect x={b.x} y={b.y} width={b.width} height={b.height} rx="8" 
                      fill="white" stroke="#e5e7eb" strokeWidth="2" />
                    <rect x={b.x} y={b.y} width={b.width} height={b.height * 0.3} rx="8" 
                      fill={b.color || '#601214'} fillOpacity="0.9" />
                    <text x={b.x + b.width/2} y={b.y + b.height/2 + 2} textAnchor="middle" 
                      className="font-bold pointer-events-none" 
                      style={{ fontSize: '10px', fill: '#1f2937' }}>
                      {b.building_code}
                    </text>
                  </g>
                ))}

                {/* NAVIGATION PATH */}
                {currentPathPoints.length > 0 && (
                  <polyline
                    points={currentPathPoints.map(p => `${p.x},${p.y}`).join(' ')}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="4"
                    strokeDasharray="8 4"
                    className="animate-pulse"
                  />
                )}

                {/* USER POSITION */}
                {userPosition && (
                  <g transform={`translate(${userPosition.x}, ${userPosition.y})`}>
                    <circle cx="0" cy="0" r="15" fill="#2563eb" opacity="0.3" className="animate-pulse" />
                    <circle cx="0" cy="0" r="10" fill="#3b82f6" opacity="0.6" />
                    <circle cx="0" cy="0" r="5" fill="#1e40af" />
                    <circle cx="0" cy="0" r="2" fill="white" />
                  </g>
                )}
              </svg>
            </div>

            {/* Map Controls */}
            <div className="absolute top-4 right-4 flex flex-col space-y-3 z-10">
              <button onClick={zoomIn} disabled={scale >= MAX_SCALE} 
                className="w-10 h-10 bg-white/90 rounded-xl shadow-lg border flex items-center justify-center hover:bg-white disabled:opacity-50">
                <Plus size={20} />
              </button>
              <button onClick={zoomOut} disabled={scale <= MIN_SCALE} 
                className="w-10 h-10 bg-white/90 rounded-xl shadow-lg border flex items-center justify-center hover:bg-white disabled:opacity-50">
                <Minus size={20} />
              </button>
              <button onClick={resetView} 
                className="w-10 h-10 bg-white/90 rounded-xl shadow-lg border flex items-center justify-center hover:bg-white">
                <Compass size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Status */}
        {isNavigating && (
          <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4 animate-enter">
            <div className="flex items-center gap-3">
              <div className="animate-pulse">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
              <div>
                <p className="font-bold text-green-900">Navigation Active</p>
                <p className="text-sm text-green-700">Follow the green path to your destination</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Navigate;