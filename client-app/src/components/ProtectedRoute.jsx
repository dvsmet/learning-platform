import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, role }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;

  if (role === 'admin' && !user.isAdmin) return <Navigate to="/login" replace />;
  if (role === 'instructor' && !user.isInstructor && !user.isAdmin) return <Navigate to="/login" replace />;

  return children;
}
