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

  useEffect(() => {
    fetchBuildings();
    const savedDest = localStorage.getItem('selectedDestination');
    if (savedDest) { setRoute(p => ({ ...p, destination: savedDest })); localStorage.removeItem('selectedDestination'); }
    
    // Default Start Points relative to new map
    const startPoints = [
        { id: 'gate', name: 'Main Gate', x: 400, y: 50 },
        { id: 'quad', name: 'Central Quad', x: 400, y: 220 },
        { id: 'parking', name: 'Parking Lot', x: 400, y: 520 },
    ];
    setAvailableStartPoints(startPoints);
    setUserPosition(startPoints[0]);
    setRoute(p => ({ ...p, start: startPoints[0].name }));
  }, []);

  const fetchBuildings = async () => {
    try {
      const { data } = await supabase.from('buildings').select('*').eq('is_active', true);
      if (data) setBuildings(data.map(b => ({ ...b, x: b.coordinates?.x||100, y: b.coordinates?.y||100, width: b.coordinates?.width||60, height: b.coordinates?.height||40 })));
    } catch (error) { console.error(error); }
  };

  useEffect(() => { return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); }; }, []);

  const getDistance = (p1, p2) => Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));

  // Check if a line segment intersects with a building
  const lineIntersectsBuilding = (p1, p2, building) => {
    const bx1 = building.x;
    const by1 = building.y;
    const bx2 = building.x + building.width;
    const by2 = building.y + building.height;
    
    // Expand hitbox slightly for safety
    const padding = 5;
    const px1 = bx1 - padding;
    const py1 = by1 - padding;
    const px2 = bx2 + padding;
    const py2 = by2 + padding;

    // Check if line segment intersects with building rectangle
    return lineSegmentIntersectsRect(p1, p2, px1, py1, px2, py2);
  };

  const lineSegmentIntersectsRect = (p1, p2, rx1, ry1, rx2, ry2) => {
    const { x: x1, y: y1 } = p1;
    const { x: x2, y: y2 } = p2;

    // Check if either endpoint is inside the rectangle
    if (x1 >= rx1 && x1 <= rx2 && y1 >= ry1 && y1 <= ry2) return true;
    if (x2 >= rx1 && x2 <= rx2 && y2 >= ry1 && y2 <= ry2) return true;

    // Check intersection with each side of the rectangle
    if (lineSegmentIntersectsSegment(p1, p2, { x: rx1, y: ry1 }, { x: rx2, y: ry1 })) return true;
    if (lineSegmentIntersectsSegment(p1, p2, { x: rx2, y: ry1 }, { x: rx2, y: ry2 })) return true;
    if (lineSegmentIntersectsSegment(p1, p2, { x: rx2, y: ry2 }, { x: rx1, y: ry2 })) return true;
    if (lineSegmentIntersectsSegment(p1, p2, { x: rx1, y: ry2 }, { x: rx1, y: ry1 })) return true;

    return false;
  };

  const lineSegmentIntersectsSegment = (p1, p2, p3, p4) => {
    const ccw = (A, B, C) => (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
    return ccw(p1, p3, p4) !== ccw(p2, p3, p4) && ccw(p1, p2, p3) !== ccw(p1, p2, p4);
  };

  // Get building corner points for waypoint generation
  const getBuildingCorners = (building) => {
    const padding = 8;
    return [
      { x: building.x - padding, y: building.y - padding },
      { x: building.x + building.width + padding, y: building.y - padding },
      { x: building.x + building.width + padding, y: building.y + building.height + padding },
      { x: building.x - padding, y: building.y + building.height + padding }
    ];
  };

  // A* pathfinding algorithm
  const findPath = (start, goal) => {
    // If direct path is clear, use it
    const directBlocked = buildings.some(b => lineIntersectsBuilding(start, goal, b));
    if (!directBlocked) return [start, goal];

    // Generate waypoints from building corners
    const waypoints = [start];
    buildings.forEach(b => {
      getBuildingCorners(b).forEach(corner => waypoints.push(corner));
    });
    waypoints.push(goal);

    // Build graph of connected waypoints
    const graph = {};
    waypoints.forEach((wp, i) => {
      graph[i] = [];
      waypoints.forEach((other, j) => {
        if (i !== j && !buildings.some(b => lineIntersectsBuilding(wp, other, b))) {
          graph[i].push(j);
        }
      });
    });

    // Dijkstra's algorithm
    const distances = new Array(waypoints.length).fill(Infinity);
    const previous = new Array(waypoints.length).fill(null);
    const unvisited = new Set(waypoints.map((_, i) => i));
    
    distances[0] = 0;
    let current = 0;

    while (unvisited.size > 0) {
      let nearest = null;
      let minDist = Infinity;
      
      unvisited.forEach(i => {
        if (distances[i] < minDist) {
          minDist = distances[i];
          nearest = i;
        }
      });

      if (nearest === null || nearest === waypoints.length - 1) break;
      
      unvisited.delete(nearest);
      
      graph[nearest].forEach(neighbor => {
        if (unvisited.has(neighbor)) {
          const dist = distances[nearest] + getDistance(waypoints[nearest], waypoints[neighbor]);
          if (dist < distances[neighbor]) {
            distances[neighbor] = dist;
            previous[neighbor] = nearest;
          }
        }
      });
    }

    // Reconstruct path
    const path = [];
    let current_idx = waypoints.length - 1;
    while (current_idx !== null) {
      path.unshift(waypoints[current_idx]);
      current_idx = previous[current_idx];
    }

    return path.length > 1 ? path : [start, goal];
  };

  const calculatePath = (start, destName) => {
    if (!start || !destName) return [];
    const dest = buildings.find(b => b.building_name === destName);
    if (!dest) return [];
    
    const target = { x: dest.x + dest.width/2, y: dest.y + dest.height/2 };
    return findPath(start, target);
  };

  const startNavigation = () => {
    const path = calculatePath(userPosition, route.destination);
    if (!path.length) return;
    setCurrentPathPoints(path);
    setIsNavigating(true); setIsPaused(false); setProgress(0); setStartTime(null); setElapsedTime(0);
    animationRef.current = requestAnimationFrame(animateMovement);
    
    let totalDist = 0;
    for(let i=0; i<path.length-1; i++) totalDist += getDistance(path[i], path[i+1]);
    setRouteInfo({ distance: `${Math.round(totalDist*1.5)}m`, time: `${Math.ceil(totalDist/60)} min` });
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
  const handleMouseUp = () => setIsDragging(false);

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
                   <rect width="800" height="600" fill="#f9fafb" />
                   <rect width="800" height="600" fill="url(#grid)" />
                   
                   {Object.values(campusZones).map((z, i) => <rect key={i} x={z.x} y={z.y} width={z.width} height={z.height} fill={z.color} fillOpacity="0.1" rx="10"/>)}
                   
                   <g opacity="0.6">
                      <path d="M20,90 L780,90 L780,590 L20,590 Z" fill="none" stroke="url(#roadGradient)" strokeWidth="25" strokeLinecap="round" />
                      <path d="M230,90 L230,590" fill="none" stroke="url(#roadGradient)" strokeWidth="18" />
                      <path d="M570,90 L570,590" fill="none" stroke="url(#roadGradient)" strokeWidth="18" />
                      <path d="M230,340 L570,340" fill="none" stroke="url(#roadGradient)" strokeWidth="15" />
                   </g>

                   {buildings.map(b => <g key={b.id}><rect x={b.x} y={b.y} width={b.width} height={b.height} rx="4" fill={b.color} stroke="white" strokeWidth="1"/><text x={b.x+b.width/2} y={b.y+b.height/2} textAnchor="middle" fontSize="9" fill="white">{b.building_code}</text></g>)}
                   
                   {isNavigating && currentPathPoints.length > 0 && <polyline points={currentPathPoints.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#10b981" strokeWidth="4" strokeDasharray="5,5" />}
                   {userPosition && <g transform={`translate(${userPosition.x}, ${userPosition.y})`}><circle r="6" fill="#2563eb" stroke="white" strokeWidth="2" className="animate-pulse"/><circle r="12" fill="none" stroke="#2563eb" strokeOpacity="0.5"/></g>}
                </svg>
             </div>
             <div className="absolute bottom-4 right-4 flex gap-2"><button onClick={() => setScale(s => Math.min(s + 0.2, 3))} className="bg-white p-2 rounded shadow border"><Plus size={16}/></button><button onClick={() => setScale(s => Math.max(s - 0.2, 0.5))} className="bg-white p-2 rounded shadow border"><Minus size={16}/></button></div>
          </div>
       </div>
    </div>
  );
};

export default Navigate;