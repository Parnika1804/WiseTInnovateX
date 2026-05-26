import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

const Layout = () => {
  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 pb-12">
        {/* Outlet is where the specific page content (like Dashboard or Teams) will render */}
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;