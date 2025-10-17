import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Overview from './pages/Overview';
import Mentors from './pages/Mentors';
import TargetsTracker from './pages/TargetsTracker';
import MeetingAlerts from './pages/MeetingAlerts';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Navigate to="/overview" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/overview"
            element={
              <ProtectedRoute>
                <Overview />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mentors"
            element={
              <ProtectedRoute>
                <Mentors />
              </ProtectedRoute>
            }
          />
          <Route
            path="/targets"
            element={
              <ProtectedRoute>
                <TargetsTracker />
              </ProtectedRoute>
            }
          />
          <Route
            path="/alerts"
            element={
              <ProtectedRoute>
                <MeetingAlerts />
              </ProtectedRoute>
            }
          />

          {/* TODO PHASE B: Add AI endpoints & admin pages */}
          {/* <Route path="/admin/ingestion" element={<ProtectedRoute requireAdmin><AdminIngestion /></ProtectedRoute>} /> */}
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
