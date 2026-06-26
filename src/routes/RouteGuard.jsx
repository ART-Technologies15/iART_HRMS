import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export const PublicRoute = ({ children }) => {
  const { user } = useAuth();
  const storedUser = localStorage.getItem("user");

  if (user || storedUser) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export const PrivateRoute = ({ children }) => {
  const { user } = useAuth();
  const storedUser = localStorage.getItem("user");
  const { pathname } = useLocation();

  if (!user && !storedUser) {
    return <Navigate to="/" replace state={{ from: pathname }} />;
  }

  return children;
};
