import React from "react";
import { X, Mail, Phone, MapPin, Wallet, ExternalLink, CalendarDays } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const Row = ({ label, value }) => (
  <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2.5 last:border-b-0">
    <span className="min-w-28 text-xs font-medium text-slate-400">
      {label}
    </span>
    <span className="text-right text-sm font-medium text-slate-700">
      {value || "-"}
    </span>
  </div>
);

const DocumentRow = ({ label, file, verified, verifiedBy, verifiedAt, }) => (
  <div className="border-b border-slate-100 py-3 last:border-b-0">
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs font-medium text-slate-400">
        {label}
      </span>

      {file ? (
        <a
          href={file}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-600 transition hover:bg-indigo-100"
        >
          View document <ExternalLink size={11} />
        </a>
      ) : (
        <span className="rounded-md border border-dashed border-slate-200 px-2.5 py-1 text-xs text-slate-400">
          Not uploaded
        </span>
      )}
    </div>

    {verified && (
      <div className="mt-2 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
        <div>
          <span className="font-semibold">Verified By:</span>{" "}
          {verifiedBy?.name || "-"}
        </div>

        <div>
          <span className="font-semibold">Verified On:</span>{" "}
          {formatDate(verifiedAt)}
        </div>
      </div>
    )}
  </div>
);

const Card = ({ title, children }) => (
  <div className="overflow-hidden rounded-xl border border-slate-200">
    <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
      {title}
    </div>
    <div className="px-4">{children}</div>
  </div>
);

const formatDate = (date) => {
  if (!date) return "-";

  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const UserDetailsModal = ({ open, onClose, user }) => {
  const { user: loggedInUser } = useAuth(); // ✅ current logged-in user

  const isAdmin = loggedInUser?.role === "admin";
  const isHr = loggedInUser?.role === "hr";
  const canViewLeaveInfo = isAdmin || isHr || loggedInUser?._id === user?._id;

  const formattedDate = user?.leaveInfo?.updatedOn
    ? new Date(user.leaveInfo.updatedOn).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    : "-";

  if (!open || !user) return null;

  const balance = user.leaveInfo?.balance ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-base font-semibold text-slate-900">
            User Details
          </h3>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="space-y-5 overflow-y-auto px-6 py-5">
          {/* Identity */}
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-slate-200 bg-slate-100">
              {user.profilePhoto ? (
                <img
                  src={user.profilePhoto}
                  alt={user.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-500 to-indigo-700 text-xl font-semibold text-white">
                  {user.name?.[0]?.toUpperCase() || "U"}
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-base font-semibold text-slate-900">
                  {user.name}
                </span>

                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${user.role === "admin"
                    ? "bg-indigo-50 text-indigo-600"
                    : "bg-slate-100 text-slate-500"
                    }`}
                >
                  {user.role}
                </span>
              </div>

              <div className="truncate text-xs text-slate-400">
                {user.designation || "-"}
                {user.designation && user.department ? " • " : " "}
                {user.department}
              </div>

              {user.profilePhoto && (
                <a
                  href={user.profilePhoto}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
                >
                  View Profile Photo <ExternalLink size={11} />
                </a>
              )}
            </div>
          </div>

          {/* Quick contact */}
          <div className="space-y-2.5 rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2.5 text-sm text-slate-600">
              <Mail size={15} className="shrink-0 text-slate-400" />
              <span className="truncate">{user.email}</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm text-slate-600">
              <Phone size={15} className="shrink-0 text-slate-400" />
              <span>
                {user.mobile}
                {(isAdmin || isHr) && user.alternateMobile
                  ? ` / ${user.alternateMobile}`
                  : ""}
              </span>
            </div>
            {(isAdmin || isHr) && (
              <div className="flex items-center gap-2.5 text-sm text-slate-600">
                <MapPin size={15} className="shrink-0 text-slate-400" />
                <span className="truncate">{user.address || "-"}</span>
              </div>
            )}
          </div>

          {/* Employment */}
          <Card title="Employment">
            <Row label="Employee ID" value={user.employeeId} />
            <Row label="Department" value={user.department} />
            <Row label="Designation" value={user.designation} />

            <Row
              label="Joining Date"
              value={formatDate(user.joiningDate)}
            />

            {(isAdmin || isHr) && <Row label="Address" value={user.address} />}

            <Row label="Primary Mobile" value={user.mobile} />

            {(isAdmin || isHr) && (
              <Row label="Alternate Mobile" value={user.alternateMobile} />
            )}
          </Card>

          {/* Identity & Bank — admin only */}
          {(isAdmin || isHr) && (
            <Card title="Identity & Banking">
              <Row label="PAN No." value={user.pan} />
              <Row label="Aadhaar" value={user.aadhaar} />
              <Row
                label="Bank Details"
                value={
                  user?.bankDetails
                    ? `${user.bankDetails.accountNumber || "-"} (${user.bankDetails.bankName || "-"
                    })`
                    : "-"
                }
              />
              <Row label="IFSC" value={user?.bankDetails?.ifsc} />
            </Card>
          )}

          {/* Documents — admin only */}
          {(isAdmin || isHr) && (
            <Card title="Documents">
              <DocumentRow
                label="PAN Document"
                file={user?.panFile}
                verified={user?.isPanVerified}
                verifiedBy={user?.panVerifiedBy}
                verifiedAt={user?.panVerifiedAt}
              />
              <DocumentRow
                label="Aadhaar Document"
                file={user?.aadhaarFile}
                verified={user?.isAadhaarVerified}
                verifiedBy={user?.aadhaarVerifiedBy}
                verifiedAt={user?.aadhaarVerifiedAt}
              />
              <DocumentRow
                label="Passbook"
                file={user?.bankDetails?.passbookFile}
                verified={user?.isBankVerified}
                verifiedBy={user?.bankVerifiedBy}
                verifiedAt={user?.bankVerifiedAt}
              />
            </Card>
          )}

          {/* Leave */}
          {canViewLeaveInfo && (
            <Card title="Leave">
              <div className="flex items-center justify-between py-2.5">
                <span className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                  <Wallet size={13} /> Leave Balance
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${balance < 0
                    ? "bg-rose-50 text-rose-600"
                    : "bg-emerald-50 text-emerald-600"
                    }`}
                >
                  {balance}
                </span>
              </div>
              <Row label="Last Updated" value={formattedDate} />
              <Row
                label="LOP Previous Month"
                value={user.leaveInfo?.extraLOP ?? 0}
              />
            </Card>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 justify-end border-t border-slate-100 px-6 py-3.5">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 cursor-pointer px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserDetailsModal;