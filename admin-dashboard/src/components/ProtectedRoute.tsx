import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import { Spinner } from './ui';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!user || !user.is_superuser) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
