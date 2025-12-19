import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, MapPin, Navigation2, Clock, Footprints, Compass, User, Building2, Play, Pause, RotateCcw, Move, CornerUpRight, Search, Plus, Minus } from 'lucide-react';

const Navigate = ({ onNavigate, buildings }) => {
  const [route, setRoute] = useState({
    start: '',
    destination: ''
  });
  const [routeInfo, setRouteInfo] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [stepByStep, setStepByStep] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [userPosition, setUserPosition] = useState(null);
  const [isSettingStart, setIsSettingStart] = useState(false);
  const [availableStartPoints, setAvailableStartPoints] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [scale, setScale] = useState(1.0);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  
  // New state for tracking animation
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentPathPoints, setCurrentPathPoints] = useState([]);

  const animationRef = useRef(null);
  const mapRef = useRef(null);
  const startPanRef = useRef({ x: 0, y: 0 });

  // --- Navigation Constants ---
  const SIMULATED_SPEED = 0.05;
  const MIN_SCALE = 0.6;
  const MAX_SCALE = 3;
  const ZOOM_STEP = 0.2;

  // Campus layout matching CampusMap.jsx
  const campusZones = {
    academic: { x: 80, y: 50, width: 280, height: 120, label: 'ACADEMIC ZONE', color: '#1e40af' },
    student: { x: 30, y: 180, width: 150, height: 100, label: 'STUDENT LIFE', color: '#dc2626' },
    sports: { x: 200, y: 290, width: 200, height: 120, label: 'SPORTS ZONE', color: '#059669' },
    admin: { x: 300, y: 150, width: 120, height: 80, label: 'ADMIN ZONE', color: '#7e22ce' },
    residential: { x: 400, y: 50, width: 80, height: 200, label: 'RESIDENTIAL', color: '#ea580c' },
    arts: { x: 400, y: 270, width: 80, height: 140, label: 'ARTS ZONE', color: '#db2777' }
  };

  // Available starting points (key locations on campus)
  const startPoints = [
    { id: 'current', name: 'Current Location', x: 250, y: 250, type: 'special' },
    { id: 'main_gate', name: 'Main Gate', x: 80, y: 400, type: 'entrance' },
    { id: 'quad_center', name: 'Quad Center', x: 250, y: 250, type: 'landmark' },
    { id: 'library_entrance', name: 'Library Entrance', x: 175, y: 155, type: 'building' },
    { id: 'cafeteria_entrance', name: 'Cafeteria Entrance', x: 85, y: 255, type: 'building' },
    { id: 'student_center', name: 'Student Center', x: 85, y: 185, type: 'building' },
    { id: 'gym_entrance', name: 'Gym Entrance', x: 255, y: 335, type: 'building' },
    { id: 'admin_entrance', name: 'Admin Entrance', x: 295, y: 145, type: 'building' }
  ];

  // Building data matching CampusMap.jsx
  const mapBuildings = [
    // Academic Zone
    { id: 'CCS', x: 100, y: 70, width: 70, height: 50, label: 'CCS', name: 'College of Computer Studies', type: 'academic', color: '#1e40af', zone: 'academic' },
    { id: 'SCI', x: 190, y: 70, width: 70, height: 50, label: 'SCI', name: 'Science Labs', type: 'science', color: '#7c3aed', zone: 'academic' },
    { id: 'CBA', x: 100, y: 140, width: 70, height: 50, label: 'CBA', name: 'Business Admin', type: 'academic', color: '#1e40af', zone: 'academic' },
    { id: 'CED', x: 190, y: 140, width: 70, height: 50, label: 'CED', name: 'Education', type: 'academic', color: '#1e40af', zone: 'academic' },
    { id: 'ENG', x: 280, y: 70, width: 70, height: 50, label: 'ENG', name: 'Engineering', type: 'academic', color: '#1e40af', zone: 'academic' },
    { id: 'MATH', x: 280, y: 140, width: 70, height: 50, label: 'MATH', name: 'Mathematics', type: 'academic', color: '#1e40af', zone: 'academic' },
    
    // Student Life Zone
    { id: 'STUD', x: 50, y: 200, width: 80, height: 60, label: 'STUD', name: 'Student Center', type: 'student', color: '#dc2626', zone: 'student' },
    { id: 'CAF', x: 50, y: 280, width: 60, height: 60, label: 'CAF', name: 'Cafeteria', type: 'cafeteria', color: '#ea580c', zone: 'student' },
    { id: 'LIB', x: 140, y: 200, width: 90, height: 70, label: 'LIB', name: 'Main Library', type: 'library', color: '#2563eb', zone: 'student' },
    { id: 'BOOK', x: 140, y: 280, width: 50, height: 50, label: 'BOOK', name: 'Bookstore', type: 'store', color: '#dc2626', zone: 'student' },
    
    // Sports Zone
    { id: 'GYM', x: 220, y: 310, width: 80, height: 70, label: 'GYM', name: 'Gymnasium', type: 'gym', color: '#dc2626', zone: 'sports' },
    { id: 'FIELD', x: 220, y: 400, width: 160, height: 50, label: 'FIELD', name: 'Sports Field', type: 'sports', color: '#16a34a', zone: 'sports' },
    { id: 'POOL', x: 320, y: 310, width: 60, height: 70, label: 'POOL', name: 'Swimming Pool', type: 'sports', color: '#0891b2', zone: 'sports' },
    { id: 'TENNIS', x: 390, y: 400, width: 70, height: 40, label: 'TENNIS', name: 'Tennis Courts', type: 'sports', color: '#16a34a', zone: 'sports' },
    
    // Admin Zone
    { id: 'ADMIN', x: 320, y: 170, width: 80, height: 60, label: 'ADM', name: 'Administration', type: 'admin', color: '#7e22ce', zone: 'admin' },
    { id: 'MED', x: 320, y: 250, width: 60, height: 50, label: 'MED', name: 'Medical Clinic', type: 'medical', color: '#dc2626', zone: 'admin' },
    { id: 'SEC', x: 390, y: 170, width: 50, height: 40, label: 'SEC', name: 'Security', type: 'admin', color: '#7e22ce', zone: 'admin' },
    
    // Residential Zone
    { id: 'DORM1', x: 410, y: 70, width: 60, height: 40, label: 'DORM1', name: 'North Dormitory', type: 'dorm', color: '#ea580c', zone: 'residential' },
    { id: 'DORM2', x: 410, y: 120, width: 60, height: 40, label: 'DORM2', name: 'South Dormitory', type: 'dorm', color: '#ea580c', zone: 'residential' },
    { id: 'DORM3', x: 410, y: 170, width: 60, height: 40, label: 'DORM3', name: 'East Dormitory', type: 'dorm', color: '#ea580c', zone: 'residential' },
    
    // Arts Zone
    { id: 'ART', x: 410, y: 290, width: 60, height: 50, label: 'ART', name: 'Art Studio', type: 'arts', color: '#db2777', zone: 'arts' },
    { id: 'MUSIC', x: 410, y: 350, width: 60, height: 50, label: 'MUSIC', name: 'Music Hall', type: 'arts', color: '#db2777', zone: 'arts' },
    { id: 'THEA', x: 410, y: 410, width: 60, height: 40, label: 'THEA', name: 'Theater', type: 'arts', color: '#db2777', zone: 'arts' },
    
    // Additional Buildings
    { id: 'PARK', x: 20, y: 420, width: 80, height: 40, label: 'PARK', name: 'Parking Lot', type: 'parking', color: '#6b7280', zone: 'student' },
    { id: 'CHAP', x: 20, y: 350, width: 50, height: 50, label: 'CHAP', name: 'Chapel', type: 'religious', color: '#d97706', zone: 'student' },
    { id: 'RES', x: 80, y: 350, width: 50, height: 50, label: 'RES', name: 'Research Center', type: 'science', color: '#7c3aed', zone: 'academic' }
  ];

  // Simulated route path coordinates
  const routePaths = {
    'College of Computer Studies': [{ x: 135, y: 95 }],
    'Science Labs': [{ x: 225, y: 95 }],
    'College of Business Administration': [{ x: 135, y: 165 }],
    'College of Education': [{ x: 225, y: 165 }],
    'Engineering': [{ x: 315, y: 95 }],
    'Mathematics': [{ x: 315, y: 165 }],
    'Student Center': [{ x: 90, y: 230 }],
    'Cafeteria': [{ x: 80, y: 305 }],
    'Main Library': [{ x: 185, y: 235 }],
    'Bookstore': [{ x: 165, y: 305 }],
    'Gymnasium': [{ x: 260, y: 345 }],
    'Sports Field': [{ x: 300, y: 425 }],
    'Swimming Pool': [{ x: 350, y: 345 }],
    'Tennis Courts': [{ x: 425, y: 420 }],
    'Administration': [{ x: 360, y: 200 }],
    'Medical Clinic': [{ x: 350, y: 275 }],
    'Security': [{ x: 415, y: 190 }],
    'North Dormitory': [{ x: 440, y: 90 }],
    'South Dormitory': [{ x: 440, y: 140 }],
    'East Dormitory': [{ x: 440, y: 190 }],
    'Art Studio': [{ x: 440, y: 315 }],
    'Music Hall': [{ x: 440, y: 375 }],
    'Theater': [{ x: 440, y: 430 }],
    'Parking Lot': [{ x: 60, y: 440 }],
    'Chapel': [{ x: 45, y: 375 }],
    'Research Center': [{ x: 105, y: 375 }]
  };

  // Utility functions
  const getDistance = (p1, p2) => Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));

  const calculateTotalPathDistance = (path) => {
    let totalDistance = 0;
    for (let i = 0; i < path.length - 1; i++) {
      totalDistance += getDistance(path[i], path[i + 1]);
    }
    return totalDistance;
  };

  const calculatePath = (startPoint, destination) => {
    if (!startPoint || !routePaths[destination]) return [];
    
    const destinationPoint = routePaths[destination][0];
    const path = [startPoint];
    
    // Add intermediate points for more natural movement
    const steps = 4;
    for (let i = 1; i < steps; i++) {
      const progress = i / steps;
      const x = startPoint.x + (destinationPoint.x - startPoint.x) * progress;
      const y = startPoint.y + (destinationPoint.y - startPoint.y) * progress;
      path.push({ x, y });
    }
    
    path.push(destinationPoint);
    return path;
  };

  // Map interaction functions
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    startPanRef.current = { 
      x: e.clientX - panX, 
      y: e.clientY - panY 
    };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const newPanX = e.clientX - startPanRef.current.x;
    const newPanY = e.clientY - startPanRef.current.y;
    setPanX(newPanX);
    setPanY(newPanY);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const zoomIn = () => setScale(prevScale => Math.min(prevScale + ZOOM_STEP, MAX_SCALE));
  const zoomOut = () => setScale(prevScale => Math.max(prevScale - ZOOM_STEP, MIN_SCALE));
  const resetView = () => {
    setScale(1.0);
    setPanX(0);
    setPanY(0);
  };

  // Animation Loop
  const animateMovement = (timestamp) => {
    if (!startTime) {
      setStartTime(timestamp - elapsedTime); 
      animationRef.current = requestAnimationFrame(animateMovement);
      return;
    }

    if (isPaused) return;

    const path = currentPathPoints;
    const totalPathDistance = calculateTotalPathDistance(path); 
    const newElapsedTime = (timestamp - startTime);
    const traveledDistance = newElapsedTime * SIMULATED_SPEED;
    const newProgress = Math.min(1, traveledDistance / totalPathDistance);

    let currentDist = 0;
    let x = path[0].x;
    let y = path[0].y;
    
    for (let i = 0; i < path.length - 1; i++) {
      const segmentDistance = getDistance(path[i], path[i + 1]);
      
      if (currentDist + segmentDistance > traveledDistance) {
        const segmentProgress = (traveledDistance - currentDist) / segmentDistance;
        const p1 = path[i];
        const p2 = path[i + 1];
        x = p1.x + (p2.x - p1.x) * segmentProgress;
        y = p1.y + (p2.y - p1.y) * segmentProgress;
        break;
      }
      currentDist += segmentDistance;
    }

    if (newProgress >= 1) {
      setUserPosition(path[path.length - 1]);
      setProgress(100);
      setIsNavigating(false);
      setElapsedTime(0);
      setCurrentStep(stepByStep.length - 1);
      cancelAnimationFrame(animationRef.current);
      return;
    }

    setUserPosition(prev => ({ ...prev, x, y, name: 'Following Route' }));
    setProgress(newProgress * 100);
    setElapsedTime(newElapsedTime);
    
    const stepThreshold = 0.25;
    const newStep = Math.min(stepByStep.length - 1, Math.floor(newProgress / stepThreshold));
    setCurrentStep(newStep);

    animationRef.current = requestAnimationFrame(animateMovement);
  };

  // Initialize
  useEffect(() => {
    setAvailableStartPoints(startPoints);
    setUserPosition(startPoints[0]);
    setRoute(prev => ({ ...prev, start: startPoints[0].name }));

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const handleInputChange = (field, value) => {
    const newRoute = {
      ...route,
      [field]: value
    };
    setRoute(newRoute);
    
    if (field === 'destination' && value && userPosition) {
      calculateRoute(newRoute, userPosition);
    } else {
      setRouteInfo(null);
      setStepByStep([]);
      resetNavigation();
    }
  };

  const handleStartPointSelect = (startPoint) => {
    setUserPosition(startPoint);
    setRoute(prev => ({ ...prev, start: startPoint.name }));
    setIsSettingStart(false);
    
    if (route.destination) {
      calculateRoute({ ...route, start: startPoint.name }, startPoint);
    }
  };

  const calculateRoute = (routeData, startPoint) => {
    if (!routeData.destination || !startPoint) return;

    const path = calculatePath(startPoint, routeData.destination);
    const totalPathDistance = calculateTotalPathDistance(path);
    
    const distance = totalPathDistance * 2;
    const time = Math.ceil(distance / 75);
    
    const newRouteInfo = {
      distance: `${Math.round(distance)}m`,
      time: `~${time} min`,
      calories: Math.round(distance * 0.04),
      steps: Math.round(distance * 1.3)
    };

    const steps = [
      `Start navigation from ${routeData.start}`,
      'In 50m, proceed to the main pathway.',
      'Continue straight for 100m, passing the Cafeteria.',
      'Turn right at the Quad Center intersection.',
      `You have arrived at ${routeData.destination}.`
    ];

    setRouteInfo(newRouteInfo);
    setStepByStep(steps);
  };

  const startNavigation = () => {
    if (!route.destination || !userPosition) {
      alert('Please set both start location and destination');
      return;
    }
    
    const path = calculatePath(userPosition, route.destination);
    if (path.length === 0) return;
    setCurrentPathPoints(path);
    
    setIsNavigating(true);
    setIsPaused(false);
    setCurrentStep(0);
    setProgress(0);
    setStartTime(null);
    setElapsedTime(0);
    
    animationRef.current = requestAnimationFrame(animateMovement);
  };

  const pauseNavigation = () => {
    setIsPaused(true);
    cancelAnimationFrame(animationRef.current);
  };

  const resumeNavigation = () => {
    if (!currentPathPoints.length) return;
    setIsPaused(false);
    animationRef.current = requestAnimationFrame(animateMovement);
  };

  const resetNavigation = () => {
    setIsNavigating(false);
    setIsPaused(false);
    setCurrentStep(0);
    setProgress(0);
    setElapsedTime(0);
    setStartTime(null);
    setCurrentPathPoints([]);
    
    cancelAnimationFrame(animationRef.current);

    if (route.start) {
      const selectedStart = availableStartPoints.find(point => point.name === route.start);
      if (selectedStart) {
        setUserPosition(selectedStart);
      }
    }
  };

  const handleMapClick = (event) => {
    if (!isSettingStart) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 500;
    const y = ((event.clientY - rect.top) / rect.height) * 500;
    
    const customStart = {
      id: 'custom',
      name: 'Custom Location',
      x: Math.max(20, Math.min(480, x)),
      y: Math.max(20, Math.min(480, y)),
      type: 'custom'
    };
    
    handleStartPointSelect(customStart);
  };

  // Map Components
  const Zone = ({ zone }) => (
    <g>
      <rect 
        x={zone.x} 
        y={zone.y} 
        width={zone.width} 
        height={zone.height} 
        fill={zone.color}
        fillOpacity="0.1"
        stroke={zone.color}
        strokeWidth="1.5"
        strokeDasharray="4 4"
        rx="12"
      />
      <text 
        x={zone.x + zone.width/2} 
        y={zone.y - 8} 
        textAnchor="middle" 
        className="font-bold pointer-events-none"
        style={{ fontSize: '10px', fill: zone.color, fontWeight: 'bold' }}
      >
        {zone.label}
      </text>
    </g>
  );

  const Building = ({ b, isDestination }) => (
    <g>
      <rect 
        x={b.x} 
        y={b.y} 
        width={b.width} 
        height={b.height} 
        rx="8" 
        fill="white" 
        stroke={isDestination ? '#10b981' : '#e5e7eb'}
        strokeWidth={isDestination ? '3' : '2'}
        className="drop-shadow-sm"
      />
      <rect 
        x={b.x} 
        y={b.y} 
        width={b.width} 
        height={b.height * 0.3} 
        rx="8" 
        fill={isDestination ? '#10b981' : b.color}
        fillOpacity="0.9"
      />
      <text 
        x={b.x + b.width/2} 
        y={b.y + b.height/2 + 4} 
        textAnchor="middle" 
        className="font-bold pointer-events-none"
        style={{ fontSize: '11px', fontWeight: 'bold', fill: '#1f2937' }}
      >
        {b.label}
      </text>
    </g>
  );

  const StartPoint = ({ point, isSelected, isCurrentPosition }) => (
    <g>
      <circle 
        cx={point.x} 
        cy={point.y} 
        r="6" 
        fill={isCurrentPosition ? '#3b82f6' : '#ef4444'}
        stroke="white"
        strokeWidth="2"
      />
      {isCurrentPosition && (
        <circle 
          cx={point.x} 
          cy={point.y} 
          r="10" 
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
          strokeDasharray="4 2"
        />
      )}
    </g>
  );

  const currentPath = userPosition && route.destination ? calculatePath(userPosition, route.destination) : [];
  const destinationBuilding = mapBuildings.find(b => b.name === route.destination);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex flex-col">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md px-6 pt-12 pb-6 flex items-center border-b border-gray-200/50 shadow-sm sticky top-0 z-20">
        <button 
          onClick={() => onNavigate('map')} 
          className="p-2 -ml-2 mr-2 hover:bg-gray-100/80 rounded-full transition-all duration-200 text-gray-700"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">GPS Navigation</h1>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 space-y-6">
        {/* Search Bar */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-gray-200/50">
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-white rounded-xl h-14 px-4 flex items-center border border-gray-300/50 focus-within:border-[#601214] focus-within:ring-2 focus-within:ring-[#601214]/20 transition-all duration-200 shadow-sm">
              <Search className="w-5 h-5 text-gray-400 mr-3" />
              <input 
                type="text" 
                placeholder="🔍 Search buildings, rooms, or facilities..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-gray-900 placeholder-gray-500 outline-none font-medium" 
              />
            </div>
            <button 
              onClick={resetView}
              className="bg-gradient-to-br from-[#601214] to-[#8b1a1d] text-white rounded-xl w-14 h-14 flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200"
              title="Reset View"
            >
              <Compass size={20} />
            </button>
          </div>
        </div>

        {/* Location Inputs */}
        <div className="space-y-4 animate-enter">
          {/* Start Location */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-gray-200/50">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Start Location</label>
              <button 
                onClick={() => setIsSettingStart(!isSettingStart)} 
                className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1"
              >
                <Move size={12} />
                {isSettingStart ? 'Cancel Setting' : 'Change/Set on Map'}
              </button>
            </div>
            <div className="flex items-center gap-2 mt-1">
                <MapPin size={20} className="text-[#601214]" />
                <span className="font-medium text-gray-900 text-lg">
                    {userPosition?.name || route.start || 'Select a starting point...'}
                </span>
            </div>
            {isSettingStart && (
              <div className="mt-4 pt-4 border-t border-gray-200 max-h-32 overflow-y-auto">
                {availableStartPoints.map(point => (
                  <button
                    key={point.id}
                    onClick={() => handleStartPointSelect(point)}
                    className={`w-full text-left p-2 rounded-lg text-sm transition-colors ${userPosition?.name === point.name ? 'bg-blue-100 text-blue-800 font-semibold' : 'hover:bg-gray-100 text-gray-700'}`}
                  >
                    {point.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Destination */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-gray-200/50">
            <label htmlFor="destination-select" className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Destination</label>
            <select
              id="destination-select"
              value={route.destination}
              onChange={(e) => handleInputChange('destination', e.target.value)}
              className="w-full bg-transparent text-gray-900 outline-none font-medium text-lg appearance-none"
            >
              <option value="">Select your destination...</option>
              {mapBuildings.map((building, index) => (
                <option key={index} value={building.name}>
                  {building.name} ({building.label})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Route Summary */}
        {routeInfo && (
          <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 shadow-xl border border-gray-200/50 animate-enter delay-100">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 bg-[#601214] rounded-full flex items-center justify-center text-white">
                <Navigation2 size={24} fill="currentColor" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Route Summary</h3>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isNavigating ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                  {isNavigating ? 'NAVIGATION ACTIVE' : 'ROUTE CALCULATED'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4 border border-blue-200">
                <div className="flex items-center gap-2 text-blue-600 mb-2">
                  <Footprints size={16} />
                  <span className="text-xs font-semibold">DISTANCE</span>
                </div>
                <span className="text-xl font-bold text-blue-800">{routeInfo.distance}</span>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-4 border border-green-200">
                <div className="flex items-center gap-2 text-green-600 mb-2">
                  <Clock size={16} />
                  <span className="text-xs font-semibold">EST. TIME</span>
                </div>
                <span className="text-xl font-bold text-green-800">{routeInfo.time}</span>
              </div>
            </div>

            {/* Start/Reset Button */}
            <div className="flex items-center justify-center">
              {!isNavigating ? (
                  <button 
                      onClick={startNavigation} 
                      className="w-full bg-green-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-green-900/20 hover:bg-green-600 hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2"
                      disabled={!route.destination || !userPosition}
                  >
                      <Navigation2 size={20} /> Start Navigation
                  </button>
              ) : (
                  <button 
                      onClick={resetNavigation} 
                      className="w-full bg-red-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-red-900/20 hover:bg-red-600 hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2"
                  >
                      <RotateCcw size={20} /> Reset Navigation
                  </button>
              )}
            </div>
          </div>
        )}

        {/* GPS Navigation Controls */}
        {isNavigating && route.destination && (
          <div className="bg-white/90 backdrop-blur-md rounded-xl p-4 shadow-lg border border-gray-200/50 animate-enter delay-200">
            <div className="flex flex-col gap-4">
              {/* Next Instruction Display */}
              <div className="flex items-center gap-4 bg-blue-50/70 p-3 rounded-lg border border-blue-200">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-lg flex-shrink-0">
                      {progress < 100 ? <CornerUpRight size={24} /> : <MapPin size={24} />}
                  </div>
                  <div className="flex-1 overflow-hidden">
                      <p className="text-xs font-semibold text-blue-600 uppercase">
                          {progress < 100 ? 'NEXT INSTRUCTION' : 'FINAL DESTINATION'}
                      </p>
                      <h4 className="text-lg font-bold text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis">
                          {progress < 100 ? stepByStep[currentStep] : `You've reached ${route.destination}!`}
                      </h4>
                  </div>
              </div>
            
              {/* Pause / Resume Buttons */}
              <div className="flex items-center justify-center gap-4 w-full">
                {isPaused ? (
                  <button 
                    onClick={resumeNavigation} 
                    className="flex-1 py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                  >
                    <Play size={20} /> Resume
                  </button>
                ) : (
                  <button 
                    onClick={pauseNavigation} 
                    className="flex-1 py-3 bg-yellow-500 text-white rounded-xl font-bold hover:bg-yellow-600 transition-all duration-200 flex items-center justify-center gap=2 shadow-md hover:shadow-lg"
                  >
                    <Pause size={20} /> Pause
                  </button>
                )}
                <button 
                    onClick={resetNavigation} 
                    className="py-3 px-6 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                >
                    <RotateCcw size={20} /> Stop
                </button>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full mt-2">
                  <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-gray-700">Route Progress:</span>
                      <span className="text-blue-600">{Math.round(progress)}% Complete</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                          className="bg-blue-500 h-2.5 rounded-full transition-all duration-500 ease-linear" 
                          style={{ width: `${progress}%` }}
                      ></div>
                  </div>
              </div>
            </div>
          </div>
        )}

        {/* Interactive Map */}
        {userPosition && (
          <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 shadow-xl border border-gray-200/50 animate-enter delay-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                Current Position & Route
              </h2>
              <div className="flex items-center gap-2 bg-gray-100/80 rounded-xl px-3 py-2">
                <Compass size={16} className="text-[#601214]" />
                <span className="text-xs font-bold text-[#601214] tracking-wider">
                  {isSettingStart ? 'CLICK TO SET START' : isNavigating ? (isPaused ? 'NAVIGATION PAUSED' : 'NAVIGATION ACTIVE') : 'ROUTE MAP'}
                </span>
              </div>
            </div>
            
            <div 
              ref={mapRef} 
              className="bg-gradient-to-br from-green-50/80 to-blue-50/80 rounded-2xl w-full h-80 relative overflow-hidden border-2 border-green-200/50 cursor-grab active:cursor-grabbing shadow-inner"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onClick={handleMapClick}
            >
              <div 
                className="absolute inset-0" 
                style={{ 
                  transform: `translate(${panX}px, ${panY}px) scale(${scale})`, 
                  transformOrigin: '0 0', 
                  transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }} 
              >
                <svg 
                  viewBox="0 0 500 500"
                  className="drop-shadow-sm"
                  width="500"
                  height="500"
                  style={{ filter: 'drop-shadow(0px 4px 12px rgba(0, 0, 0, 0.1))' }}
                >
                  {/* Background with grid */}
                  <defs>
                    <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                      <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#d1d5db" strokeWidth="0.5" opacity="0.3"/>
                    </pattern>
                  </defs>
                  <rect x="0" y="0" width="500" height="500" fill="#f0fdf4" />
                  <rect x="0" y="0" width="500" height="500" fill="url(#grid)" />
                  
                  {/* Campus Zones */}
                  {Object.values(campusZones).map((zone, index) => (
                    <Zone key={index} zone={zone} />
                  ))}

                  {/* Main Pathways */}
                  <g className="opacity-80">
                    <path d="M0 250 L500 250" stroke="#a8a29e" strokeWidth="35" strokeLinecap="round" />
                    <path d="M250 0 L250 500" stroke="#a8a29e" strokeWidth="35" strokeLinecap="round" />
                    <circle cx="250" cy="250" r="40" fill="#a8a29e" />
                    
                    <path d="M100 100 L400 100" stroke="#d6d3d1" strokeWidth="20" strokeLinecap="round" strokeDasharray="2 8" />
                    <path d="M100 400 L400 400" stroke="#d6d3d1" strokeWidth="20" strokeLinecap="round" strokeDasharray="2 8" />
                  </g>

                  {/* Water Feature */}
                  <g className="opacity-90">
                    <circle cx="400" cy="400" r="35" fill="url(#waterGradient)" stroke="#38bdf8" strokeWidth="2" />
                    <text x="400" y="400" textAnchor="middle" className="font-bold" style={{ fontSize: '9px', fill: '#0c4a6e', fontWeight: 'bold' }}>
                      POND
                    </text>
                  </g>

                  {/* Buildings */}
                  {mapBuildings.map(b => (
                    <Building 
                      key={b.id} 
                      b={b} 
                      isDestination={destinationBuilding && b.id === destinationBuilding.id} 
                    />
                  ))}

                  {/* Navigation Path and Marker */}
                  {isNavigating && currentPathPoints.length > 0 && (
                    <g>
                      <path
                        d={`M${currentPathPoints.map(p => `${p.x} ${p.y}`).join(' L')}`}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="3"
                        strokeDasharray="8 4"
                        opacity="0.6"
                      />
                      
                      <StartPoint 
                          point={userPosition} 
                          isCurrentPosition={true}
                      />
                    </g>
                  )}
                  
                  {/* Static Start Points */}
                  {!isNavigating && availableStartPoints.map(point => (
                    <StartPoint 
                      key={point.id} 
                      point={point} 
                      isSelected={userPosition && userPosition.name === point.name} 
                      isCurrentPosition={userPosition && userPosition.name === point.name}
                    />
                  ))}

                  {/* "You Are Here" Marker */}
                  <g transform="translate(240, 240)" className="animate-pulse">
                    <circle cx="10" cy="10" r="12" fill="#ef4444" opacity="0.4" />
                    <circle cx="10" cy="10" r="8" fill="#dc2626" opacity="0.7" />
                    <circle cx="10" cy="10" r="4" fill="#b91c1c" />
                    <circle cx="10" cy="10" r="1" fill="white" />
                    <text x="25" y="15" textAnchor="start" className="font-bold" style={{ fontSize: '10px', fill: '#dc2626', fontWeight: 'bold' }}>
                      YOU ARE HERE
                    </text>
                  </g>

                  {/* Water Gradient Definition */}
                  <defs>
                    <linearGradient id="waterGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#7dd3fc" />
                      <stop offset="50%" stopColor="#38bdf8" />
                      <stop offset="100%" stopColor="#0ea5e9" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              {/* Map Controls */}
              <div className="absolute top-4 right-4 flex flex-col space-y-3 z-10">
                <button 
                  onClick={zoomIn} 
                  disabled={scale >= MAX_SCALE}
                  className="w-10 h-10 bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-gray-200/50 text-gray-700 hover:bg-white hover:shadow-xl hover:scale-110 disabled:opacity-50 transition-all duration-200 flex items-center justify-center"
                  title="Zoom In"
                >
                  <Plus size={20} />
                </button>
                <button 
                  onClick={zoomOut} 
                  disabled={scale <= MIN_SCALE}
                  className="w-10 h-10 bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-gray-200/50 text-gray-700 hover:bg-white hover:shadow-xl hover:scale-110 disabled:opacity-50 transition-all duration-200 flex items-center justify-center"
                  title="Zoom Out"
                >
                  <Minus size={20} />
                </button>
                <div className="h-px bg-gray-300/50 mx-2"></div>
                <button 
                  onClick={resetView}
                  className="w-10 h-10 bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-gray-200/50 text-gray-700 hover:bg-white hover:shadow-xl hover:scale-110 transition-all duration-200 flex items-center justify-center"
                  title="Reset View"
                >
                  <Compass size={20} />
                </button>
              </div>

              {/* Scale and Coordinates */}
              <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-md px-3 py-2 rounded-xl text-xs font-semibold text-gray-600 border border-gray-200/50 shadow-lg">
                <div>Scale: {Math.round(scale * 100)}%</div>
                <div className="text-gray-400">X: {Math.round(panX)} Y: {Math.round(panY)}</div>
              </div>
            </div>
            
            {/* Quick Building Access */}
            {!route.destination && (
                <div className="mt-6">
                    <h3 className="font-bold text-gray-900 text-lg mb-4">Popular Destinations</h3>
                    <div className="grid grid-cols-2 gap-4">
                        {mapBuildings.slice(0, 4).map((building, index) => (
                            <button
                                key={index}
                                onClick={() => handleInputChange('destination', building.name)}
                                className="bg-white/80 backdrop-blur-md rounded-2xl p-4 text-left hover:border-[#601214] transition-all duration-300 border border-gray-200/50 shadow-sm hover:shadow-lg hover:scale-105 group"
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 bg-gradient-to-br from-[#601214] to-[#8b1a1d] rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                                        <Building2 size={18} />
                                    </div>
                                    <span className="font-bold text-gray-900 text-base">{building.label}</span>
                                </div>
                                <p className="text-gray-600 text-sm">{building.name}</p>
                            </button>
                        ))}
                    </div>
                </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Navigate;