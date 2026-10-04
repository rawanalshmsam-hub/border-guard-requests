import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { isReviewer } from '../layout/navigation';

/** Leaders only. Real protection is on the server (E401); this just avoids showing an empty page. */
export default function ReviewerRoute({ children }) {
  const { user } = useAuth();
  return isReviewer(user) ? children : <Navigate to="/" replace />;
}