import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import AdminPortal from './components/AdminPortal';

function App() {
  const [view, setView] = useState(() => {
    return sessionStorage.getItem('nayepankh_active_view') || 'landing';
  });
  const [theme, setTheme] = useState(() => {
    return sessionStorage.getItem('nayepankh_theme') || 'light';
  });

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    sessionStorage.setItem('nayepankh_theme', theme);
  }, [theme]);

  useEffect(() => {
    sessionStorage.setItem('nayepankh_active_view', view);
  }, [view]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <>
      {/* Premium Atmospheric Glowing Orbs in the background */}
      <div className="bg-glow-container">
        <div className="bg-orb orb-1"></div>
        <div className="bg-orb orb-2"></div>
      </div>

      {/* Screen Render Switch */}
      {view === 'landing' ? (
        <LandingPage 
          onToggleAdmin={() => setView('admin')} 
          apiBaseUrl={API_BASE_URL} 
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      ) : (
        <AdminPortal 
          onToggleLanding={() => setView('landing')} 
          apiBaseUrl={API_BASE_URL} 
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      )}
    </>
  );
}

export default App;
