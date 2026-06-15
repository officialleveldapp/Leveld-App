import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Login } from '@/pages/Login';
import { Overview } from '@/pages/Overview';
import { UsersPage } from '@/pages/Users';
import { UserDetail } from '@/pages/UserDetail';
import { Workouts } from '@/pages/Workouts';
import { Social } from '@/pages/Social';
import { Content } from '@/pages/Content';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Overview />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/users/:id" element={<UserDetail />} />
        <Route path="/workouts" element={<Workouts />} />
        <Route path="/social" element={<Social />} />
        <Route path="/content" element={<Content />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
