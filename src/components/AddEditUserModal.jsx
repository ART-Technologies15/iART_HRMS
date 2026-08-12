import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  X,
  Eye,
  EyeOff,
  User,
  Phone,
  Briefcase,
  Lock,
  Wallet,
  Landmark,
  ExternalLink,
  Camera,
} from "lucide-react";
import { toast } from "react-toastify";

const DEPARTMENT_OPTIONS = [
  "Web Dev",
  "Design",
  "Mobile Dev",
  "Human Resource",
  "Sale",
  "Internship/Trainee",
  "Management",
  "Administration",
  "Other",
];

const defaultForm = {
  name: "",
  email: "",
  password: "",
  role: "employee",
  mobile: "",
  alternateMobile: "",
  address: "",
  department: "",
  customDepartment: "",
  designation: "",
  dateOfBirth: "",
  joiningDate: "",
  pan: "",
  aadhaar: "",
  profilePhoto: null,
  panFile: null,
  aadhaarFile: null,
  bankDetails: {
    accountNumber: "",
    ifsc: "",
    bankName: "",
    passbookFile: null,
  },
  leaveInfo: {
    balance: "",
  },
};

// ── Shared styling tokens ──────────────────────────────────
const inputCls =
  "w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60";

const fileCls =
  "w-full rounded-lg border border-slate-300 bg-slate-50 text-sm text-slate-500 transition file:mr-3 file:rounded-md file:border-0 file:bg-indigo-600 file:px-3 file:py-2 file:text-xs file:font-medium file:text-white hover:file:bg-indigo-700 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60";

const FieldLabel = ({ children, required }) => (
  <label className="mb-1.5 block text-xs font-medium text-slate-600">
    {children}
    {required && <span className="ml-0.5 text-rose-500">*</span>}
  </label>
);

const SectionHeader = ({ icon: Icon, title, hint }) => (
  <div className="mb-3 flex items-center gap-2.5">
    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-50 text-indigo-600">
      <Icon size={15} />
    </div>
    <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
    {hint && (
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-400">
        {hint}
      </span>
    )}
  </div>
);

const UserFormModal = ({
  open,
  onClose,
  onSubmit,
  initialData,
  isAdmin = false,
  isHr = false,
  isAdminHr = false,
  loading = false,
}) => {
  const isEdit = !!initialData;

  const isPanLocked = isEdit && initialData?.isPanVerified;
  const isAadhaarLocked = isEdit && initialData?.isAadhaarVerified;

  const isPanVerifiedBy = isEdit && initialData?.panVerifiedBy?.name;
  const isAadhaarVerifiedBy = isEdit && initialData?.aadhaarVerifiedBy?.name;

  const [form, setForm] = useState(defaultForm);
  const [changePwd, setChangePwd] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [showAddPwd, setShowAddPwd] = useState(false);
  const [showOldPwd, setShowOldPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);

  const fileInputRef = useRef(null);
  const initialFormRef = useRef(null);

  // Local preview URL for a newly-selected (not yet uploaded) photo file.
  // Created/revoked here so we never leak blob URLs across renders.
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState(null);

  useEffect(() => {
    if (form.profilePhoto instanceof File) {
      const url = URL.createObjectURL(form.profilePhoto);
      setPhotoPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPhotoPreviewUrl(null);
  }, [form.profilePhoto]);

  // Resolves to whatever should currently render in the avatar:
  // a fresh local preview, an existing remote URL, or null.
  const photoSrc =
    form.profilePhoto instanceof File
      ? photoPreviewUrl
      : form.profilePhoto || null;

  useEffect(() => {
    if (!open) return;

    if (isEdit) {
      const { password, bankDetails, leaveInfo, department, panFile, aadhaarFile, ...rest } =
        initialData || {};

      // If the stored department isn't one of our preset options, treat it
      // as a pre-existing custom value: select "Other" in the dropdown and
      // surface the actual text in the manual field for editing.
      const isPreset = DEPARTMENT_OPTIONS.includes(department);
      const departmentValue = department
        ? isPreset
          ? department
          : "Other"
        : "";
      const customDepartmentValue = department && !isPreset ? department : "";

      const nextForm = {
        ...defaultForm,
        ...rest,
        department: departmentValue,
        customDepartment: customDepartmentValue,
        dateOfBirth: rest?.dateOfBirth
          ? new Date(rest.dateOfBirth).toISOString().split("T")[0]
          : "",
        joiningDate: rest?.joiningDate
          ? new Date(rest.joiningDate).toISOString().split("T")[0]
          : "",
        // panFile/aadhaarFile deliberately excluded above and left at
        // defaultForm's null — they should only ever hold a NEW File the
        // user picks, never the existing URL (the URL is shown separately
        // via initialData.panFile / initialData.aadhaarFile links below).
        bankDetails: {
          accountNumber: bankDetails?.accountNumber || "",
          ifsc: bankDetails?.ifsc || "",
          bankName: bankDetails?.bankName || "",
          passbookFile: null, // same reasoning — never seed with the existing URL
        },
        password: "",
        leaveInfo: {
          balance: leaveInfo?.balance ?? "",
        },
        // kept only for diffing at submit time — not rendered anywhere
        _rawDepartment: department || "",
      };

      setForm(nextForm);
      initialFormRef.current = {
        ...nextForm,
        bankDetails: { ...nextForm.bankDetails },
        leaveInfo: { ...nextForm.leaveInfo },
      };
    } else {
      setForm(defaultForm);
      initialFormRef.current = null; // add mode always sends everything
    }

    setChangePwd(false);
    setOldPassword("");
    setNewPassword("");
    setShowAddPwd(false);
    setShowOldPwd(false);
    setShowNewPwd(false);
  }, [open, isEdit, initialData]);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleTelChange = (e) => {
    const { name, value } = e.target;
    const digits = value.replace(/\D/g, "").slice(0, 10);
    setForm((prev) => ({ ...prev, [name]: digits }));
  };

  const handleTelPaste = (e) => {
    const pasted = (e.clipboardData || window.clipboardData).getData("text");
    if (/\D/.test(pasted)) {
      e.preventDefault();
      const digits = pasted.replace(/\D/g, "").slice(0, 10);
      const name = e.currentTarget.name;
      setForm((prev) => ({ ...prev, [name]: digits }));
    }
  };

  const addModePasswordField = useMemo(
    () =>
      !isEdit ? (
        <div className="sm:col-span-2">
          <FieldLabel required>Password</FieldLabel>
          <div className="relative">
            <input
              name="password"
              type={showAddPwd ? "text" : "password"}
              value={form.password}
              onChange={handleChange}
              className={`${inputCls} pr-10`}
              placeholder="Enter password"
              disabled={loading}
            />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setShowAddPwd((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              disabled={loading}
            >
              {showAddPwd ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-400">Minimum 8 characters.</p>
        </div>
      ) : null,
    [isEdit, showAddPwd, form.password, loading]
  );

  const editModePasswordBlock = useMemo(() => {
    if (!isEdit) return null;
    return (
      <>
        <div className="sm:col-span-2 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5">
          <span className="text-sm font-medium text-slate-700">
            Change Password
          </span>

          <label className="inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={changePwd}
              onChange={() => setChangePwd((v) => !v)}
              disabled={loading}
            />

            <div
              className="
                relative h-5 w-10 rounded-full bg-slate-300
                transition-colors duration-200 ease-in-out
                peer-checked:bg-indigo-600

                after:absolute after:left-[2px] after:top-[2px]
                after:h-4 after:w-4 after:rounded-full after:bg-white
                after:shadow-md after:transition-all after:duration-200 after:content-['']

                peer-checked:after:translate-x-5
              "
            ></div>
          </label>
        </div>

        {changePwd && (
          <>
            {!isAdmin && (
              <div className="sm:col-span-2">
                <FieldLabel required>Old Password</FieldLabel>
                <div className="relative">
                  <input
                    type={showOldPwd ? "text" : "password"}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className={`${inputCls} pr-10`}
                    placeholder="Enter old password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setShowOldPwd((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    disabled={loading}
                  >
                    {showOldPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            <div className="sm:col-span-2">
              <FieldLabel required>New Password</FieldLabel>
              <div className="relative">
                <input
                  type={showNewPwd ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={`${inputCls} pr-10`}
                  placeholder="Enter new password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setShowNewPwd((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  disabled={loading}
                >
                  {showNewPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Minimum 8 characters.
              </p>
            </div>
          </>
        )}
      </>
    );
  }, [
    isEdit,
    changePwd,
    isAdmin,
    showOldPwd,
    showNewPwd,
    oldPassword,
    newPassword,
    loading,
  ]);

  const isValidEmail = (v) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(String(v || "").trim());

  const validate = () => {
    const reqFields = [
      "name",
      "email",
      "mobile",
      "alternateMobile",
      "joiningDate",
      "department",
    ];

    for (const k of reqFields) {
      if (!String(form[k] || "").trim()) {
        toast.error(`Please fill ${k}.`);
        return false;
      }
    }

    if (form.department === "Other" && !String(form.customDepartment || "").trim()) {
      toast.error("Please enter the department name.");
      return false;
    }

    if (!isValidEmail(form.email)) {
      toast.error("Please enter a valid email.");
      return false;
    }

    if (form.mobile.length !== 10) {
      toast.error("Mobile must be exactly 10 digits.");
      return false;
    }

    if (form.alternateMobile.length !== 10) {
      toast.error("Alternate mobile must be exactly 10 digits.");
      return false;
    }

    if (!form.joiningDate) {
      toast.error("Please select joining date.");
      return false;
    }

    if (form.mobile === form.alternateMobile) {
      toast.error("Mobile and alternate mobile cannot be the same.");
      return false;
    }

    if (!isEdit) {
      if (!form.password || form.password.length < 8) {
        toast.error("Password must be at least 8 characters.");
        return false;
      }
    } else if (changePwd) {
      if (!isAdmin && !oldPassword) {
        toast.error("Old password is required.");
        return false;
      }
      if (!newPassword || newPassword.length < 8) {
        toast.error("New password must be at least 8 characters.");
        return false;
      }
    }

    return true;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const payload = new FormData();

    // Resolve "Other" + manual text down to a single plain department
    // string, same as before — backend doesn't need to know it came
    // from a custom field.
    const resolvedDepartment =
      form.department === "Other"
        ? form.customDepartment.trim()
        : form.department;

    if (!isEdit) {
      // ── Add mode: no "initial" to diff against — send everything ──
      payload.append("name", form.name);
      payload.append("email", form.email);
      payload.append("mobile", form.mobile);
      payload.append("alternateMobile", form.alternateMobile);
      payload.append("department", resolvedDepartment);
      payload.append("designation", form.designation || "");
      payload.append("address", form.address || "");
      payload.append("dateOfBirth", form.dateOfBirth || "");
      payload.append("joiningDate", form.joiningDate || "");
      payload.append("role", form.role);
      payload.append("password", form.password);

      if (form.profilePhoto instanceof File) {
        payload.append("profilePhoto", form.profilePhoto);
      }

      if (isAdmin && form.leaveInfo?.balance !== "") {
        payload.append("leaveInfo", JSON.stringify({ balance: Number(form.leaveInfo.balance) }));
      }

      if (isAdmin) {
        payload.append("pan", form.pan || "");
        payload.append("aadhaar", form.aadhaar || "");
        payload.append(
          "bankDetails",
          JSON.stringify({
            accountNumber: form.bankDetails.accountNumber || "",
            ifsc: form.bankDetails.ifsc || "",
            bankName: form.bankDetails.bankName || "",
          })
        );
        if (form.panFile instanceof File) payload.append("panFile", form.panFile);
        if (form.aadhaarFile instanceof File) payload.append("aadhaarFile", form.aadhaarFile);
        if (form.bankDetails.passbookFile instanceof File)
          payload.append("passbookFile", form.bankDetails.passbookFile);
      }

      onSubmit?.(payload, "add");
      return;
    }

    // ── Edit mode: diff against the snapshot taken when the modal opened ──
    const initial = initialFormRef.current || form;

    const scalarFields = ["name", "email", "mobile", "alternateMobile", "designation", "address", "dateOfBirth", "joiningDate"];
    scalarFields.forEach((key) => {
      if (form[key] !== initial[key]) {
        payload.append(key, form[key] || "");
      }
    });

    if (resolvedDepartment !== initial._rawDepartment) {
      payload.append("department", resolvedDepartment);
    }

    if (isAdmin && form.role !== initial.role) {
      payload.append("role", form.role);
    }

    if (form.profilePhoto instanceof File) {
      payload.append("profilePhoto", form.profilePhoto);
    }

    if (changePwd) {
      if (!isAdmin) payload.append("oldPassword", oldPassword);
      payload.append("newPassword", newPassword);
    }

    if (isAdmin && form.leaveInfo?.balance !== "" && form.leaveInfo.balance !== initial.leaveInfo.balance) {
      payload.append("leaveInfo", JSON.stringify({ balance: Number(form.leaveInfo.balance) }));
    }

    if (isAdmin) {
      if (form.pan !== initial.pan) {
        payload.append("pan", form.pan || "");
      }
      if (form.aadhaar !== initial.aadhaar) {
        payload.append("aadhaar", form.aadhaar || "");
      }

      const bankChanges = {};
      if (form.bankDetails.accountNumber !== initial.bankDetails.accountNumber)
        bankChanges.accountNumber = form.bankDetails.accountNumber || "";
      if (form.bankDetails.ifsc !== initial.bankDetails.ifsc)
        bankChanges.ifsc = form.bankDetails.ifsc || "";
      if (form.bankDetails.bankName !== initial.bankDetails.bankName)
        bankChanges.bankName = form.bankDetails.bankName || "";
      if (Object.keys(bankChanges).length > 0) {
        payload.append("bankDetails", JSON.stringify(bankChanges));
      }

      if (form.panFile instanceof File) payload.append("panFile", form.panFile);
      if (form.aadhaarFile instanceof File) payload.append("aadhaarFile", form.aadhaarFile);
      if (form.bankDetails.passbookFile instanceof File)
        payload.append("passbookFile", form.bankDetails.passbookFile);
    }

    if ([...payload.keys()].length === 0) {
      toast.info("No changes to save.");
      return;
    }

    onSubmit?.(payload, "edit");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
      <div
        className="flex w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5"
        style={{ maxHeight: "90vh" }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {isEdit ? "Edit User" : "Add New User"}
            </h2>
            <p className="text-xs text-slate-400">
              {isEdit
                ? "Update profile and access details"
                : "Create a profile and grant access"}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-7 overflow-y-auto px-6 py-6 text-sm">
          {/* Profile Photo */}
          <div className="flex flex-col items-center gap-2 border-b border-slate-100 pb-6">
            <div
              role="button"
              tabIndex={0}
              aria-label="Change profile photo"
              onClick={() => !loading && fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (!loading && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              className={`group relative h-24 w-24 ${loading ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                }`}
            >
              <div className="h-24 w-24 overflow-hidden rounded-full border-2 border-white bg-slate-100 shadow ring-1 ring-slate-200">
                {photoSrc ? (
                  <img
                    src={photoSrc}
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-300">
                    <User size={32} />
                  </div>
                )}
              </div>

              {/* Hover overlay */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-slate-900/50 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                <Camera size={18} className="text-white" />
              </div>

              {/* Edit badge */}
              <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-white shadow ring-2 ring-white">
                <Camera size={13} />
              </span>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                disabled={loading}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    profilePhoto: e.target.files[0],
                  }))
                }
              />
            </div>

            {photoSrc ? (
              <a
                href={photoSrc}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
              >
                View full photo <ExternalLink size={11} />
              </a>
            ) : (
              <p className="text-xs text-slate-400">
                Click to upload a profile photo
              </p>
            )}
          </div>

          {/* Personal Information */}
          <section>
            <SectionHeader icon={User} title="Personal Information" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel required>Full Name</FieldLabel>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className={inputCls}
                  placeholder="Enter full name"
                  disabled={loading}
                />
              </div>

              <div>
                <FieldLabel required>Email</FieldLabel>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  className={inputCls}
                  placeholder="Enter email"
                  disabled={loading}
                />
              </div>

              <div>
                <FieldLabel>Date of Birth</FieldLabel>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={form.dateOfBirth}
                  onChange={handleChange}
                  className={inputCls}
                  disabled={loading}
                  max={new Date().toISOString().split("T")[0]}
                />
              </div>

              <div>
                <FieldLabel>Joining Date</FieldLabel>
                <input
                  type="date"
                  name="joiningDate"
                  value={form.joiningDate}
                  onChange={handleChange}
                  className={inputCls}
                  disabled={loading}
                  max={new Date().toISOString().split("T")[0]}
                />
              </div>

            </div>
          </section>

          {/* Contact */}
          <section className="border-t border-slate-100 pt-6">
            <SectionHeader icon={Phone} title="Contact Details" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel required>Mobile</FieldLabel>
                <input
                  name="mobile"
                  type="tel"
                  inputMode="numeric"
                  pattern="\d*"
                  value={form.mobile}
                  onChange={handleTelChange}
                  onPaste={handleTelPaste}
                  className={inputCls}
                  placeholder="9876543210"
                  disabled={loading}
                />
              </div>

              <div>
                <FieldLabel required>Alternate Mobile</FieldLabel>
                <input
                  name="alternateMobile"
                  type="tel"
                  inputMode="numeric"
                  pattern="\d*"
                  value={form.alternateMobile}
                  onChange={handleTelChange}
                  onPaste={handleTelPaste}
                  className={inputCls}
                  placeholder="9876543210"
                  disabled={loading}
                />
              </div>

              <div className="sm:col-span-2">
                <FieldLabel>Address</FieldLabel>
                <textarea
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  className={`${inputCls} min-h-20 resize-none`}
                  placeholder="Full address"
                  disabled={loading}
                />
              </div>
            </div>
          </section>

          {/* Employment */}
          <section className="border-t border-slate-100 pt-6">
            <SectionHeader icon={Briefcase} title="Employment" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel required>Department</FieldLabel>
                <select
                  name="department"
                  value={form.department}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      department: e.target.value,
                      // Clear any leftover custom text the moment they
                      // switch away from "Other", so a stale value can't
                      // silently get submitted if they flip back and forth.
                      customDepartment:
                        e.target.value === "Other" ? prev.customDepartment : "",
                    }))
                  }
                  className={inputCls}
                  disabled={loading}
                >
                  <option value="" disabled>
                    Select department
                  </option>
                  {DEPARTMENT_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>

                {form.department === "Other" && (
                  <input
                    name="customDepartment"
                    value={form.customDepartment}
                    onChange={handleChange}
                    className={`${inputCls} mt-2`}
                    placeholder="Enter department name"
                    disabled={loading}
                  />
                )}
              </div>

              <div>
                <FieldLabel>Designation</FieldLabel>
                <input
                  name="designation"
                  value={form.designation}
                  onChange={handleChange}
                  className={inputCls}
                  placeholder="Job title"
                  disabled={loading}
                />
              </div>

              <div>
                <FieldLabel>Role</FieldLabel>
                <select
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  className={inputCls}
                  disabled={loading}
                >
                  <option value="employee">Employee</option>
                  <option value="intern">Intern</option>
                  <option value="trainee">Trainee</option>
                  <option value="hr">HR</option>
                </select>
              </div>
            </div>
          </section>

          {/* Security */}
          {!isEdit && (
            <section className="border-t border-slate-100 pt-6">
              <SectionHeader icon={Lock} title="Security" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {addModePasswordField}
                {editModePasswordBlock}
              </div>
            </section>
          )}

          {/* Leave Management */}
          <section className="border-t border-slate-100 pt-6">
            <SectionHeader icon={Wallet} title="Leave Management" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel>Leave Balance</FieldLabel>
                <input
                  name="leaveBalance"
                  type="number"
                  value={form.leaveInfo.balance}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      leaveInfo: { balance: e.target.value },
                    }))
                  }
                  className={inputCls}
                  placeholder="e.g. 5 or -3"
                  disabled={loading}
                />
              </div>
            </div>
          </section>

          {/* Identity & Bank — admin only */}
          {isAdminHr && (
            <section className="border-t border-slate-100 pt-6">
              <SectionHeader
                icon={Landmark}
                title="Identity & Bank Details"
                hint="Optional"
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel>PAN</FieldLabel>
                  <input
                    name="pan"
                    value={form.pan}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        pan: e.target.value.toUpperCase().slice(0, 10),
                      }))
                    }
                    className={`${inputCls} ${isPanLocked ? "bg-slate-100 cursor-not-allowed" : ""
                      }`}
                    placeholder="ABCDE1234F"
                    disabled={loading || isPanLocked}
                  />

                  {isPanLocked && (
                    <p className="mt-1 text-xs text-emerald-600 font-medium">
                      ✓ PAN has been verified by <span className="font-bold"> {isPanVerifiedBy} </span> and cannot be edited.
                    </p>
                  )}
                </div>

                <div>
                  <FieldLabel>PAN Document</FieldLabel>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        panFile: e.target.files[0],
                      }))
                    }
                    className={fileCls}
                    disabled={loading || isPanLocked}
                  />
                  {form.panFile?.name ? (
                    <p className="mt-1 truncate text-xs text-slate-400">
                      {form.panFile.name}
                    </p>
                  ) : (
                    isEdit &&
                    initialData?.panFile && (
                      <a
                        href={initialData.panFile}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
                      >
                        View current document <ExternalLink size={11} />
                      </a>
                    )
                  )}
                </div>

                <div>
                  <FieldLabel>Aadhaar</FieldLabel>
                  <input
                    name="aadhaar"
                    value={form.aadhaar}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        aadhaar: e.target.value.replace(/\D/g, "").slice(0, 12),
                      }))
                    }
                    className={`${inputCls} ${isAadhaarLocked ? "bg-slate-100 cursor-not-allowed" : ""
                      }`}
                    placeholder="12 digit Aadhaar"
                    disabled={loading || isAadhaarLocked}
                  />

                  {isAadhaarLocked && (
                    <p className="mt-1 text-xs text-emerald-600 font-medium">
                      ✓ Aadhaar has been verified by <span className="font-bold"> {isAadhaarVerifiedBy} </span>and cannot be edited.
                    </p>
                  )}
                </div>

                <div>
                  <FieldLabel>Aadhaar Document</FieldLabel>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        aadhaarFile: e.target.files[0],
                      }))
                    }
                    className={fileCls}
                    disabled={loading || isAadhaarLocked}
                  />
                  {form.aadhaarFile?.name ? (
                    <p className="mt-1 truncate text-xs text-slate-400">
                      {form.aadhaarFile.name}
                    </p>
                  ) : (
                    isEdit &&
                    initialData?.aadhaarFile && (
                      <a
                        href={initialData.aadhaarFile}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
                      >
                        View current document <ExternalLink size={11} />
                      </a>
                    )
                  )}
                </div>

                <div>
                  <FieldLabel>Bank Account No.</FieldLabel>
                  <input
                    name="accountNumber"
                    value={form.bankDetails.accountNumber}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        bankDetails: {
                          ...prev.bankDetails,
                          accountNumber: e.target.value
                            .replace(/\D/g, "")
                            .slice(0, 18),
                        },
                      }))
                    }
                    className={inputCls}
                    placeholder="1234567890"
                    disabled={loading}
                  />
                </div>

                <div>
                  <FieldLabel>IFSC Code</FieldLabel>
                  <input
                    name="ifsc"
                    value={form.bankDetails.ifsc}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        bankDetails: {
                          ...prev.bankDetails,
                          ifsc: e.target.value.toUpperCase().slice(0, 11),
                        },
                      }))
                    }
                    className={inputCls}
                    placeholder="HDFC0001234"
                    disabled={loading}
                  />
                </div>

                <div className="sm:col-span-2">
                  <FieldLabel>Bank Name</FieldLabel>
                  <input
                    name="bankName"
                    value={form.bankDetails.bankName}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        bankDetails: {
                          ...prev.bankDetails,
                          bankName: e.target.value,
                        },
                      }))
                    }
                    className={inputCls}
                    placeholder="HDFC Bank"
                    disabled={loading}
                  />
                </div>

                <div className="sm:col-span-2">
                  <FieldLabel>Passbook</FieldLabel>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        bankDetails: {
                          ...prev.bankDetails,
                          passbookFile: e.target.files[0],
                        },
                      }))
                    }
                    className={fileCls}
                    disabled={loading}
                  />
                  {form.bankDetails.passbookFile?.name ? (
                    <p className="mt-1 truncate text-xs text-slate-400">
                      {form.bankDetails.passbookFile.name}
                    </p>
                  ) : (
                    isEdit &&
                    initialData?.bankDetails?.passbookFile && (
                      <a
                        href={initialData.bankDetails.passbookFile}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
                      >
                        View current document <ExternalLink size={11} />
                      </a>
                    )
                  )}
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Saving..." : isEdit ? "Save Changes" : "Create User"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserFormModal;