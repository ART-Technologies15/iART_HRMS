import React from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import AttendanceReport from "./pages/AttendanceReport";
import AdminAttendance from "./pages/AdminAttendance";
import Account from "./pages/Account";
import Layout from "./pages/Layout";
import LeavesPage from "./pages/LeaveManagement";
import AdminUsersPage from "./pages/AdminUsersPage";
import AdminAttendanceReport from "./pages/AdminAttendanceReport";
import PhoneBookPage from "./pages/PhoneBookPage";
import { ToastContainer } from "react-toastify";

import { PublicRoute, PrivateRoute } from "./routes/RouteGuard";
import { AdminRoute, EmployeeRoute } from "./routes/RoleRoute";
import YearCalendar from "./pages/Calendar";
import DashboardRouter from "./routes/DashboardRouter";
import AdminMonthlyAttendance from "./pages/AdminMonthlyAttendance";
import Notification from "./pages/Notification";

const App = () => {
  return (
    <>
      <ToastContainer position="top-center" autoClose={3000} />

      <Routes>
        {/* Public (Login only when logged out) */}
        <Route
          path="/"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        {/* Protected Layout */}
        <Route
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          {/* Everyone */}
          <Route path="/dashboard" element={<DashboardRouter />} />
          <Route path="/leave" element={<LeavesPage />} />
          <Route path="/account" element={<Account />} />
          <Route
            path="/attendance"
            element={
              <EmployeeRoute>
                <AttendanceReport />
              </EmployeeRoute>
            }
          />
          <Route path="/phone-book" element={<PhoneBookPage />} />
          <Route path="/calendar" element={<YearCalendar />} />
          {/* Admin only */}
          <Route
            path="/users"
            element={
              <AdminRoute>
                <AdminUsersPage />
              </AdminRoute>
            }
          />
          <Route
            path="/today-attendance"
            element={
              <AdminRoute>
                <AdminAttendance />
              </AdminRoute>
            }
          />
          <Route
            path="/monthly-attendance"
            element={
              <AdminRoute>
                <AdminMonthlyAttendance />
              </AdminRoute>
            }
          />
          <Route
            path="/user-attendance"
            element={
              <AdminRoute>
                <AdminAttendanceReport />
              </AdminRoute>
            }
          />
          <Route
            path="/notification"
            element={
              <AdminRoute>
                <Notification />
              </AdminRoute>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
        <Route
          path="/admin-dashboard"
          element={<Navigate to="/dashboard" replace />}
        />
      </Routes>
    </>
  );
};

export default App;
