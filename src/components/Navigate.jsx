// components/Navigate.jsx

import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, MapPin, Navigation2, Compass, Play, Pause, RotateCcw, Search, Plus, Minus } from 'lucide-react';
import { supabase } from '../supabaseClient';

const Navigate = ({ onNavigate }) => {
  const [route, setRoute] = useState({ start: '', destination: '' });
  const [routeInfo, setRouteInfo] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [userPosition, setUserPosition] = useState(null);
  const [availableStartPoints, setAvailableStartPoints] = useState([]);
  const [scale, setScale] = useState(1.0);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [buildings, setBuildings] = useState([]);
  
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentPathPoints, setCurrentPathPoints] = useState([]);

  const animationRef = useRef(null);
  const startPanRef = useRef({ x: 0, y: 0 });
  const SIMULATED_SPEED = 0.05;

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

  // Road Network for Pathfinding
  const roadNodes = [
    { id: 'entrance', x: 400, y: 50 },
    { id: 'top-left', x: 230, y: 90 },
    { id: 'top-center', x: 400, y: 90 },
    { id: 'top-right', x: 570, y: 90 },
    { id: 'left-upper', x: 230, y: 250 },
    { id: 'left-lower', x: 230, y: 340 },
    { id: 'center-upper', x: 400, y: 250 },
    { id: 'center', x: 400, y: 340 },
    { id: 'center-lower', x: 400, y: 460 },
    { id: 'right-upper', x: 570, y: 250 },
    { id: 'right-lower', x: 570, y: 340 },
    { id: 'bottom-left', x: 230, y: 460 },
    { id: 'bottom-center', x: 400, y: 520 },
    { id: 'bottom-right', x: 570, y: 460 }
  ];

  const roadConnections = {
    'entrance': ['top-center'],
    'top-left': ['top-center', 'left-upper'],
    'top-center': ['entrance', 'top-left', 'top-right', 'center-upper'],
    'top-right': ['top-center', 'right-upper'],
    'left-upper': ['top-left', 'left-lower'],
    'left-lower': ['left-upper', 'center', 'bottom-left'],
    'center-upper': ['top-center', 'center'],
    'center': ['center-upper', 'left-lower', 'right-lower', 'center-lower'],
    'center-lower': ['center', 'bottom-center'],
    'right-upper': ['top-right', 'right-lower'],
    'right-lower': ['right-upper', 'center', 'bottom-right'],
    'bottom-left': ['left-lower', 'bottom-center'],
    'bottom-center': ['bottom-left', 'center-lower', 'bottom-right'],
    'bottom-right': ['right-lower', 'bottom-center']
  };
  
  useEffect(() => {
    fetchBuildings();
    const savedDest = localStorage.getItem('selectedDestination');
    if (savedDest) { setRoute(p => ({ ...p, destination: savedDest })); localStorage.removeItem('selectedDestination'); }
    
    // Default Start Points relative to new map
    const startPoints = [
        { id: 'gate', name: 'Main Gate', x: 400, y: 50 },
        { id: 'admin', name: 'Administration', x: 130, y: 170 },
        { id: 'library', name: 'Library', x: 130, y: 320 },
        { id: 'student-plaza', name: 'Student Plaza', x: 400, y: 400 },
        { id: 'parking', name: 'Parking Lot', x: 400, y: 520 },
    ];
    setAvailableStartPoints(startPoints);
    setUserPosition(startPoints[0]);
    setRoute(p => ({ ...p, start: startPoints[0].name }));
  }, []);

  const fetchBuildings = async () => {
    try {
      const { data, error } = await supabase.from('buildings').select('*').eq('is_active', true);
      if (error) throw error;
      if (data) setBuildings(data.map(b => ({ ...b, x: b.coordinates?.x||100, y: b.coordinates?.y||100, width: b.coordinates?.width||60, height: b.coordinates?.height||40 })));
    } catch (error) { console.error(error); }
  };

  useEffect(() => { return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); }; }, []);

  const getDistance = (p1, p2) => Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));

  const findNearestRoadNode = (point) => {
    let nearest = roadNodes[0];
    let minDist = getDistance(point, nearest);
    roadNodes.forEach(node => {
      const dist = getDistance(point, node);
      if (dist < minDist) { minDist = dist; nearest = node; }
    });
    return nearest;
  };

  const bfsPath = (startNode, endNode) => {
    const queue = [[startNode.id]];
    const visited = new Set([startNode.id]);
    
    while (queue.length > 0) {
      const path = queue.shift();
      const current = path[path.length - 1];
      
      if (current === endNode.id) {
        return path.map(id => roadNodes.find(n => n.id === id));
      }
      
      const neighbors = roadConnections[current] || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push([...path, neighbor]);
        }
      }
    }
    return [startNode, endNode];
  };

  const calculatePath = (start, destName) => {
    if (!start || !destName) return [];
    const dest = buildings.find(b => b.building_name === destName);
    if (!dest) return [];
    
    const target = { x: dest.x + dest.width/2, y: dest.y + dest.height/2 };
    
    // Find nearest road nodes
    const startNode = findNearestRoadNode(start);
    const endNode = findNearestRoadNode(target);
    
    // Get road path
    const roadPath = bfsPath(startNode, endNode);
    
    // Create complete path: start -> nearest road -> road network -> nearest road -> destination
    const completePath = [start];
    if (getDistance(start, startNode) > 5) completePath.push(startNode);
    completePath.push(...roadPath.slice(1, -1));
    if (getDistance(endNode, target) > 5) completePath.push(endNode);
    completePath.push(target);
    
    return completePath;
  };

  const startNavigation = () => {
    const path = calculatePath(userPosition, route.destination);
    if (!path.length) return;
    setCurrentPathPoints(path);
    setIsNavigating(true); setIsPaused(false); setProgress(0); setStartTime(null); setElapsedTime(0);
    animationRef.current = requestAnimationFrame(animateMovement);
    
    const dist = getDistance(path[0], path[path.length-1]);
    setRouteInfo({ distance: `${Math.round(dist*1.5)}m`, time: `${Math.ceil(dist/60)} min` });
  };

  const animateMovement = (timestamp) => {
    if (!startTime) { setStartTime(timestamp - elapsedTime); animationRef.current = requestAnimationFrame(animateMovement); return; }
    if (isPaused) return;

    const path = currentPathPoints;
    let totalDist = 0; for(let i=0; i<path.length-1; i++) totalDist += getDistance(path[i], path[i+1]);

    const newElapsed = (timestamp - startTime);
    const traveled = newElapsed * SIMULATED_SPEED;
    const ratio = Math.min(1, traveled / totalDist);

    let currentDist = 0, x = path[0].x, y = path[0].y;
    for (let i = 0; i < path.length - 1; i++) {
      const segDist = getDistance(path[i], path[i + 1]);
      if (currentDist + segDist > traveled) {
        const segProg = (traveled - currentDist) / segDist;
        x = path[i].x + (path[i+1].x - path[i].x) * segProg;
        y = path[i].y + (path[i+1].y - path[i].y) * segProg;
        break;
      }
      currentDist += segDist;
    }

    if (ratio >= 1) { setUserPosition(path[path.length - 1]); setProgress(100); setIsNavigating(false); setElapsedTime(0); cancelAnimationFrame(animationRef.current); return; }
    setUserPosition({ x, y, name: 'Moving...' }); setProgress(ratio * 100); setElapsedTime(newElapsed);
    animationRef.current = requestAnimationFrame(animateMovement);
  };

  const handleMouseDown = (e) => { setIsDragging(true); startPanRef.current = { x: e.clientX - panX, y: e.clientY - panY }; };
  const handleMouseMove = (e) => { if (isDragging) { setPanX(e.clientX - startPanRef.current.x); setPanY(e.clientY - startPanRef.current.y); } };
  const handleMouseUp = () => { setIsDragging(false); };
  const zoomIn = () => setScale(s => Math.min(s + 0.2, 3));
  const zoomOut = () => setScale(s => Math.max(s - 0.2, 0.5));
  const resetView = () => { setScale(1); setPanX(0); setPanY(0); };

  // Tree Component for decoration
  const Tree = ({ x, y }) => (
    <g transform={`translate(${x}, ${y})`}>
      <circle cx="0" cy="0" r="10" fill="#16a34a" opacity="0.6" />
      <circle cx="3" cy="-5" r="8" fill="#22c55e" opacity="0.7" />
    </g>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
       <div className="bg-white p-4 shadow-sm flex items-center sticky top-0 z-20">
          <button onClick={() => onNavigate('map')} className="p-2 mr-2 hover:bg-gray-100 rounded-full"><ChevronLeft /></button>
          <h1 className="font-bold text-xl">Navigation</h1>
       </div>

       <div className="flex-1 p-6 space-y-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border space-y-3">
             <div className="flex items-center gap-2"><MapPin size={16} className="text-gray-400"/><select className="w-full bg-transparent p-2 border-b outline-none" value={route.start} onChange={e => { const pt = availableStartPoints.find(p => p.name === e.target.value); if(pt) { setUserPosition(pt); setRoute(r => ({...r, start: pt.name})); } }}>{availableStartPoints.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}</select></div>
             <div className="flex items-center gap-2"><Navigation2 size={16} className="text-gray-400"/><select className="w-full bg-transparent p-2 border-b outline-none" value={route.destination} onChange={e => setRoute({...route, destination: e.target.value})}><option value="">Destination...</option>{buildings.map(b => <option key={b.id} value={b.building_name}>{b.building_name}</option>)}</select></div>
             {routeInfo && <div className="flex justify-between text-xs font-bold text-gray-500 bg-gray-50 p-2 rounded"><span>DIST: {routeInfo.distance}</span><span>TIME: {routeInfo.time}</span></div>}
             {!isNavigating ? <button onClick={startNavigation} className="w-full bg-[#601214] text-white py-3 rounded-lg font-bold flex justify-center items-center gap-2"><Play size={16}/> Start</button> : <button onClick={() => { setIsNavigating(false); setProgress(0); }} className="w-full bg-red-600 text-white py-3 rounded-lg font-bold flex justify-center items-center gap-2"><RotateCcw size={16}/> Stop</button>}
          </div>

          <div className="bg-white rounded-xl shadow-lg border overflow-hidden h-96 relative cursor-move" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
             <div style={{ transform: `translate(${panX}px, ${panY}px) scale(${scale})`, transformOrigin: '0 0' }} className="absolute inset-0">
                <svg width="800" height="600" viewBox="0 0 800 600">
                   <defs>
                      <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse"><path d="M 100 0 L 0 0 0 100" fill="none" stroke="#e5e7eb" strokeWidth="0.5"/></pattern>
                      <linearGradient id="roadGradient" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#9ca3af" /><stop offset="50%" stopColor="#d1d5db" /><stop offset="100%" stopColor="#9ca3af" /></linearGradient>
                   </defs>
                   <rect width="800" height="600" fill="#f0fdf4" />
                   <rect width="800" height="600" fill="url(#grid)" />
                   
                   {/* ZONES */}
                   {Object.values(campusZones).map((z, i) => (
                     <g key={i}>
                       <rect x={z.x} y={z.y} width={z.width} height={z.height} fill={z.color} fillOpacity="0.08" stroke={z.color} strokeWidth="1" strokeDasharray="4 4" rx="12" />
                       <text x={z.x + z.width/2} y={z.y + 15} textAnchor="middle" fontSize="10" fill={z.color} fontWeight="bold" opacity="0.7" style={{ textTransform: 'uppercase', letterSpacing: '1px' }}>{z.label}</text>
                     </g>
                   ))}

                   {/* ROADS */}
                   <g opacity="0.6">
                      <path d="M20,90 L780,90 L780,590 L20,590 Z" fill="none" stroke="url(#roadGradient)" strokeWidth="25" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M230,90 L230,590" fill="none" stroke="url(#roadGradient)" strokeWidth="18" />
                      <path d="M570,90 L570,590" fill="none" stroke="url(#roadGradient)" strokeWidth="18" />
                      <path d="M20,250 L230,250" fill="none" stroke="url(#roadGradient)" strokeWidth="15" />
                      <path d="M570,250 L780,250" fill="none" stroke="url(#roadGradient)" strokeWidth="15" />
                      <path d="M230,340 L570,340" fill="none" stroke="url(#roadGradient)" strokeWidth="15" />
                      <path d="M20,460 L780,460" fill="none" stroke="url(#roadGradient)" strokeWidth="15" />
                      <path d="M400,0 L400,90" fill="none" stroke="url(#roadGradient)" strokeWidth="30" />
                   </g>

                   {/* TREES & DECORATION */}
                   <g opacity="0.8">
                      <Tree x={350} y={50} /> <Tree x={450} y={50} />
                      <rect x={380} y={200} width="40" height="40" fill="#22c55e" opacity="0.2" rx="20" />
                      <Tree x={400} y={220} />
                      <Tree x={100} y={80} /> <Tree x={700} y={80} />
                      <Tree x={100} y={450} /> <Tree x={700} y={450} />
                      <Tree x={230} y={300} /> <Tree x={570} y={300} />
                   </g>

                   {/* BUILDINGS */}
                   {buildings.map(b => (
                     <g key={b.id}>
                       <rect x={b.x} y={b.y} width={b.width} height={b.height} rx="4" fill="white" stroke="#e5e7eb" strokeWidth="1" />
                       <rect x={b.x} y={b.y} width={b.width} height={b.height * 0.3} rx="4" fill={b.color} fillOpacity="0.9" />
                       <text x={b.x+b.width/2} y={b.y+b.height/2+2} textAnchor="middle" fontSize="9" fill="#1f2937" fontWeight="bold">{b.building_code}</text>
                     </g>
                   ))}
                   
                   {/* NAVIGATION PATH */}
                   {isNavigating && currentPathPoints.length > 0 && (
                     <g>
                       <polyline 
                         points={currentPathPoints.map(p => `${p.x},${p.y}`).join(' ')} 
                         fill="none" 
                         stroke="#10b981" 
                         strokeWidth="5" 
                         strokeDasharray="8,8" 
                         strokeLinecap="round"
                         opacity="0.8"
                       />
                       {currentPathPoints.map((p, i) => (
                         <circle key={i} cx={p.x} cy={p.y} r="3" fill="#10b981" opacity="0.6" />
                       ))}
                     </g>
                   )}
                   
                   {/* USER POSITION */}
                   {userPosition && (
                     <g transform={`translate(${userPosition.x}, ${userPosition.y})`}>
                       <circle r="8" fill="#2563eb" stroke="white" strokeWidth="2" className="animate-pulse"/>
                       <circle r="16" fill="none" stroke="#2563eb" strokeWidth="1" strokeOpacity="0.3"/>
                     </g>
                   )}
                </svg>
             </div>
             <div className="absolute bottom-4 right-4 flex gap-2">
               <button onClick={() => setScale(s => Math.min(s + 0.2, 3))} className="bg-white p-2 rounded shadow border hover:bg-gray-50"><Plus size={16}/></button>
               <button onClick={() => setScale(s => Math.max(s - 0.2, 0.5))} className="bg-white p-2 rounded shadow border hover:bg-gray-50"><Minus size={16}/></button>
               <button onClick={resetView} className="bg-white p-2 rounded shadow border hover:bg-gray-50"><Compass size={16}/></button>
             </div>
          </div>
       </div>
    </div>
  );
};

export default Navigate;