// components/Navigate.jsx
import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Play, RotateCcw } from 'lucide-react';
import { supabase } from '../supabaseClient';
import mapImage from '../assets/map.png'; // <- Add your map image here

const Navigate = ({ onNavigate }) => {
  const [route, setRoute] = useState({ start: '', destination: '' });
  const [buildings, setBuildings] = useState([]);
  const [userPosition, setUserPosition] = useState(null);
  const [availableStartPoints, setAvailableStartPoints] = useState([]);
  const [currentPathPoints, setCurrentPathPoints] = useState([]);
  const [isNavigating, setIsNavigating] = useState(false);

  const animationRef = useRef(null);
  const startTimeRef = useRef(null);

  const SPEED = 0.05;

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

  const orthoPath = (from, to) => ([from, { x: from.x, y: to.y }, to]);
  const nearestHub = (p) => roadHubs.reduce((a, b) => dist(p, a) < dist(p, b) ? a : b);

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
        setUserPosition({ x: a.x + (b.x - a.x) * r, y: a.y + (b.y - a.y) * r });
        animationRef.current = requestAnimationFrame(move);
        return;
      }
      walked += d;
    }

    setUserPosition(currentPathPoints.at(-1));
    setIsNavigating(false);
  };

  /* ================= INIT ================= */
  useEffect(() => {
    supabase.from('buildings').select('*').then(({ data }) => {
      setBuildings(data.map(b => ({
        ...b,
        x: b.coordinates.x,
        y: b.coordinates.y,
        width: b.coordinates.width,
        height: b.coordinates.height
      })));
    });

    const starts = [
      { name: 'Gate', x: 400, y: 50 },
      { name: 'Parking', x: 400, y: 520 }
    ];

    setAvailableStartPoints(starts);
    setUserPosition(starts[0]);
    setRoute(r => ({ ...r, start: starts[0].name }));
  }, []);

  /* ================= UI ================= */
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white p-4 shadow flex items-center">
        <button onClick={() => onNavigate('map')} className="mr-2">
          <ChevronLeft />
        </button>
        <h1 className="font-bold">Navigation</h1>
      </div>

      <div className="p-4 space-y-3">
        <select
          className="w-full p-2"
          value={route.destination}
          onChange={e => setRoute({ ...route, destination: e.target.value })}
        >
          <option value="">Select destination</option>
          {buildings.map(b => (
            <option key={b.id} value={b.building_name}>
              {b.building_name}
            </option>
          ))}
        </select>

        {!isNavigating ? (
          <button onClick={startNavigation} className="w-full bg-green-600 text-white p-2 rounded flex items-center justify-center gap-1">
            <Play size={16} /> Start
          </button>
        ) : (
          <button onClick={() => setIsNavigating(false)} className="w-full bg-red-600 text-white p-2 rounded flex items-center justify-center gap-1">
            <RotateCcw size={16} /> Stop
          </button>
        )}

        <svg width="800" height="600" className="bg-white rounded relative">
          {/* MAP IMAGE */}
          <image href={mapImage} x="0" y="0" width="800" height="600" />

          {/* WHITE ROADS */}
          <g stroke="#e5e7eb" strokeWidth="20">
            <line x1="20" y1="90" x2="780" y2="90" />
            <line x1="230" y1="90" x2="230" y2="590" />
            <line x1="400" y1="90" x2="400" y2="590" />
            <line x1="570" y1="90" x2="570" y2="590" />
            <line x1="230" y1="340" x2="570" y2="340" />
          </g>

          {/* PATH */}
          <polyline
            points={currentPathPoints.map(p => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="#10b981"
            strokeWidth="4"
            strokeDasharray="6 6"
          />

          {/* USER */}
          {userPosition && <circle cx={userPosition.x} cy={userPosition.y} r="6" fill="#2563eb" />}
        </svg>
      </div>
    </div>
  );
};

export default Navigate;
