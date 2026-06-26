import React, { useEffect, useMemo, useState } from "react";
import { X, Eye, EyeOff } from "lucide-react";
import { toast } from "react-toastify";

const defaultForm = {
  name: "",
  email: "",
  password: "",
  role: "employee",
  mobile: "",
  alternateMobile: "",
  address: "",
  department: "",
  designation: "",
  dateOfBirth: "",
  pan: "",
  aadhaar: "",
  bankDetails: {
    accountNumber: "",
    ifsc: "",
    bankName: "",
  },
  leaveInfo: {
    balance: "",
  },
};

const RequiredStar = () => <span className="text-red-500 ml-0.5">*</span>;

const UserFormModal = ({
  open,
  onClose,
  onSubmit,
  initialData,
  isAdmin = false,
  loading = false,
}) => {
  const isEdit = !!initialData;

  const [form, setForm] = useState(defaultForm);
  const [changePwd, setChangePwd] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [showAddPwd, setShowAddPwd] = useState(false);
  const [showOldPwd, setShowOldPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (isEdit) {
      const { password, bankDetails, leaveInfo, ...rest } = initialData || {};
      setForm({
        ...defaultForm,
        ...rest,
        dateOfBirth: rest?.dateOfBirth
          ? new Date(rest.dateOfBirth).toISOString().split("T")[0]
          : "",
        bankDetails: {
          ...defaultForm.bankDetails,
          ...(bankDetails || {}),
        },
        password: "",
        leaveInfo: {
          balance: leaveInfo?.balance ?? "",
        },
      });
    } else {
      setForm(defaultForm);
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
          <label className="font-medium">
            Password <RequiredStar />
          </label>
          <div className="relative">
            <input
              name="password"
              type={showAddPwd ? "text" : "password"}
              value={form.password}
              onChange={handleChange}
              className="border p-2 rounded w-full pr-10"
              placeholder="Enter password"
              disabled={loading}
            />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setShowAddPwd((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100"
              disabled={loading}
            >
              {showAddPwd ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">Minimum 8 characters.</p>
        </div>
      ) : null,
    [isEdit, showAddPwd, form.password, loading]
  );

  const editModePasswordBlock = useMemo(() => {
    if (!isEdit) return null;
    return (
      <>
        <div className="sm:col-span-2 flex items-center justify-between border rounded-md px-3 py-2">
          <span className="text-sm font-medium">Change Password</span>

          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={changePwd}
              onChange={() => setChangePwd((v) => !v)}
              disabled={loading}
            />

            <div
              className="
                relative w-10 h-5 rounded-full bg-gray-300
                peer-checked:bg-blue-600
                transition-colors duration-200 ease-in-out
                
                after:content-[''] after:absolute after:top-[2px] after:left-[2px]
                after:w-4 after:h-4 after:bg-white after:rounded-full
                after:shadow-md after:transition-all after:duration-200
                
                peer-checked:after:translate-x-5
              "
            ></div>
          </label>
        </div>

        {changePwd && (
          <>
            {!isAdmin && (
              <div className="sm:col-span-2">
                <label className="font-medium">
                  Old Password <RequiredStar />
                </label>
                <div className="relative">
                  <input
                    type={showOldPwd ? "text" : "password"}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="border p-2 rounded w-full pr-10"
                    placeholder="Enter old password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setShowOldPwd((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100"
                    disabled={loading}
                  >
                    {showOldPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            <div className="sm:col-span-2">
              <label className="font-medium">
                New Password <RequiredStar />
              </label>
              <div className="relative">
                <input
                  type={showNewPwd ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="border p-2 rounded w-full pr-10"
                  placeholder="Enter new password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setShowNewPwd((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100"
                  disabled={loading}
                >
                  {showNewPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
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
      "department",
    ];

    for (const k of reqFields) {
      if (!String(form[k] || "").trim()) {
        toast.error(`Please fill ${k}.`);
        return false;
      }
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

    if (!isEdit) {
      const payload = { ...form };
      if (!isAdmin) {
        delete payload.pan;
        delete payload.aadhaar;
        delete payload.bankDetails;
      }
      if (isAdmin && form.leaveInfo?.balance !== "") {
        payload.leaveInfo = { balance: Number(form.leaveInfo.balance) };
      }
      onSubmit?.(payload, "add");
    } else {
      const { password, ...rest } = form;
      const payload = { ...rest };
      if (changePwd) {
        if (isAdmin) {
          payload.newPassword = newPassword;
        } else {
          payload.oldPassword = oldPassword;
          payload.newPassword = newPassword;
        }
      }

      if (isAdmin && form.leaveInfo?.balance !== "") {
        payload.leaveInfo = { balance: Number(form.leaveInfo.balance) };
      }

      if (!isAdmin) {
        delete payload.pan;
        delete payload.aadhaar;
        delete payload.bankDetails;
      }
      onSubmit?.(payload, "edit");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 px-4 overflow-hidden">
      <div
        className="bg-white rounded-lg w-full max-w-lg shadow-lg flex flex-col"
        style={{ maxHeight: "90vh" }}
      >
        <div className="flex justify-between items-center p-6 pb-4 border-b">
          <h2 className="text-lg font-semibold">
            {isEdit ? "Edit User" : "Add New User"}
          </h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="disabled:opacity-50 hover:bg-gray-100 rounded-full p-1"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 pt-4 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="font-medium">
                Full Name <RequiredStar />
              </label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                className="border p-2 rounded w-full"
                placeholder="Enter full name"
                disabled={loading}
              />
            </div>

            <div>
              <label className="font-medium">
                Email <RequiredStar />
              </label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                className="border p-2 rounded w-full"
                placeholder="Enter email"
                disabled={loading}
              />
            </div>

            <div>
              <label className="font-medium">Date of Birth</label>
              <input
                type="date"
                name="dateOfBirth"
                value={form.dateOfBirth}
                onChange={handleChange}
                className="border p-2 rounded w-full"
                disabled={loading}
                max={new Date().toISOString().split("T")[0]}
              />
            </div>

            {addModePasswordField}

            <div>
              <label className="font-medium">
                Mobile <RequiredStar />
              </label>
              <input
                name="mobile"
                type="tel"
                inputMode="numeric"
                pattern="\d*"
                value={form.mobile}
                onChange={handleTelChange}
                onPaste={handleTelPaste}
                className="border p-2 rounded w-full"
                placeholder="9876543210"
                disabled={loading}
              />
            </div>

            <div>
              <label className="font-medium">
                Alternate Mobile <RequiredStar />
              </label>
              <input
                name="alternateMobile"
                type="tel"
                inputMode="numeric"
                pattern="\d*"
                value={form.alternateMobile}
                onChange={handleTelChange}
                onPaste={handleTelPaste}
                className="border p-2 rounded w-full"
                placeholder="9876543210"
                disabled={loading}
              />
            </div>

            <div>
              <label className="font-medium">
                Department <RequiredStar />
              </label>
              <input
                name="department"
                value={form.department}
                onChange={handleChange}
                className="border p-2 rounded w-full"
                placeholder="Department name"
                disabled={loading}
              />
            </div>

            <div>
              <label className="font-medium">Designation</label>
              <input
                name="designation"
                value={form.designation}
                onChange={handleChange}
                className="border p-2 rounded w-full"
                placeholder="Job title"
                disabled={loading}
              />
            </div>

            <div className="sm:col-span-2 pt-2 border-t">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Leave Management
              </h3>
            </div>

            <div>
              <label className="font-medium">Leave Balance</label>
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
                className="border p-2 rounded w-full"
                placeholder="e.g. 5 or -3"
                disabled={loading}
              />
            </div>

            {isAdmin && (
              <>
                <div className="sm:col-span-2 pt-2 border-t">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">
                    Identity & Bank Details (Optional)
                  </h3>
                </div>

                <div>
                  <label className="font-medium">PAN</label>
                  <input
                    name="pan"
                    value={form.pan}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        pan: e.target.value.toUpperCase().slice(0, 10),
                      }))
                    }
                    className="border p-2 rounded w-full"
                    placeholder="ABCDE1234F"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="font-medium">Aadhaar</label>
                  <input
                    name="aadhaar"
                    value={form.aadhaar}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        aadhaar: e.target.value.replace(/\D/g, "").slice(0, 12),
                      }))
                    }
                    className="border p-2 rounded w-full"
                    placeholder="12 digit Aadhaar"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="font-medium">Bank Account No.</label>
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
                    className="border p-2 rounded w-full"
                    placeholder="1234567890"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="font-medium">IFSC Code</label>
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
                    className="border p-2 rounded w-full"
                    placeholder="HDFC0001234"
                    disabled={loading}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-medium">Bank Name</label>
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
                    className="border p-2 rounded w-full"
                    placeholder="HDFC Bank"
                    disabled={loading}
                  />
                </div>
              </>
            )}

            <div>
              <label className="font-medium">Role</label>
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                className="border p-2 rounded w-full"
                disabled={loading}
              >
                <option value="employee">Employee</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="font-medium">
                Address
              </label>
              <textarea
                name="address"
                value={form.address}
                onChange={handleChange}
                className="border p-2 rounded w-full min-h-20"
                placeholder="Full address"
                disabled={loading}
              />
            </div>

            {editModePasswordBlock}
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 pt-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 border rounded hover:bg-gray-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Saving..." : isEdit ? "Save Changes" : "Create User"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserFormModal;
