import React, { useState } from 'react';
import { MapPin, Mail, Lock, ArrowRight } from 'lucide-react';
import { supabase } from '../supabaseClient';

const Login = ({ onNavigate, onLoginSuccess }) => {
  const [formData, setFormData] = useState({
    email: '', 
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      });

      if (error) {
        console.error('Login error:', error);
        setError('Login failed: ' + error.message);
        setLoading(false);
        return;
      }

      if (data?.user) {
        console.log('✅ Login successful for:', data.user.email);
        
        // Wait for auth client to settle then trigger parent to check session/role.
        // Immediately stop loading and trigger onLoginSuccess (App will fetch role).
        setLoading(false);
        if (onLoginSuccess) {
          onLoginSuccess();
        }
      }
    } catch (error) {
      console.error('Unexpected login error:', error);
      setError('An unexpected error occurred.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-red-100 rounded-full blur-3xl opacity-60"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-gray-200 rounded-full blur-3xl opacity-60"></div>

      <div className="w-full max-w-md animate-enter z-10">
        <div className="flex flex-col items-center mb-10">
          <div className="bg-[#601214] p-4 rounded-2xl shadow-xl shadow-red-900/20 mb-4 transform hover:scale-105 transition-transform duration-300">
            <MapPin className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Welcome Back</h1>
          <p className="text-gray-500 mt-2">Sign in to Campus Navi</p>
        </div>
        
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="space-y-5">
            <div className="group">
              <label className="block text-gray-700 text-sm font-semibold mb-2 ml-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-[#601214] transition-colors" />
                <input 
                  type="email" 
                  name="email" 
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-12 pr-4 py-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#601214] focus:ring-1 focus:ring-[#601214] transition-all"
                  placeholder="Enter email address"
                  required
                />
              </div>
            </div>
            
            <div className="group">
              <label className="block text-gray-700 text-sm font-semibold mb-2 ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-[#601214] transition-colors" />
                <input 
                  type="password" 
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-12 pr-4 py-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#601214] focus:ring-1 focus:ring-[#601214] transition-all"
                  placeholder="Enter password"
                  required
                />
              </div>
            </div>

            <button 
              type="submit"
              className="w-full bg-[#601214] text-white font-bold py-4 rounded-xl shadow-lg shadow-red-900/20 hover:bg-[#4a0d0e] hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center group disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              <span>{loading ? 'Logging In...' : 'Log In'}</span>
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </form>

        <div className="mt-8 text-center animate-enter delay-200">
          <span className="text-gray-500">New to Campus Navi? </span>
          <button 
            onClick={() => onNavigate('signup')}
            className="text-[#601214] font-bold hover:underline decoration-2 underline-offset-4"
          >
            Create Account
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;