import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { TrialStatusBanner } from './TrialStatusBanner';
import { Footer } from './Footer';

export function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col w-full overflow-x-hidden">
      <Navbar />
      <TrialStatusBanner />
      <main className="flex-1 pt-16 w-full">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
