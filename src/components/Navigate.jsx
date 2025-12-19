// components/Navigate.jsx

import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft, MapPin, Navigation2, Play, RotateCcw, Plus, Minus
} from 'lucide-react';
import { supabase } from '../supabaseClient';

const Navigate = ({ onNavigate }) => {
  const [route, setRoute] = useState({ start: '', destination: '' });
  const [routeInfo, setRouteInfo] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [userPosition, setUserPosition] = useState(null);
  const [availableStartPoints, setAvailableStartPoints] = useState([]);
  const [scale, setScale] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [buildings, setBuildings] = useState([]);
  const [currentPathPoints, setCurrentPathPoints] = useState([]);

  const animationRef = useRef(null);
  const startPanRef = useRef({ x: 0, y: 0 });
  const startTimeRef = useRef(null);

  const SIMULATED_SPEED = 0.05;

  /* ================= ROAD HUB NETWORK ================= */

  const roadHubs = [
    { id: 'entrance', x: 400, y: 90 },
    { id: 'quad', x: 400, y: 220 },
    { id: 'plaza', x: 400, y: 340 },
    { id: 'parking', x: 400, y: 470 },
    { id: 'admin', x: 230, y: 170 },
    { id: 'library', x: 230, y: 320 },
    { id: 'arts', x: 570, y: 170 },
    { id: 'res', x: 570, y: 380 },
    { id: 'sports', x: 230, y: 490 }
  ];

  const roadConnections = {
    entrance: ['quad'],
    quad: ['entrance', 'plaza', 'admin', 'arts'],
    plaza: ['quad', 'parking', 'library', 'res'],
    parking: ['plaza', 'sports'],
    admin: ['quad', 'library'],
    library: ['admin', 'plaza', 'sports'],
    arts: ['quad', 'res'],
    res: ['arts', 'plaza'],
    sports: ['library', 'parking']
  };

  /* ================= HELPERS ================= */

  const getDistance = (a, b) =>
    Math.hypot(b.x - a.x, b.y - a.y);

  // Snap any point onto nearest WHITE ROAD
  const snapToRoad = (point) => {
    const roads = [
      { type: 'horizontal', y: 90 },
      { type: 'horizontal', y: 340 },
      { type: 'vertical', x: 230 },
      { type: 'vertical', x: 400 },
      { type: 'vertical', x: 570 }
    ];

    let closest = null;
    let min = Infinity;

    roads.forEach(r => {
      const snapped = r.type === 'horizontal'
        ? { x: point.x, y: r.y }
        : { x: r.x, y: point.y };

      const d = getDistance(point, snapped);
      if (d < min) {
        min = d;
        closest = snapped;
      }
    });

    return closest;
  };

  const findNearestHub = (point) => {
    return roadHubs.reduce((a, b) =>
      getDistance(point, a) < getDistance(point, b) ? a : b
    );
  };

  const findPathThroughRoads = (startHub, endHub) => {
    const queue = [[startHub.id]];
    const visited = new Set([startHub.id]);

    while (queue.length) {
      const path = queue.shift();
      const last = path[path.length - 1];

      if (last === endHub.id) {
        return path.map(id => roadHubs.find(h => h.id === id));
      }

      for (const n of roadConnections[last] || []) {
        if (!visited.has(n)) {
          visited.add(n);
          queue.push([...path, n]);
        }
      }
    }
    return [];
  };

  /* ================= PATH CALCULATION (FIXED) ================= */

  const calculatePath = (start, destName) => {
    const dest = buildings.find(b => b.building_name === destName);
    if (!start || !dest) return [];

    const destPoint = {
      x: dest.x + dest.width / 2,
      y: dest.y + dest.height / 2
    };

    // ✅ FORCE ENTRY & EXIT ON WHITE ROAD
    const startRoad = snapToRoad(start);
    const destRoad = snapToRoad(destPoint);

    const startHub = findNearestHub(startRoad);
    const endHub = findNearestHub(destRoad);

    const roadPath = findPathThroughRoads(startHub, endHub);

    return [
      start,
      startRoad,
      ...roadPath,
      destRoad,
      destPoint
    ];
  };

  /* ================= NAVIGATION ================= */

  const startNavigation = () => {
    const path = calculatePath(userPosition, route.destination);
    if (!path.length) return;

    setCurrentPathPoints(path);
    setIsNavigating(true);
    setProgress(0);
    startTimeRef.current = null;

    let dist = 0;
    for (let i = 0; i < path.length - 1; i++) {
      dist += getDistance(path[i], path[i + 1]);
    }

    setRouteInfo({
      distance: `${Math.round(dist * 1.5)}m`,
      time: `${Math.ceil(dist / 60)} min`
    });

    animationRef.current = requestAnimationFrame(animateMovement);
  };

  const animateMovement = (time) => {
    if (!startTimeRef.current) startTimeRef.current = time;

    const elapsed = time - startTimeRef.current;
    const traveled = elapsed * SIMULATED_SPEED;
    const path = currentPathPoints;

    let total = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const seg = getDistance(path[i], path[i + 1]);
      if (total + seg >= traveled) {
        const t = (traveled - total) / seg;
        setUserPosition({
          x: path[i].x + (path[i + 1].x - path[i].x) * t,
          y: path[i].y + (path[i + 1].y - path[i].y) * t
        });
        setProgress((traveled / (total + seg)) * 100);
        animationRef.current = requestAnimationFrame(animateMovement);
        return;
      }
      total += seg;
    }

    setUserPosition(path[path.length - 1]);
    setIsNavigating(false);
  };

  /* ================= INIT ================= */

  useEffect(() => {
    supabase.from('buildings').select('*').then(({ data }) => {
      setBuildings(
        data.map(b => ({
          ...b,
          x: b.coordinates.x,
          y: b.coordinates.y,
          width: b.coordinates.width,
          height: b.coordinates.height
        }))
      );
    });

    const starts = [
      { id: 'gate', name: 'Main Gate', x: 400, y: 50 },
      { id: 'quad', name: 'Central Quad', x: 400, y: 220 },
      { id: 'parking', name: 'Parking Lot', x: 400, y: 520 }
    ];

    setAvailableStartPoints(starts);
    setUserPosition(starts[0]);
    setRoute(r => ({ ...r, start: starts[0].name }));
  }, []);

  /* ================= UI ================= */

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white p-4 shadow flex items-center">
        <button onClick={() => onNavigate('map')} className="mr-2">
          <ChevronLeft />
        </button>
        <h1 className="font-bold text-lg">Navigation</h1>
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-white p-4 rounded shadow">
          <select
            className="w-full mb-2"
            value={route.destination}
            onChange={e => setRoute({ ...route, destination: e.target.value })}
          >
            <option value="">Select Destination</option>
            {buildings.map(b => (
              <option key={b.id} value={b.building_name}>
                {b.building_name}
              </option>
            ))}
          </select>

          {!isNavigating ? (
            <button
              onClick={startNavigation}
              className="w-full bg-green-600 text-white py-2 rounded"
            >
              <Play size={16} /> Start
            </button>
          ) : (
            <button
              onClick={() => setIsNavigating(false)}
              className="w-full bg-red-600 text-white py-2 rounded"
            >
              <RotateCcw size={16} /> Stop
            </button>
          )}
        </div>

        <svg width="800" height="600" className="bg-gray-100 rounded">
          {/* WHITE ROADS */}
          <g stroke="#e5e7eb" strokeWidth="20" fill="none">
            <line x1="20" y1="90" x2="780" y2="90" />
            <line x1="230" y1="90" x2="230" y2="590" />
            <line x1="400" y1="90" x2="400" y2="590" />
            <line x1="570" y1="90" x2="570" y2="590" />
            <line x1="230" y1="340" x2="570" y2="340" />
          </g>

          {/* PATH */}
          {currentPathPoints.length > 0 && (
            <polyline
              points={currentPathPoints.map(p => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="#10b981"
              strokeWidth="4"
              strokeDasharray="8 6"
            />
          )}

          {/* USER */}
          {userPosition && (
            <circle cx={userPosition.x} cy={userPosition.y} r="6" fill="#2563eb" />
          )}
        </svg>
      </div>
    </div>
  );
};

export default Navigate;
