import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { updateUser, getProfileAccount } from "../api/authApi";
import { toast } from "react-toastify";
import { Eye, EyeOff, User, Lock, Upload, ExternalLink, Pencil } from "lucide-react";

// ── Primitives ────────────────────────────────────────────

const Field = ({ label, children }) => (
  <div>
    <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
      {label}
    </label>
    {children}
  </div>
);

const Input = ({ label, name, type = "text", value, onChange, disabled, ...rest }) => (
  <Field label={label}>
    <input
      type={type} name={name} value={value} onChange={onChange} disabled={disabled}
      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800
                 focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none
                 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed transition"
      {...rest}
    />
  </Field>
);

const Tel10 = ({ label, name, value, onChange }) => {
  const handleInput = (e) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
    onChange({ target: { name, value: digits } });
  };
  return (
    <Field label={label}>
      <input
        type="tel" value={value} onInput={handleInput} maxLength={10}
        placeholder="9876543210"
        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800
                   focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition"
      />
      <p className="text-xs text-gray-400 mt-1">10 digits required</p>
    </Field>
  );
};

const PasswordField = ({ label, name, value, onChange }) => {
  const [show, setShow] = useState(false);
  return (
    <Field label={label}>
      <div className="relative">
        <input
          type={show ? "text" : "password"} name={name} value={value} onChange={onChange}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 pr-10 text-sm text-gray-800
                     focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition"
        />
        <button type="button" onClick={() => setShow(s => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </Field>
  );
};

const FileUpload = ({ label, name, onChange, existingUrl, existingLabel, selectedFile, disabled = false, }) => (
  <Field label={label}>
    <label
      className={`flex items-center gap-2 border border-dashed rounded-lg
      px-3 py-2.5 transition group
      ${disabled
          ? "border-gray-200 bg-gray-100 cursor-not-allowed opacity-70"
          : selectedFile
            ? "border-blue-400 bg-blue-50 cursor-pointer"
            : "border-gray-300 hover:border-blue-400 hover:bg-blue-50 cursor-pointer"
        }`}
    >
      <Upload
        size={14}
        className={`flex-shrink-0 ${disabled
          ? "text-gray-400"
          : selectedFile
            ? "text-blue-500"
            : "text-gray-400 group-hover:text-blue-500"
          }`}
      />

      <span
        className={`text-xs truncate ${disabled
          ? "text-gray-400"
          : selectedFile
            ? "text-blue-600 font-medium"
            : "text-gray-500 group-hover:text-blue-600"
          }`}
      >
        {selectedFile
          ? selectedFile.name
          : disabled
            ? "Document Verified"
            : "Click to upload (PDF, JPG, PNG)"}
      </span>

      {!disabled && (
        <input
          type="file"
          name={name}
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={onChange}
          className="hidden"
        />
      )}
    </label>

    {/* existing preview code... */}
  </Field>
);

// ── View row ─────────────────────────────────────────────

const ViewRow = ({ label, value }) => (
  <div className="py-3 border-b border-gray-100 last:border-0">
    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
    <p className="text-sm font-medium text-gray-800">{value || "—"}</p>
  </div>
);

// ── File View ────────────────────────────────────────

const FileView = ({ label, url }) => (
  <div className="py-3 border-b border-gray-100 last:border-0">
    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
      {label}
    </p>

    {url ? (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
      >
        <ExternalLink size={15} />
        View File
      </a>
    ) : (
      <p className="text-sm text-gray-500">Not Uploaded</p>
    )}
  </div>
);

// ── Verification status badge ───────────────────────────────

const STATUS_STYLES = {
  verified: { label: "Verified", cls: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  pending: { label: "Pending review", cls: "bg-amber-50 text-amber-700 border-amber-100" },
  rejected: { label: "Rejected", cls: "bg-red-50 text-red-700 border-red-100" },
  unverified: { label: "Not verified", cls: "bg-gray-50 text-gray-500 border-gray-200" },
};

const StatusBadge = ({ status }) => {
  const s = STATUS_STYLES[status] || STATUS_STYLES.unverified;
  return (
    <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full border ${s.cls}`}>
      {s.label}
    </span>
  );
};

// field: "pan" | "aadhaar" | "bank"
const getFieldStatus = (user, field) => {
  const pv = user?.pendingVerification?.[field];
  if (pv?.status === "pending") return "pending";
  if (pv?.status === "rejected") return "rejected";

  const verifiedKey =
    field === "bank" ? "isBankVerified" : field === "pan" ? "isPanVerified" : "isAadhaarVerified";

  return user?.[verifiedKey] ? "verified" : "unverified";
};

// ── Pending / rejected submission note ──────────────────────

const PendingNote = ({ field, user }) => {
  const pv = user?.pendingVerification?.[field];
  if (!pv || (pv.status !== "pending" && pv.status !== "rejected")) return null;

  const isRejected = pv.status === "rejected";
  const docUrl = field === "bank" ? pv.cancelledChequeFile || pv.passbookFile : pv.file;

  return (
    <div
      className={`mt-2 rounded-lg border px-3 py-2 text-xs ${isRejected ? "bg-red-50 border-red-100 text-red-700" : "bg-amber-50 border-amber-100 text-amber-700"
        }`}
    >
      <p className="font-medium">{isRejected ? "Resubmission needed" : "Awaiting admin/HR review"}</p>

      {field === "bank" ? (
        <p className="mt-0.5">
          Submitted: {pv.bankName || "—"} · {pv.accountNumber || "—"} · {pv.ifsc || "—"}
          {docUrl && (
            <>
              {" "}
              ·{" "}
              <a href={docUrl} target="_blank" rel="noopener noreferrer" className="underline">
                view document
              </a>
            </>
          )}
        </p>
      ) : (
        <p className="mt-0.5">
          Submitted: {pv.number || "—"}
          {docUrl && (
            <>
              {" "}
              ·{" "}
              <a href={docUrl} target="_blank" rel="noopener noreferrer" className="underline">
                view document
              </a>
            </>
          )}
        </p>
      )}

      {isRejected && pv.rejectionReason && (
        <p className="mt-1 italic">Reason: {pv.rejectionReason}</p>
      )}
    </div>
  );
};

// ── Section header ────────────────────────────────────────

const SectionHeading = ({ title }) => (
  <div className="col-span-full mt-2 mb-1">
    <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest">{title}</p>
    <div className="h-px bg-blue-100 mt-1" />
  </div>
);

// ── Avatar initials ───────────────────────────────────────

const Avatar = ({ name, profilePhoto }) => {
  const initials = (name || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="w-full h-full">
      {profilePhoto ? (
        <img
          src={profilePhoto}
          alt={name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-blue-600 text-2xl font-semibold">
          {initials}
        </div>
      )}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────

const Account = () => {
  const { user, setUser, logout } = useAuth();
  const isAdmin = user?.role === "admin";

  const initialFormRef = useRef(null);

  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "", email: "", role: "", mobile: "", alternateMobile: "",
    address: "", department: "", designation: "", pan: "", aadhaar: "",
    accountNumber: "", ifsc: "", bankName: "", dateOfBirth: "", joiningDate: "", employeeId: "",
  });

  const [selectedFiles, setSelectedFiles] = useState({
    profilePhoto: null, panFile: null, aadhaarFile: null, cancelledChequeFile: null, passbookFile: null,
  });

  const [pwd, setPwd] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
  const [profilePreview, setProfilePreview] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const onFileChange = (e) => {
    const { name, files } = e.target;
    setSelectedFiles(p => ({ ...p, [name]: files[0] || null }));
  };

  useEffect(() => {
    if (!selectedFiles.profilePhoto) {
      setProfilePreview(null);
      return;
    }

    const url = URL.createObjectURL(selectedFiles.profilePhoto);
    setProfilePreview(url);

    return () => URL.revokeObjectURL(url);
  }, [selectedFiles.profilePhoto]);

  useEffect(() => {
    if (!user) return;
    setFormData({
      name: user.name || "",
      email: user.email || "",
      role: user.role || "",
      mobile: user.mobile || "",
      alternateMobile: user.alternateMobile || "",
      address: user.address || "",
      department: user.department || "",
      designation: user.designation || "",
      pan: user.pan || "",
      aadhaar: user.aadhaar || "",
      accountNumber: user.bankDetails?.accountNumber || "",
      ifsc: user.bankDetails?.ifsc || "",
      bankName: user.bankDetails?.bankName || "",
      dateOfBirth: user.dateOfBirth
        ? new Date(user.dateOfBirth).toISOString().split("T")[0]
        : "",
      joiningDate: user.joiningDate
        ? new Date(user.joiningDate).toISOString().split("T")[0]
        : "",
      employeeId: user.employeeId || "",
    });
  }, [user]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await getProfileAccount();

        if (res?.success) {
          // API returns users: profile
          const profile = res.user;

          setUser(profile);
          localStorage.setItem("user", JSON.stringify(profile));
        }
      } catch (error) {
        console.error("Failed to fetch profile:", error);
        toast.error("Failed to load profile.");
      }
    };

    fetchProfile();
  }, [setUser]);

  const onProfileChange = (e) => {
    const { name, value } = e.target;
    setFormData(p => ({ ...p, [name]: value }));
  };

  const validateProfile = () => {
    if (!formData.name.trim()) return "Name is required.";
    if (!formData.email.trim()) return "Email is required.";
    if (formData.mobile.length !== 10) return "Mobile must be 10 digits.";
    if (formData.alternateMobile && formData.alternateMobile.length !== 10)
      return "Alternate mobile must be 10 digits.";
    if (!formData.address.trim()) return "Address is required.";
    if (formData.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(formData.pan))
      return "Invalid PAN format (ABCDE1234F).";
    if (formData.aadhaar && !/^[0-9]{12}$/.test(formData.aadhaar))
      return "Aadhaar must be 12 digits.";
    if (formData.accountNumber && !/^[0-9]{9,18}$/.test(formData.accountNumber))
      return "Account number must be 9–18 digits.";
    if (formData.ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifsc))
      return "Invalid IFSC format.";
    if (!formData.dateOfBirth) return "Date of birth is required.";
    const dob = new Date(formData.dateOfBirth);
    if (isNaN(dob.getTime())) return "Invalid date of birth.";
    const age = Math.floor((Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
    if (age < 18) return "Employee must be at least 18 years old.";

    if (!formData.joiningDate)
      return "Joining date is required.";

    const joiningDate = new Date(formData.joiningDate);

    if (isNaN(joiningDate.getTime()))
      return "Invalid joining date.";

    if (joiningDate < dob)
      return "Joining date cannot be before date of birth.";

    if (joiningDate > new Date())
      return "Joining date cannot be in the future.";

    if (formData.pan && !user?.panFile && !selectedFiles.panFile)
      return "Please upload PAN document.";
    if (formData.aadhaar && !user?.aadhaarFile && !selectedFiles.aadhaarFile)
      return "Please upload Aadhaar document.";
    if (formData.accountNumber && !user?.bankDetails?.passbookFile && !selectedFiles.passbookFile)
      return "Please upload Bank Passbook.";

    // ==========================================================
    // Mandatory Documents (Only if missing in profile)
    // ==========================================================

    const missingPAN =
      !user?.pan || !user?.panFile;

    const missingAadhaar =
      !user?.aadhaar || !user?.aadhaarFile;

    const missingBank =
      !user?.bankDetails?.bankName ||
      !user?.bankDetails?.accountNumber ||
      !user?.bankDetails?.ifsc ||
      !user?.bankDetails?.passbookFile;

    if (missingPAN) {
      if (!formData.pan)
        return "PAN number is mandatory.";

      if (!selectedFiles.panFile && !user?.panFile)
        return "Please upload PAN document.";
    }

    if (missingAadhaar) {
      if (!formData.aadhaar)
        return "Aadhaar number is mandatory.";

      if (!selectedFiles.aadhaarFile && !user?.aadhaarFile)
        return "Please upload Aadhaar document.";
    }

    if (missingBank) {
      if (!formData.bankName)
        return "Bank name is mandatory.";

      if (!formData.accountNumber)
        return "Account number is mandatory.";

      if (!formData.ifsc)
        return "IFSC code is mandatory.";

      if (
        !selectedFiles.passbookFile &&
        !user?.bankDetails?.passbookFile
      )
        return "Please upload Bank Passbook.";
    }
    return null;
  };


  const resetForm = () => {
    if (!user) return;

    setFormData({
      name: user.name || "",
      email: user.email || "",
      role: user.role || "",
      mobile: user.mobile || "",
      alternateMobile: user.alternateMobile || "",
      address: user.address || "",
      department: user.department || "",
      designation: user.designation || "",
      pan: user.pan || "",
      aadhaar: user.aadhaar || "",
      accountNumber: user.bankDetails?.accountNumber || "",
      ifsc: user.bankDetails?.ifsc || "",
      bankName: user.bankDetails?.bankName || "",
      dateOfBirth: user.dateOfBirth
        ? new Date(user.dateOfBirth).toISOString().split("T")[0]
        : "",
      joiningDate: user.joiningDate
        ? new Date(user.joiningDate).toISOString().split("T")[0]
        : "",
      employeeId: user.employeeId || "",
    });

    setSelectedFiles({
      profilePhoto: null,
      panFile: null,
      aadhaarFile: null,
      passbookFile: null,
      cancelledChequeFile: null,
    });

    setPwd({
      oldPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  };

  const onSubmitProfile = async (e) => {
    e.preventDefault();
    const err = validateProfile();
    if (err) return toast.error(err);
    try {
      setSaving(true);

      const initial = initialFormRef.current || formData;
      const payload = new FormData();

      // Simple scalar fields — only send if changed
      const scalarFields = [
        "name", "email", "mobile", "alternateMobile", "address",
        "dateOfBirth", "joiningDate",
      ];
      scalarFields.forEach((key) => {
        if (formData[key] !== initial[key]) {
          payload.append(key, formData[key]);
        }
      });

      // PAN / Aadhaar — only send if the number actually changed
      // (this includes clearing: "" !== "ABCDE1234F" still counts as changed,
      // which is required for the backend's clear-detection to fire)
      if (formData.pan !== initial.pan) {
        payload.append("pan", formData.pan || "");
      }
      if (formData.aadhaar !== initial.aadhaar) {
        payload.append("aadhaar", formData.aadhaar || "");
      }

      // Bank details — only include the sub-fields that changed;
      // backend merges partials with the existing record, so this is safe
      const bankChanges = {};
      if (formData.accountNumber !== initial.accountNumber) bankChanges.accountNumber = formData.accountNumber || "";
      if (formData.ifsc !== initial.ifsc) bankChanges.ifsc = formData.ifsc || "";
      if (formData.bankName !== initial.bankName) bankChanges.bankName = formData.bankName || "";
      if (Object.keys(bankChanges).length > 0) {
        payload.append("bankDetails", JSON.stringify(bankChanges));
      }

      // Files — already only appended when a new one was actually selected
      if (selectedFiles.panFile) payload.append("panFile", selectedFiles.panFile);
      if (selectedFiles.aadhaarFile) payload.append("aadhaarFile", selectedFiles.aadhaarFile);
      if (selectedFiles.passbookFile) payload.append("passbookFile", selectedFiles.passbookFile);
      if (selectedFiles.profilePhoto) payload.append("profilePhoto", selectedFiles.profilePhoto);

      // Nothing changed at all — skip the network call
      const hasFileChange = Object.values(selectedFiles).some(Boolean);
      if ([...payload.keys()].length === 0 && !hasFileChange) {
        toast.info("No changes to save.");
        setSaving(false);
        setEditMode(false);
        return;
      }

      const res = await updateUser(user._id, payload);
      if (res?.success) {
        const profileRes = await getProfileAccount();
        setUser(profileRes?.user);
        localStorage.setItem("user", JSON.stringify(profileRes?.user));
        toast.success(res?.message || "Profile updated successfully.");
        resetForm();
        setEditMode(false);
      } else {
        toast.error(res?.message || "Failed to update profile.");
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Server error.");
    } finally {
      setSaving(false);
    }
  };

  const onPwdChange = (e) => {
    const { name, value } = e.target;
    setPwd(p => ({ ...p, [name]: value }));
  };

  const validatePassword = () => {
    if (!isAdmin && !pwd.oldPassword.trim()) return "Old password is required.";
    if (!pwd.newPassword.trim()) return "New password is required.";
    if (pwd.newPassword.length < 8) return "New password must be at least 8 characters.";
    if (!isAdmin && pwd.newPassword === pwd.oldPassword)
      return "New password must differ from old.";
    if (pwd.newPassword !== pwd.confirmPassword) return "Passwords do not match.";
    return null;
  };

  const onSubmitPassword = async (e) => {
    e.preventDefault();
    const err = validatePassword();
    if (err) return toast.error(err);
    try {
      setSaving(true);
      const payload = isAdmin
        ? { newPassword: pwd.newPassword }
        : { oldPassword: pwd.oldPassword, newPassword: pwd.newPassword };

      const res = await updateUser(user._id, payload);

      if (res?.success) {
        toast.success(res?.message || "Password changed successfully.");
        logout();
      } else {
        toast.error(res?.message || "Failed to change password.");
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Server error.");
    } finally {
      setSaving(false);
    }
  };

  const isPanLocked = user?.isPanVerified;
  const isAadhaarLocked = user?.isAadhaarVerified;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">

        {/* ── Profile hero card ── */}
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 lg:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

            {/* Left Section */}
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:text-left text-center">

              {/* Avatar */}
              <div className="relative group flex-shrink-0">

                <div
                  className="w-20 h-20 rounded-full overflow-hidden bg-blue-100 border border-gray-200 shadow-sm
          transition-all duration-200 group-hover:scale-105 group-hover:shadow-md"
                >
                  <Avatar
                    name={formData.name}
                    profilePhoto={profilePreview || user?.profilePhoto}
                  />
                </div>

                {editMode && (
                  <>
                    <label
                      htmlFor="profilePhotoInput"
                      className="absolute inset-0 rounded-full bg-black/45
      flex items-center justify-center cursor-pointer transition"
                    >
                      <Pencil size={22} className="text-white" />
                    </label>

                    <input
                      id="profilePhotoInput"
                      type="file"
                      name="profilePhoto"
                      accept="image/*"
                      className="hidden"
                      onChange={onFileChange}
                    />
                  </>
                )}

                {!editMode && (profilePreview || user?.profilePhoto) && (
                  <a
                    href={user?.profilePhoto || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 flex items-center justify-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    View full <ExternalLink size={11} />
                  </a>
                )}
              </div>

              {/* User Info */}
              {/* User Info */}
              <div className="min-w-0">
                <h2 className="break-words text-lg sm:text-xl font-semibold text-gray-900">
                  {formData.name || "—"}
                </h2>

                <p className="mt-1 break-all text-sm text-gray-500">
                  {formData.email}
                </p>

                <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
                  <span
                    className="rounded-full border border-blue-100 bg-blue-50
        px-3 py-1 text-xs font-medium capitalize text-blue-600"
                  >
                    {formData.role}
                  </span>

                  {formData.employeeId && (
                    <span
                      className="rounded-full border border-gray-200 bg-gray-50
          px-3 py-1 text-xs font-medium text-gray-600"
                    >
                      ID: {formData.employeeId}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right Button */}
            <div className="w-full sm:w-auto">
              {!editMode ? (
                <button
                  onClick={() => {
                    initialFormRef.current = formData;
                    setActiveTab("profile");
                    setEditMode(true);
                  }}
                  className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg
          bg-blue-500 px-5 py-2.5 text-sm text-white transition
          hover:bg-blue-600 cursor-pointer"
                >
                  <Pencil size={15} />
                  Edit Profile
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setEditMode(false);
                  }}
                  className="w-full sm:w-auto rounded-lg border border-gray-200
          px-5 py-2.5 text-sm text-gray-600 transition
          hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>

          </div>
        </div>

        {/* ── Main card ── */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">

          {/* Tab bar (only in edit mode) */}
          {editMode && (
            <div className="flex border-b border-gray-200">
              {[
                { key: "profile", label: "Edit Profile", icon: <User size={14} /> },
                { key: "password", label: "Change Password", icon: <Lock size={14} /> },
              ].map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-6 py-3.5 text-sm font-medium border-b-2 transition
                    ${activeTab === tab.key
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>
          )}

          <div className="p-6 md:p-8">

            {/* ── VIEW MODE ── */}
            {!editMode && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
                {/* Left col */}
                <div>
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-1">Personal</p>
                  <div className="h-px bg-blue-100 mb-2" />
                  <ViewRow label="Mobile" value={formData.mobile} />
                  <ViewRow label="Alternate Mobile" value={formData.alternateMobile} />
                  <ViewRow label="Date of Birth"
                    value={formData.dateOfBirth
                      ? new Date(formData.dateOfBirth).toLocaleDateString("en-IN") : "—"} />
                  <ViewRow
                    label="Joining Date"
                    value={
                      formData.joiningDate
                        ? new Date(formData.joiningDate).toLocaleDateString("en-IN")
                        : "—"
                    }
                  />
                  <ViewRow label="Address" value={formData.address} />

                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-1 mt-6">Work</p>
                  <div className="h-px bg-blue-100 mb-2" />
                  <ViewRow label="Department" value={formData.department} />
                  <ViewRow label="Designation" value={formData.designation} />
                </div>

                {/* Right col */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest">Documents</p>
                  </div>
                  <div className="h-px bg-blue-100 mb-2" />

                  <div className="flex items-center justify-between pt-1">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">PAN</p>
                    <StatusBadge status={getFieldStatus(user, "pan")} />
                  </div>
                  <ViewRow label="PAN Number" value={formData.pan} />
                  <FileView label="PAN Document" url={user?.panFile} />
                  <PendingNote field="pan" user={user} />

                  <div className="flex items-center justify-between pt-4">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Aadhaar</p>
                    <StatusBadge status={getFieldStatus(user, "aadhaar")} />
                  </div>
                  <ViewRow label="Aadhaar Number" value={formData.aadhaar} />
                  <FileView label="Aadhaar Document" url={user?.aadhaarFile} />
                  <PendingNote field="aadhaar" user={user} />

                  <div className="flex items-center justify-between mb-1 mt-6">
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest">Bank Details</p>
                    <StatusBadge status={getFieldStatus(user, "bank")} />
                  </div>
                  <div className="h-px bg-blue-100 mb-2" />
                  <ViewRow label="Bank Name" value={formData.bankName} />
                  <ViewRow label="Account No." value={formData.accountNumber} />
                  <ViewRow label="IFSC" value={formData.ifsc} />
                  <FileView label="Passbook" url={user?.bankDetails?.passbookFile} />
                  <PendingNote field="bank" user={user} />
                </div>
              </div>
            )}

            {/* ── EDIT PROFILE ── */}
            {editMode && activeTab === "profile" && (
              <form onSubmit={onSubmitProfile} className="grid grid-cols-1 md:grid-cols-2 gap-5">

                <SectionHeading title="Personal Info" />
                <Input label="Full Name" name="name" value={formData.name} onChange={onProfileChange} />
                <Input label="Email" name="email" type="email" value={formData.email} onChange={onProfileChange} />
                <Input label="Date of Birth" name="dateOfBirth" type="date" value={formData.dateOfBirth} onChange={onProfileChange} />
                {/* <Input label="Joining Date" name="joiningDate" type="date" value={formData.joiningDate} onChange={onProfileChange} /> */}
                <Tel10 label="Mobile" name="mobile" value={formData.mobile} onChange={onProfileChange} />
                <Tel10 label="Alternate Mobile" name="alternateMobile" value={formData.alternateMobile} onChange={onProfileChange} />
                <div className="col-span-full">
                  <Input label="Address" name="address" value={formData.address} onChange={onProfileChange} />
                </div>

                <SectionHeading title="Documents" />
                <Input label="PAN Number" name="pan" value={formData.pan} disabled={isPanLocked}
                  onChange={e => onProfileChange({ target: { name: "pan", value: e.target.value.toUpperCase() } })} />
                <FileUpload label="PAN Document" name="panFile" disabled={isPanLocked} onChange={onFileChange}
                  existingUrl={user?.panFile} existingLabel="View current PAN"
                  selectedFile={selectedFiles.panFile} />

                <Input label="Aadhaar Number" name="aadhaar" value={formData.aadhaar} disabled={isAadhaarLocked}
                  onChange={onProfileChange} maxLength={12} />
                <FileUpload label="Aadhaar Document" name="aadhaarFile" disabled={isAadhaarLocked} onChange={onFileChange}
                  existingUrl={user?.aadhaarFile} existingLabel="View current Aadhaar"
                  selectedFile={selectedFiles.aadhaarFile} />

                <SectionHeading title="Bank Details" />
                <Input label="Bank Name" name="bankName" value={formData.bankName} onChange={onProfileChange} />
                <Input label="Account Number" name="accountNumber" value={formData.accountNumber} onChange={onProfileChange} />
                <Input label="IFSC Code" name="ifsc" value={formData.ifsc}
                  onChange={e => onProfileChange({ target: { name: "ifsc", value: e.target.value.toUpperCase() } })}
                  maxLength={11} />
                <FileUpload label="Bank Passbook" name="passbookFile" onChange={onFileChange}
                  existingUrl={user?.bankDetails?.passbookFile} existingLabel="View current passbook"
                  selectedFile={selectedFiles.passbookFile} />

                <div className="col-span-full flex justify-end gap-3 pt-4 border-t border-gray-100 mt-2">
                  <button type="button" onClick={() => { resetForm(); setEditMode(false); }}
                    className="border border-gray-200 px-5 py-2 cursor-pointer rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving}
                    className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-6 py-2 rounded-lg disabled:opacity-50 transition cursor-pointer disabled:cursor-not-allowed">
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </form>
            )}

            {/* ── CHANGE PASSWORD ── */}
            {editMode && activeTab === "password" && (
              <form onSubmit={onSubmitPassword} className="max-w-sm space-y-5">
                {!isAdmin && (
                  <PasswordField label="Current Password" name="oldPassword"
                    value={pwd.oldPassword} onChange={onPwdChange} />
                )}
                <PasswordField label="New Password" name="newPassword"
                  value={pwd.newPassword} onChange={onPwdChange} />
                <PasswordField label="Confirm New Password" name="confirmPassword"
                  value={pwd.confirmPassword} onChange={onPwdChange} />

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button type="button" onClick={() => { resetForm(); setEditMode(false); }}
                    className="border border-gray-200 px-5 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition cursor-pointer">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving}
                    className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-6 py-2 rounded-lg disabled:opacity-50 transition cursor-pointer disabled:cursor-not-allowed">
                    {saving ? "Saving…" : "Reset password"}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default Account;