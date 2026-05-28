import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

const Layout = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50/40 font-sans antialiased text-slate-800">
      {/* Sticky and responsive Navbar */}
      <Navbar />
      
      {/* Centered, standard-width core layout block */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;