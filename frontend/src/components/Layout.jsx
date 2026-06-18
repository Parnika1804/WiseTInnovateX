import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import EmailDraftToast from './EmailDraftToast';

const Layout = () => {
  return (
    <div
      className="
        min-h-screen
        bg-slate-50
        bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.06),transparent_40%)]
        dark:bg-none
        dark:bg-slate-900
        font-sans
        antialiased
        text-slate-800
        dark:text-slate-100
      "
    >
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