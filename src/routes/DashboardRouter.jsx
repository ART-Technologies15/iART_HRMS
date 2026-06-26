// src/pages/DashboardRouter.jsx
import React from "react";
import { useAuth } from "../context/AuthContext";
import Dashboard from "../pages/Dashboard";
import AdminDashboard from "../pages/AdminDashboard";

const DashboardRouter = () => {
  const { user } = useAuth();

  if (!user) return null; // or loader

  return user.role === "admin" ? <AdminDashboard /> : <Dashboard />;
};

export default DashboardRouter;
