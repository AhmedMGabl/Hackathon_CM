import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Overview from './pages/Overview';
import './index.css';

function App() {
  // TODO PASS 2: Add auth context, protected routes, full navigation
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card">
          <div className="container mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold text-foreground">
              Operations Analytics Platform
            </h1>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Navigate to="/overview" replace />} />
            <Route path="/overview" element={<Overview />} />
            {/* TODO PASS 4: Add remaining routes */}
            {/* <Route path="/individuals" element={<Individuals />} />
            <Route path="/targets" element={<TargetsTracker />} />
            <Route path="/alerts" element={<MeetingAlerts />} />
            <Route path="/admin/ingestion" element={<AdminIngestion />} />
            <Route path="/admin/config" element={<AdminConfig />} />
            <Route path="/help" element={<Help />} />
            <Route path="/login" element={<Login />} /> */}
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
