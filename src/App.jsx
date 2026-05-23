import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login      from './pages/Login';
import Register   from './pages/Register';
import Dashboard  from './pages/Dashboard';
import NewProject from './pages/NewProject';
import Entry      from './pages/Entry';
import Stats      from './pages/Stats';
import Merit      from './pages/Merit';
import Admin      from './pages/Admin';

function PublicRoute({ children }) {
  const { currentUser } = useAuth();
  return currentUser ? <Navigate to="/" replace /> : children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/project/new" element={<ProtectedRoute><NewProject /></ProtectedRoute>} />
      <Route path="/project/:projectId/entry" element={<ProtectedRoute><Entry /></ProtectedRoute>} />
      <Route path="/project/:projectId/stats" element={<ProtectedRoute><Stats /></ProtectedRoute>} />
      <Route path="/project/:projectId/merit" element={<ProtectedRoute><Merit /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
