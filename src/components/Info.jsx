import React, { useState, useEffect } from 'react';
import { ChevronLeft, Search, SlidersHorizontal, ChevronRight, Building2, Clock, MapPin, Users, Wifi, BookOpen, Coffee, Dumbbell, FlaskRound, Trees, Shield, Navigation, GraduationCap, Truck, Cross, Car } from 'lucide-react';
import { supabase } from '../supabaseClient';

const Info = ({ onNavigate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredBuildings, setFilteredBuildings] = useState([]);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [buildings, setBuildings] = useState([]);

  useEffect(() => {
    fetchBuildings();
  }, []);

  const fetchBuildings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('buildings')
        .select('*')
        .eq('is_active', true)
        .order('building_name');

      if (error) {
        console.error('Error fetching buildings:', error);
        return;
      }
      
      if (data) {
        setBuildings(data);
        setFilteredBuildings(data);
      }
    } catch (error) {
      console.error('Error fetching buildings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    
    if (term === '') {
      setFilteredBuildings(buildings);
    } else {
      const filtered = buildings.filter(building => 
        building.building_name.toLowerCase().includes(term) || 
        building.building_code.toLowerCase().includes(term) ||
        building.description?.toLowerCase().includes(term) ||
        building.building_type.toLowerCase().includes(term)
      );
      setFilteredBuildings(filtered);
    }
  };

  const handleBuildingClick = (building) => {
    console.log('Building clicked:', building);
    setSelectedBuilding(building);
  };

  const closeDetails = () => {
    setSelectedBuilding(null);
  };

  const handleNavigateToBuilding = () => {
    if (selectedBuilding) {
      // Store the building data to pass to navigate
      localStorage.setItem('selectedDestination', selectedBuilding.building_name);
      onNavigate('navigate');
    }
  };

  const getBuildingIcon = (type) => {
    switch (type) {
      case 'academic': return <GraduationCap size={20} />;
      case 'workshop': return <Truck size={20} />;
      case 'medical': return <Cross size={20} />;
      case 'cafeteria': return <Coffee size={20} />;
      case 'sports': return <Dumbbell size={20} />;
      case 'admin': return <Shield size={20} />;
      case 'arts': return <BookOpen size={20} />;
      case 'student': return <Users size={20} />;
      case 'parking': return <Car size={20} />;
      case 'open': return <Trees size={20} />;
      default: return <Building2 size={20} />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'academic': return '#1e40af';
      case 'workshop': return '#ea580c';
      case 'medical': return '#dc2626';
      case 'cafeteria': return '#ea580c';
      case 'sports': return '#059669';
      case 'admin': return '#7e22ce';
      case 'arts': return '#db2777';
      case 'student': return '#dc2626';
      case 'parking': return '#6b7280';
      case 'open': return '#16a34a';
      default: return '#601214';
    }
  };

  // Prevent accidental clicks on the list items
  const handleBuildingItemClick = (e, building) => {
    e.preventDefault();
    e.stopPropagation();
    handleBuildingClick(building);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex flex-col">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md px-6 pt-12 pb-6 flex items-center border-b border-gray-200/50 sticky top-0 z-20 shadow-sm">
        <button 
          onClick={() => onNavigate('map')} 
          className="p-2 -ml-2 mr-2 hover:bg-gray-100/80 rounded-full transition-all duration-200 text-gray-700 hover:scale-105"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Building Information</h1>
          <p className="text-gray-500 text-sm">Detailed campus building guide</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        {/* Search Bar */}
        <div className="flex gap-3 mb-8 animate-enter">
          <div className="flex-1 bg-white/80 backdrop-blur-md rounded-xl h-14 px-4 flex items-center shadow-sm border border-gray-300/50 focus-within:border-[#601214] focus-within:ring-2 focus-within:ring-[#601214]/20 transition-all">
            <Search className="w-5 h-5 text-gray-400 mr-3" />
            <input 
              type="text" 
              placeholder="Search buildings, facilities, or departments..." 
              value={searchTerm}
              onChange={handleSearch}
              className="w-full bg-transparent text-gray-900 placeholder-gray-500 outline-none font-medium" 
            />
          </div>
          <button className="bg-white/80 backdrop-blur-md rounded-xl w-14 h-14 flex items-center justify-center shadow-sm border border-gray-300/50 hover:bg-gray-100/80 active:scale-95 transition-all text-gray-600">
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>

        {/* Building Cards or Detailed View */}
        {selectedBuilding ? (
          // Detailed Building View
          <div className="animate-enter">
            <button 
              onClick={closeDetails}
              className="flex items-center gap-2 text-[#601214] font-semibold mb-6 hover:underline hover:text-[#4a0d0e] transition-colors"
            >
              <ChevronLeft size={20} />
              Back to List
            </button>

            <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 shadow-xl border border-gray-200/50">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div 
                    className="p-3 rounded-2xl text-white shadow-lg" 
                    style={{ backgroundColor: getTypeColor(selectedBuilding.building_type) }}
                  >
                    {getBuildingIcon(selectedBuilding.building_type)}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedBuilding.building_name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span 
                        className="text-sm font-bold text-white px-2 py-1 rounded-full shadow-sm"
                        style={{ backgroundColor: getTypeColor(selectedBuilding.building_type) }}
                      >
                        {selectedBuilding.building_code}
                      </span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full capitalize">
                        {selectedBuilding.building_type}
                      </span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                        {selectedBuilding.coordinates ? `Position: ${selectedBuilding.coordinates.x}, ${selectedBuilding.coordinates.y}` : ''}
                      </span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={handleNavigateToBuilding}
                  className="bg-gradient-to-br from-[#601214] to-[#8b1a1d] text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all duration-200 flex items-center gap-2"
                >
                  <Navigation size={18} />
                  Get Directions
                </button>
              </div>

              {selectedBuilding.description && (
                <p className="text-gray-600 text-lg mb-8 leading-relaxed">
                  {selectedBuilding.description}
                </p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="space-y-4">
                  <h3 className="font-bold text-gray-900 text-lg">Building Details</h3>
                  
                  <div className="flex items-center gap-3 text-gray-600 p-3 bg-gray-50/50 rounded-xl">
                    <Clock size={18} className="text-[#601214]" />
                    <div>
                      <p className="font-semibold">Status</p>
                      <p className="text-sm">{selectedBuilding.is_active ? 'Active and Accessible' : 'Temporarily Closed'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-gray-600 p-3 bg-gray-50/50 rounded-xl">
                    <Building2 size={18} className="text-[#601214]" />
                    <div>
                      <p className="font-semibold">Building Type</p>
                      <p className="text-sm capitalize">{selectedBuilding.building_type}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-gray-600 p-3 bg-gray-50/50 rounded-xl">
                    <Wifi size={18} className="text-[#601214]" />
                    <div>
                      <p className="font-semibold">WiFi Coverage</p>
                      <p className="text-sm">Available throughout building</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-gray-900 text-lg mb-4">Location Information</h3>
                  <div className="bg-gray-50/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin size={16} className="text-[#601214]" />
                      <span className="font-semibold">Map Position:</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="bg-white p-2 rounded-lg">
                        <span className="text-gray-500">X:</span>
                        <span className="font-semibold ml-2">{selectedBuilding.coordinates?.x || 0}</span>
                      </div>
                      <div className="bg-white p-2 rounded-lg">
                        <span className="text-gray-500">Y:</span>
                        <span className="font-semibold ml-2">{selectedBuilding.coordinates?.y || 0}</span>
                      </div>
                      <div className="bg-white p-2 rounded-lg">
                        <span className="text-gray-500">Width:</span>
                        <span className="font-semibold ml-2">{selectedBuilding.coordinates?.width || 0}m</span>
                      </div>
                      <div className="bg-white p-2 rounded-lg">
                        <span className="text-gray-500">Height:</span>
                        <span className="font-semibold ml-2">{selectedBuilding.coordinates?.height || 0}m</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50/50 rounded-2xl p-6 border border-gray-200/50">
                <h3 className="font-bold text-gray-900 text-lg mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-white/80 rounded-xl border border-gray-200/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <MapPin size={18} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Find on Map</p>
                        <p className="text-gray-500 text-sm">Locate this building on campus map</p>
                      </div>
                    </div>
                    <button 
                      onClick={handleNavigateToBuilding}
                      className="text-[#601214] font-semibold text-sm hover:underline"
                    >
                      Show
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-white/80 rounded-xl border border-gray-200/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <Users size={18} className="text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Contact Information</p>
                        <p className="text-gray-500 text-sm">Building administration contact</p>
                      </div>
                    </div>
                    <button className="text-[#601214] font-semibold text-sm hover:underline">
                      View
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Building List View
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#601214] mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading buildings...</p>
              </div>
            ) : filteredBuildings.length > 0 ? (
              filteredBuildings.map((b, index) => (
                <div 
                  key={b.id} 
                  className={`bg-white/80 backdrop-blur-md rounded-2xl p-5 shadow-lg border border-gray-200/50 hover:border-[#601214] transition-all duration-300 animate-enter cursor-pointer hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]`}
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={(e) => handleBuildingItemClick(e, b)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div 
                        className="p-2.5 rounded-xl text-white shadow-md" 
                        style={{ backgroundColor: getTypeColor(b.building_type) }}
                      >
                        {getBuildingIcon(b.building_type)}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">{b.building_name}</h3>
                        <div className="flex gap-2 mt-1">
                          <span 
                            className="text-xs font-bold text-white px-2 py-0.5 rounded-md shadow-sm"
                            style={{ backgroundColor: getTypeColor(b.building_type) }}
                          >
                            {b.building_code}
                          </span>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md capitalize">
                            {b.building_type}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button className="text-gray-300 hover:text-[#601214] transition-colors">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                  {b.description && (
                    <p className="text-gray-500 text-sm leading-relaxed pl-[3.25rem]">
                      {b.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-3 pl-[3.25rem] text-xs text-gray-400">
                    <div className="flex items-center gap-1">
                      <MapPin size={12} />
                      <span>Position: {b.coordinates?.x || 0}, {b.coordinates?.y || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Building2 size={12} />
                      <span>Size: {b.coordinates?.width || 0}×{b.coordinates?.height || 0}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search size={24} className="text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No buildings found</h3>
                <p className="text-gray-500">
                  No buildings match "{searchTerm}". Try searching with different terms.
                </p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilteredBuildings(buildings);
                  }}
                  className="mt-4 text-[#601214] font-semibold text-sm hover:underline"
                >
                  Clear Search
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      {!selectedBuilding && (
        <div className="p-6 border-t border-gray-200/50 bg-white/80 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                Showing {filteredBuildings.length} of {buildings.length} buildings
              </p>
            </div>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="text-[#601214] font-semibold text-sm hover:underline"
            >
              Back to Top
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Info;