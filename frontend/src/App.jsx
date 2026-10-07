import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './auth/ProtectedRoute';
import ReviewerRoute from './auth/ReviewerRoute';
import AppLayout from './layout/AppLayout';
import ComingSoonPage from './pages/ComingSoonPage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import NewRequestPage from './pages/new-request/NewRequestPage';
import MyRequestsPage from './pages/MyRequestsPage';
import RequestDetailsPage from './pages/request-details/RequestDetailsPage';
import NotificationsPage from './pages/NotificationsPage';
import ReviewPage from './pages/review/ReviewPage';
import CalendarPage from './pages/CalendarPage';
import ProfilePage from './pages/ProfilePage';
import RequestPrintPage from './pages/request-details/RequestPrintPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
            {/* Print view: logged in, but outside the app layout (no sidebar / top bar) */}
      <Route path="/requests/:id/print" element={<ProtectedRoute><RequestPrintPage /></ProtectedRoute>} />

      {/* Every page inside the layout requires login */}
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<HomePage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="requests/new" element={<NewRequestPage />} />
        <Route path="services/:slug" element={<ComingSoonPage />} />   
        <Route path="requests" element={<MyRequestsPage />} />
        <Route path="requests/:id" element={<RequestDetailsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="help" element={<ComingSoonPage />} />
        <Route path="review" element={<ReviewerRoute><ReviewPage /></ReviewerRoute>} />
        <Route path="notifications" element={<NotificationsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}