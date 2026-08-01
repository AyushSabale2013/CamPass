import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const ProtectedRoute = ({ children, role }) => {

  const {
    user,
    loading,
    isAuthenticated,
  } = useAuth();

  if (loading) {
    return <h2>Loading...</h2>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (role && user.role !== role) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;