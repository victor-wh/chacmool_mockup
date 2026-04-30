import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function ProcessHome() {
  const { user } = useAuth();
  if (user?.role === 'admin') return <Navigate to="/process/admin/processes" replace />;
  return <Navigate to="/process/my" replace />;
}
