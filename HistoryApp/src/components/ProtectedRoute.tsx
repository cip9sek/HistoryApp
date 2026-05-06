import { Navigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import type { JSX } from 'react/jsx-dev-runtime';

interface ProtectedRouteProps {
  session: Session | null;
  children: JSX.Element;
}

const ProtectedRoute = ({ session, children }: ProtectedRouteProps) => {
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

export default ProtectedRoute;