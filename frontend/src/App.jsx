import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './auth/ProtectedRoute';
import ReviewerRoute from './auth/ReviewerRoute';
import AppLayout from './layout/AppLayout';
import ComingSoonPage from './pages/ComingSoonPage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Every page inside the layout requires login */}
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<HomePage />} />
        <Route path="calendar" element={<ComingSoonPage />} />
        <Route path="requests/new" element={<ComingSoonPage />} />
        <Route path="requests" element={<ComingSoonPage />} />
        <Route path="requests/:id" element={<ComingSoonPage />} />
        <Route path="review" element={<ReviewerRoute><ComingSoonPage /></ReviewerRoute>} />
        <Route path="notifications" element={<ComingSoonPage />} />
        <Route path="profile" element={<ComingSoonPage />} />
        <Route path="settings" element={<ComingSoonPage />} />
        <Route path="help" element={<ComingSoonPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}