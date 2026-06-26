import React from "react";
import { X, Mail, Phone, MapPin, Briefcase } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const Row = ({ label, value }) => (
  <div className="flex items-start justify-between gap-4 py-2 border-b last:border-b-0">
    <span className="text-sm text-gray-500 min-w-28">{label}</span>
    <span className="text-sm font-medium text-gray-800 text-right">
      {value || "-"}
    </span>
  </div>
);

const UserDetailsModal = ({ open, onClose, user }) => {
  const { user: loggedInUser } = useAuth(); // ✅ current logged-in user

  const canViewLeaveInfo =
    loggedInUser?.role === "admin" || loggedInUser?._id === user?._id;

  const formattedDate = user?.leaveInfo?.updatedOn
    ? new Date(user.leaveInfo.updatedOn).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "-";

  if (!open || !user) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 px-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
          <h3 className="text-lg font-semibold">User Details</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-md"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
              {user.name?.[0] || "U"}
            </div>
            <div>
              <div className="text-base font-semibold">{user.name}</div>
              <div className="text-xs text-gray-500">
                {user.designation} • {user.department}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center gap-2 text-sm">
              <Mail size={16} className="text-gray-500" />
              <span className="text-gray-700">{user.email}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone size={16} className="text-gray-500" />
              <span className="text-gray-700">
                {user.mobile}
                {loggedInUser.role === "admin" && user.alternateMobile
                  ? ` / ${user.alternateMobile}`
                  : ""}
              </span>
            </div>
            {loggedInUser.role === "admin" && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin size={16} className="text-gray-500" />
                <span className="text-gray-700">{user.address}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Briefcase size={16} className="text-gray-500" />
              <span className="text-gray-700">{user.role}</span>
            </div>
          </div>

          <div className="mt-2 rounded-lg border">
            <div className="px-4 py-2 border-b bg-gray-50 text-sm font-semibold">
              More Info
            </div>
            <div className="px-4">
              <Row label="Department" value={user.department} />
              <Row label="Designation" value={user.designation} />
              {loggedInUser.role === "admin" && (
                <Row label="Address" value={user.address} />
              )}
              <Row label="Primary Mobile" value={user.mobile} />
              {loggedInUser.role === "admin" && (
                <Row label="Alternate Mobile" value={user.alternateMobile} />
              )}
              {loggedInUser.role === "admin" && (
                <Row label="Pan No." value={user.pan} />
              )}
              {loggedInUser.role === "admin" && (
                <Row label="Aadhar" value={user.aadhar} />
              )}
              {loggedInUser.role === "admin" && (
                <Row
                  label="Bank Details"
                  value={
                    user?.bankDetails
                      ? `${user.bankDetails.accountNumber || "-"} (${
                          user.bankDetails.bankName || "-"
                        })`
                      : "-"
                  }
                />
              )}
              {loggedInUser.role === "admin" && (
                <Row
                  label="IFSC"
                  value={
                    user?.bankDetails
                      ? `${user.bankDetails.iFSC || "-"}`
                      : "-"
                  }
                />
              )}
              {canViewLeaveInfo && (
                <>
                <Row
                  label="Leave Balance"
                  value={`${
                    user.leaveInfo?.balance ?? 0
                  } (Last updated: ${formattedDate})`}
                />
                 <Row
                  label="LOP Previous Month"
                  value={`${
                    user.leaveInfo?.extraLOP ?? 0
                  } (Last updated: ${formattedDate})`}
                />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md border hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserDetailsModal;
