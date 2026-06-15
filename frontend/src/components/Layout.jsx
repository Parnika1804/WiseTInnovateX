import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import EmailDraftToast from './EmailDraftToast';

const Layout = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50/40 font-sans antialiased text-slate-800">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <Outlet />
      </main>
      {/* Global Toast Mounted Here */}
      <EmailDraftToast />
    </div>
  );
};

export default Layout;