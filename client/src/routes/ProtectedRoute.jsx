import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth, homeForRole } from '../context/AuthContext';
import { Skeleton } from '../components/ui';

export default function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="min-h-screen bg-ink p-8"><Skeleton className="h-8 w-48" /><Skeleton className="mt-6 h-64 w-full" /></div>
    );
  }
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeForRole(user.role)} replace />;
  return <Outlet />;
}
