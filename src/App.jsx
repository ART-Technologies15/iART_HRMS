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
import { AdminHrRoute, AdminRoute, EmployeeRoute, HrRoute } from "./routes/RoleRoute";
import YearCalendar from "./pages/Calendar";
import DashboardRouter from "./routes/DashboardRouter";
import AdminMonthlyAttendance from "./pages/AdminMonthlyAttendance";
import Notification from "./pages/Notification";
import Regularization from "./pages/Regularization";
import AdminAssestsPage from "./pages/AdminAssestsPage";
import MyAssetsPage from "./pages/MyAssetsPage";
import PublicAssetPage from "./pages/PublicAssetPage";
import AdminPendingVerificationRequest from "./pages/AdminPendingVerificationRequest";

const App = () => {
  return (
    <>
      <ToastContainer position="top-center" autoClose={3000} />

      <Routes>
        {/* Public Asset QR Route */}
        <Route path="/asset/:assetId" element={<PublicAssetPage />} />

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
          <Route
            path="/my-assets"
            element={
              <EmployeeRoute>
                <MyAssetsPage />
              </EmployeeRoute>
            }
          />
          <Route
            path="/my-assets"
            element={
              <HrRoute>
                <MyAssetsPage />
              </HrRoute>
            }
          />
          <Route path="/phone-book" element={<PhoneBookPage />} />
          <Route path="/calendar" element={<YearCalendar />} />
          {/* Admin and HR only */}
          <Route
            path="/users"
            element={
              <AdminHrRoute>
                <AdminUsersPage />
              </AdminHrRoute>
            }
          />
          <Route
            path="/document-kyc"
            element={
              <AdminHrRoute>
                <AdminPendingVerificationRequest />
              </AdminHrRoute>
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
              <AdminHrRoute>
                <AdminAttendanceReport />
              </AdminHrRoute>
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

          {/* Admin and HR only */}
          <Route
            path="/regularization"
            element={
              <AdminHrRoute>
                <Regularization />
              </AdminHrRoute>
            }
          />
          <Route
            path="/assets"
            element={
              <AdminHrRoute>
                <AdminAssestsPage />
              </AdminHrRoute>
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
