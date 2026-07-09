import React from "react";
import { Phone, Mail, MapPin, Briefcase, UserCircle, Cake, CalendarDays, IdCard } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const getInitials = (name = "") =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

const formatDOB = (dob) => {
  if (!dob) return "-";
  return new Date(dob).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDate = (date) => {
  if (!date) return "-";

  return new Date(date).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const PhoneBookCard = ({ user, onClick }) => {
  const { user: loggedInUser } = useAuth();
  return (
    <div
      onClick={onClick}
      className="flex gap-3 sm:gap-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md border border-gray-100 transition cursor-pointer
                 flex-col items-center text-center
                 xs:flex-row xs:items-start xs:text-left"
    >
      {/* Avatar */}
      <div
        className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-base sm:text-lg font-semibold
             bg-blue-100 text-blue-700 overflow-hidden shrink-0"
      >
        {user.profilePhoto ? (
          <img
            src={user.profilePhoto}
            alt={user.name}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          getInitials(user.name)
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 w-full space-y-1 text-sm text-gray-700">
        <div className="text-base font-semibold text-gray-900 flex items-center justify-center xs:justify-start gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 min-w-0">
            <UserCircle size={16} className="shrink-0" />
            <span className="truncate">{user.name}</span>
          </span>
          {user.employeeId && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0 bg-indigo-50 text-indigo-600 border border-indigo-100">
              {user.employeeId}
            </span>
          )}
          {user.isActive !== undefined && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${user.isActive
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-600"
                }`}
            >
              {user.isActive ? "Active" : "Inactive"}
            </span>
          )}
        </div>

        <div className="text-gray-600 flex items-center justify-center xs:justify-start gap-1 truncate">
          <Briefcase size={14} className="shrink-0" />
          <span className="truncate">{user.designation}</span>
        </div>

        <div className="text-gray-600 flex items-center justify-center xs:justify-start gap-1">
          <Cake size={14} className="shrink-0" />
          <span className="truncate">{formatDOB(user.dateOfBirth)}</span>
        </div>

        <div className="flex items-center justify-center xs:justify-start gap-1 flex-wrap">
          <Phone size={14} className="shrink-0" />
          <span>{user.mobile}</span>
          {user.alternateMobile && loggedInUser.role === "admin" && (
            <span className="text-gray-500 text-xs">
              • {user.alternateMobile}
            </span>
          )}
        </div>

        <div className="flex items-center justify-center xs:justify-start gap-1 min-w-0">
          <Mail size={14} className="shrink-0" />
          <span className="truncate" title={user.email}>{user.email}</span>
        </div>

        <div className="text-gray-600 flex items-center justify-center xs:justify-start gap-1 truncate">
          <Briefcase size={14} className="shrink-0" />
          <span className="truncate">
            {user.department} • {user.role}
          </span>
        </div>

        <div className="text-gray-600 flex items-center justify-center xs:justify-start gap-1">
          <CalendarDays size={14} className="shrink-0" />
          <span className="truncate">Joined: {formatDate(user.joiningDate)}</span>
        </div>

        {loggedInUser.role === "admin" && (
          <div className="flex items-center justify-center xs:justify-start gap-1 text-gray-500 text-xs min-w-0">
            <MapPin size={14} className="shrink-0" />
            <span className="truncate">{user.address}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PhoneBookCard;