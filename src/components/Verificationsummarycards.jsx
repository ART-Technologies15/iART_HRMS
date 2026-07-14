import React, { useState } from "react";
import { Users, CheckCircle2, ShieldCheck, AlertTriangle, Clock3 } from "lucide-react";
import NotSubmittedUsersModal from "./NotSubmittedUsersModal";

/**
 * Summary stat cards for AdminPendingVerificationRequest.
 *
 * Drop this in above the search bar. It reads directly off the
 * `summary` object already present in your getVerificationRequests
 * response — no extra API call needed.
 *
 * Usage in AdminPendingVerificationRequest.jsx:
 *
 *   const [summary, setSummary] = useState(null);
 *   ...
 *   if (res?.success) {
 *     setRequests(res.users);
 *     setSummary(res.summary);
 *     ...
 *   }
 *   ...
 *   <VerificationSummaryCards summary={summary} />
 */
const VerificationSummaryCards = ({ summary }) => {
    const [showNotSubmitted, setShowNotSubmitted] = useState(false);

    if (!summary) return null;

    const {
        totalEmployees,
        submittedCount,
        approvedCount,
        pendingCount,
        notSubmittedCount,
        notSubmittedUsers = [],
    } = summary;

    const cards = [
        {
            key: "total",
            label: "Total Employees",
            value: totalEmployees,
            sub: "In KYC scope",
            icon: Users,
            accent: "bg-blue-50 text-blue-600",
            ring: "ring-blue-100",
        },
        {
            key: "submitted",
            label: "Submitted",
            value: submittedCount,
            sub: `${totalEmployees ? Math.round((submittedCount / totalEmployees) * 100) : 0}% of total`,
            icon: CheckCircle2,
            accent: "bg-indigo-50 text-indigo-600",
            ring: "ring-indigo-100",
        },
        {
            key: "approved",
            label: "Approved",
            value: approvedCount,
            sub: "Fully verified",
            icon: ShieldCheck,
            accent: "bg-emerald-50 text-emerald-600",
            ring: "ring-emerald-100",
        },
        {
            key: "pending",
            label: "Pending Review",
            value: pendingCount,
            sub: "Awaiting your action",
            icon: Clock3,
            accent: "bg-rose-50 text-rose-600",
            ring: "ring-rose-100",
        },
        {
            key: "notSubmitted",
            label: "Not Submitted",
            value: notSubmittedCount,
            sub: notSubmittedCount ? "Click to view list" : "All caught up",
            icon: AlertTriangle,
            accent: "bg-amber-50 text-amber-600",
            ring: "ring-amber-100",
            clickable: notSubmittedCount > 0,
            onClick: () => setShowNotSubmitted(true),
        },
    ];

    return (
        <>
            <div className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                {cards.map(({ key, label, value, sub, icon: Icon, accent, ring, clickable, onClick }) => {
                    const CardTag = clickable ? "button" : "div";
                    return (
                        <CardTag
                            key={key}
                            type={clickable ? "button" : undefined}
                            onClick={clickable ? onClick : undefined}
                            className={`text-left bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 ring-1 ${ring} ring-inset w-full ${clickable ? "cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all" : ""
                                }`}
                        >
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-2xl sm:text-3xl font-semibold text-slate-800 tabular-nums">
                                        {value ?? 0}
                                    </p>
                                    <p className="text-sm font-medium text-slate-600 mt-0.5">{label}</p>
                                    <p className={`text-xs mt-1 ${clickable ? "text-amber-600 font-medium" : "text-slate-400"}`}>
                                        {sub}
                                    </p>
                                </div>
                                <div className={`shrink-0 rounded-xl p-2 ${accent}`}>
                                    <Icon size={18} strokeWidth={2} />
                                </div>
                            </div>
                        </CardTag>
                    );
                })}
            </div>

            <NotSubmittedUsersModal
                open={showNotSubmitted}
                onClose={() => setShowNotSubmitted(false)}
                users={notSubmittedUsers}
            />
        </>
    );
};

export default VerificationSummaryCards;