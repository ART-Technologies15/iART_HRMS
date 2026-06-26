import { Navigate } from "react-router-dom";
import { toast } from "react-toastify";

export const AdminRoute = ({ children }) => {
  const user = JSON.parse(localStorage.getItem("user"));
  if (user?.role === "admin") return children;

  toast.error("Access denied. Admins only.");
  return <Navigate to="/dashboard" replace />;
};

export const EmployeeRoute = ({ children }) => {
  const user = JSON.parse(localStorage.getItem("user"));
  if (user?.role !== "admin") return children;

  toast.error("This page is only for employees.");
  return <Navigate to="/dashboard" replace />;
};
