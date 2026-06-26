import React from "react";
import { Phone, Mail, MapPin, Briefcase, UserCircle, Cake, CalendarDays } from "lucide-react";
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
      className="flex gap-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md border border-gray-100 transition cursor-pointer
                 flex-col sm:flex-row sm:items-center"
    >
      {/* Avatar */}
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center text-lg font-semibold
             bg-blue-100 text-blue-700 self-center sm:self-start overflow-hidden shrink-0"
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
      <div className="flex-1 space-y-1 text-sm text-gray-700">
        <div className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <UserCircle size={16} /> {user.name}
          {user.isActive !== undefined && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${user.isActive
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-600'
              }`}>
              {user.isActive ? 'Active' : 'Inactive'}
            </span>
          )}
        </div>

        <div className="text-gray-600 flex items-center gap-1">
          <Briefcase size={14} /> {user.designation}
        </div>

        <div className="text-gray-600 flex items-center gap-1">
          <CalendarDays size={14} />
          Joined: {formatDate(user.joiningDate)}
        </div>

        <div className="text-gray-600 flex items-center gap-1">
          <Cake size={14} />
          {formatDOB(user.dateOfBirth)}
        </div>

        <div className="flex items-center gap-1">
          <Phone size={14} />
          {user.mobile}
          {user.alternateMobile && loggedInUser.role === "admin" && (
            <span className="text-gray-500 text-xs">
              • {user.alternateMobile}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 max-w-[240px] truncate">
          <Mail size={14} /> <span className="truncate">{user.email}</span>
        </div>

        <div className="flex items-center gap-1">
          <Briefcase size={14} /> {user.department} • {user.role}
        </div>
        {loggedInUser.role === "admin" && (
          <div className="flex items-center gap-1 text-gray-500 text-xs truncate max-w-[250px]">
            <MapPin size={14} className="shrink-0" />
            <span className="truncate">{user.address}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PhoneBookCard;
