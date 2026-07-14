import React from "react";
import { X, UserX, Mail } from "lucide-react";

/**
 * Lists employees who have not submitted any KYC documents at all
 * (as opposed to "pending review" — these people haven't started).
 *
 * Props:
 *   open: boolean
 *   onClose: () => void
 *   users: array of { _id, name, role, department, designation, profilePhoto? }
 */
const NotSubmittedUsersModal = ({ open, onClose, users = [] }) => {
    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-2.5">
                        <div className="rounded-xl bg-amber-50 text-amber-600 p-2">
                            <UserX size={18} strokeWidth={2} />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-slate-800">Not Submitted</h2>
                            <p className="text-xs text-slate-400">
                                {users.length} employee{users.length === 1 ? "" : "s"} haven't started KYC
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 hover:bg-gray-50 rounded-lg p-1.5 cursor-pointer"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="max-h-[60vh] overflow-y-auto">
                    {users.length === 0 ? (
                        <div className="p-8 text-center text-sm text-slate-400">
                            Everyone has submitted their documents.
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-100">
                            {users.map((u) => (
                                <li key={u._id} className="flex items-center gap-3 px-5 py-3">
                                    {u.profilePhoto ? (
                                        <img
                                            src={u.profilePhoto}
                                            alt={u.name}
                                            className="w-9 h-9 rounded-full object-cover shrink-0"
                                        />
                                    ) : (
                                        <div className="w-9 h-9 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center text-xs font-semibold shrink-0">
                                            {u.name?.charAt(0)?.toUpperCase()}
                                        </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-slate-800 truncate">
                                            {u.name}
                                        </p>

                                        <p className="text-xs text-slate-500">
                                            {u.designation} • {u.department}
                                        </p>

                                        <div className="mt-2 space-y-1 text-xs text-slate-500">

                                            {u.email && (
                                                <div className="flex items-center gap-2">
                                                    <Mail size={12} className="text-slate-400" />
                                                    <span className="truncate">{u.email}</span>
                                                </div>
                                            )}

                                            {u.mobile && (
                                                <div className="flex items-center gap-2">
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        className="w-3 h-3 text-slate-400"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                        strokeWidth={2}
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            d="M3 5a2 2 0 012-2h3l2 5-2 1a16 16 0 007 7l1-2 5 2v3a2 2 0 01-2 2h-1C10.82 21 3 13.18 3 4V5z"
                                                        />
                                                    </svg>

                                                    <span>{u.mobile}</span>
                                                </div>
                                            )}

                                            {u.alternateMobile && (
                                                <div className="flex items-center gap-2">
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        className="w-3 h-3 text-slate-400"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                        strokeWidth={2}
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            d="M3 5a2 2 0 012-2h3l2 5-2 1a16 16 0 007 7l1-2 5 2v3a2 2 0 01-2 2h-1C10.82 21 3 13.18 3 4V5z"
                                                        />
                                                    </svg>

                                                    <span>{u.alternateMobile}</span>
                                                </div>
                                            )}

                                        </div>
                                    </div>
                                    {u.role && (
                                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-50 text-slate-500 shrink-0">
                                            {u.role.toUpperCase()}
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NotSubmittedUsersModal;