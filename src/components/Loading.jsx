import React from 'react';
import { MapPin } from 'lucide-react';

const Loading = () => {
  return (
    <div className="min-h-screen bg-[#601214] flex flex-col items-center justify-center p-6">
      {/* Simple Logo without complex animations */}
      <div className="relative mb-8">
        <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center shadow-2xl">
          <div className="flex flex-col items-center">
            <div className="bg-[#601214] p-2 rounded-full mb-1">
              <MapPin className="text-white w-6 h-6" />
            </div>
            <span className="text-[#601214] font-black text-xs tracking-widest text-center leading-tight">
              CAMPUS<br/>NAVI
            </span>
          </div>
        </div>
      </div>

      {/* Simple Loading Text */}
      <div className="text-center">
        <h2 className="text-white text-xl font-semibold mb-2">
          Campus Navi
        </h2>
        <p className="text-white/70 text-sm">
          Loading...
        </p>
      </div>

      {/* Simple Loading Dots */}
      <div className="flex space-x-2 mt-6">
        <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse"></div>
        <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse"></div>
        <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse"></div>
      </div>
    </div>
  );
};

export default Loading;