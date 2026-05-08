"use client";

import React from 'react';
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <main className="flex-1 overflow-x-hidden custom-scrollbar">
          <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
