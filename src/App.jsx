// App.jsx

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import Login from './components/Login';
import Signup from './components/Signup';
import CampusMap from './components/CampusMap';
import Info from './components/Info';
import Navigate from './components/Navigate';
import Announcements from './components/Announcements';
import Schedule from './components/Schedule';
import Loading from './components/Loading';
import AdminPanel from './componentsAdmin/AdminPanel';
import BuildingManager from './componentsAdmin/BuildingManager'; // Make sure this import is present

export default function App() {
  const [currentView, setCurrentView] = useState('loading');
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const initComplete = useRef(false);

  // Initialize user_roles table on app start
  const initializeDatabase = async () => {
    try {
      console.log('Initializing database...');
      // This is usually where you'd ensure seed data or triggers are set
    } catch (err) {
      console.log('Database initialization skipped:', err.message);
    }
  };

  // Enhanced session check with proper error handling
  const checkSession = async () => {
    try {
      console.log('🔍 Checking session...');
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('❌ Session error:', error);
        setIsLoading(false);
        setCurrentView('login');
        return;
      }

      if (!session?.user) {
        console.log('👤 No active session found.');
        setCurrentView('login');
        return;
      }

      const userId = session.user.id;
      const userEmail = session.user.email;
      let userRole = 'student';

      // 1. Fetch user role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('id', userId)
        .single();
      
      if (roleError && roleError.code !== 'PGRST116') { // PGRST116 is 'No rows found'
          console.error('Error fetching role:', roleError);
      } else if (roleData) {
          userRole = roleData.role;
      }

      setUser({
        id: userId,
        email: userEmail,
        role: userRole,
        username: session.user.user_metadata.full_name || session.user.user_metadata.username || session.user.email,
      });
      
      // === FIX: Redirect admin users to admin panel ===
      if (userRole === 'admin') {
        console.log('👑 Admin user detected, redirecting to admin panel');
        setCurrentView('admin');
      } else {
        setCurrentView('map');
      }
      
    } catch (error) {
      console.error('❌ Authentication failed:', error);
      setCurrentView('login');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!initComplete.current) {
        initializeDatabase();
        checkSession();
        initComplete.current = true;
    }

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`Auth state changed: ${event}`);
      
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        console.log('User signed in, checking session...');
        checkSession();
      } else if (event === 'SIGNED_OUT') {
        console.log('User signed out');
        setUser(null);
        setCurrentView('login');
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed');
        checkSession();
      }
    });

    return () => {
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentView('login');
  };

  const LoadingScreen = () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#601214]"></div>
    </div>
  );

  const renderView = () => {
    if (isLoading) {
      return <LoadingScreen />;
    }

    switch (currentView) {
      case 'loading':
        return <LoadingScreen />;
      case 'login':
        return <Login onNavigate={setCurrentView} onLoginSuccess={checkSession} />;
      case 'signup':
        return <Signup onNavigate={setCurrentView} />;
      case 'map':
        return <CampusMap onNavigate={setCurrentView} user={user} onLogout={handleLogout} />;
      case 'info':
        return <Info onNavigate={setCurrentView} />;
      case 'navigate':
        return <Navigate onNavigate={setCurrentView} />;
      case 'announcements':
        return <Announcements onNavigate={setCurrentView} />;
      case 'schedule':
        return <Schedule onNavigate={setCurrentView} />;
      case 'admin':
        return <AdminPanel onNavigate={setCurrentView} user={user} />;
      // === NEW ROUTE ADDED HERE ===
      case 'building-manager':
        return <BuildingManager onNavigate={setCurrentView} user={user} />;
      default:
        return <CampusMap onNavigate={setCurrentView} user={user} onLogout={handleLogout} />;
    }
  };

  return <div className="app-container">{renderView()}</div>;
}