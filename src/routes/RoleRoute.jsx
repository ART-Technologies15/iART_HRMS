import { Navigate } from "react-router-dom";
import { toast } from "react-toastify";

export const AdminRoute = ({ children }) => {
  const user = JSON.parse(localStorage.getItem("user"));
  if (user?.role === "admin") return children;

  toast.error("Access denied. Admins only.");
  return <Navigate to="/dashboard" replace />;
};

export const HrRoute = ({ children }) => {
  const user = JSON.parse(localStorage.getItem("user"));
  if (user?.role === "hr") return children;

  toast.error("Access denied. HR only.");
  return <Navigate to="/dashboard" replace />;
};

export const EmployeeRoute = ({ children }) => {
  const user = JSON.parse(localStorage.getItem("user"));
  if (user?.role !== "admin") return children;

  toast.error("This page is only for employees.");
  return <Navigate to="/dashboard" replace />;
};

export const AdminHrRoute = ({ children }) => {
  const user = JSON.parse(localStorage.getItem("user"));

  const allowedRoles = ["admin", "hr"];

  if (allowedRoles.includes(user?.role)) {
    return children;
  }

  toast.error("Access denied. Admin or HR only.");
  return <Navigate to="/dashboard" replace />;
};
