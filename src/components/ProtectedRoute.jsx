import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children }) {
  const { currentUser, isBlocked } = useAuth();
  if (!currentUser) return <Navigate to="/login" replace />;
  if (isBlocked) return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4 text-center">
      <div className="text-6xl mb-4">🚫</div>
      <h1 className="text-2xl font-bold text-red-400 mb-2">Account Blocked</h1>
      <p className="text-gray-400 text-sm max-w-xs">Your account has been blocked by the admin. Please contact support.</p>
    </div>
  );
  return children;
}
