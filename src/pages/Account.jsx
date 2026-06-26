// src/pages/Account.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { updateUser } from "../api/authApi";
import { toast } from "react-toastify";
import { Eye, EyeOff } from "lucide-react";

const Input = ({
  label,
  name,
  type = "text",
  value,
  onChange,
  disabled,
  ...rest
}) => (
  <div>
    <label className="block text-gray-600 mb-1">{label}</label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={`w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-400 outline-none disabled:bg-gray-100 disabled:text-gray-500`}
      {...rest}
    />
  </div>
);

const Tel10 = ({ label, name, value, onChange }) => {
  const handleInput = (e) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
    onChange({ target: { name, value: digits } });
  };
  return (
    <div>
      <label className="block text-gray-600 mb-1">{label}</label>
      <input
        type="tel"
        value={value}
        onInput={handleInput}
        maxLength={10}
        className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-400 outline-none"
        placeholder="9876543210"
      />
      <p className="text-xs text-gray-500 mt-1">Exactly 10 digits.</p>
    </div>
  );
};

const PasswordField = ({ label, name, value, onChange }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <label className="block text-gray-600 mb-1">{label}</label>
      <input
        type={show ? "text" : "password"}
        name={name}
        value={value}
        onChange={onChange}
        className="w-full border border-gray-300 rounded-lg p-2 pr-10 focus:ring-2 focus:ring-blue-400 outline-none"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 translate-y-[20%] text-gray-500 hover:text-gray-700"
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
};

const Account = () => {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "admin";

  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "",
    mobile: "",
    alternateMobile: "",
    address: "",
    department: "",
    designation: "",
    pan: "",
    aadhaar: "",
    accountNumber: "",
    ifsc: "",
    bankName: "",
    dateOfBirth: "",
  });

  const [pwd, setPwd] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

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
    });
  }, [user]);

  const onProfileChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const validateProfile = () => {
    if (!formData.name.trim()) return "Name is required.";
    if (!formData.email.trim()) return "Email is required.";
    if (formData.mobile.length !== 10) return "Mobile must be 10 digits.";
    if (formData.alternateMobile.length !== 10)
      return "Alternate mobile must be 10 digits.";
    if (!formData.address.trim()) return "Address is required.";

    // Optional field validations
    if (formData.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(formData.pan))
      return "Invalid PAN format (ABCDE1234F).";

    if (formData.aadhaar && !/^[0-9]{12}$/.test(formData.aadhaar))
      return "Aadhaar must be 12 digits.";

    if (formData.accountNumber && !/^[0-9]{9,18}$/.test(formData.accountNumber))
      return "Account number must be 9–18 digits.";

    if (formData.ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifsc))
      return "Invalid IFSC format.";

    if (!formData.dateOfBirth)
      return "Date of birth is required.";

    const dob = new Date(formData.dateOfBirth);

    if (isNaN(dob.getTime()))
      return "Invalid date of birth.";

    const age = Math.floor(
      (Date.now() - dob.getTime()) /
      (1000 * 60 * 60 * 24 * 365.25)
    );

    if (age < 18)
      return "Employee must be at least 18 years old.";

    return null;
  };

  const onSubmitProfile = async (e) => {
    e.preventDefault();
    const err = validateProfile();
    if (err) return toast.error(err);

    try {
      setSaving(true);
      const payload = {
        name: formData.name,
        email: formData.email,
        mobile: formData.mobile,
        alternateMobile: formData.alternateMobile,
        address: formData.address,
        dateOfBirth: formData.dateOfBirth,
        pan: formData.pan || "",
        aadhaar: formData.aadhaar || "",
        bankDetails: {
          accountNumber: formData.accountNumber || "",
          ifsc: formData.ifsc || "",
          bankName: formData.bankName || "",
        },
      };

      const res = await updateUser(user._id, payload);

      if (res?.success) {
        const nextUser = { ...(user || {}), ...res.user };
        localStorage.setItem("user", JSON.stringify(nextUser));
        toast.success(res?.message || "Profile updated successfully.");
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
    setPwd((p) => ({ ...p, [name]: value }));
  };

  const validatePassword = () => {
    if (!isAdmin && !pwd.oldPassword.trim()) return "Old password is required.";
    if (!pwd.newPassword.trim()) return "New password is required.";
    if (pwd.newPassword.length < 8)
      return "New password must be at least 8 characters.";
    if (!isAdmin && pwd.newPassword === pwd.oldPassword)
      return "New password must be different from old password.";
    if (pwd.newPassword !== pwd.confirmPassword)
      return "New password and confirm password must match.";
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

  return (
    <div className="flex justify-center items-center bg-[#F3F8FB] p-1">
      <div className="bg-white shadow-xl rounded-2xl w-full max-w-3xl p-8 md:p-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">Profile</h2>
          {!editMode && (
            <button
              onClick={() => {
                setActiveTab("profile");
                setEditMode(true);
              }}
              className="bg-blue-500 text-white px-5 py-2 rounded-lg hover:bg-blue-600 transition"
            >
              Edit
            </button>
          )}
        </div>

        {/* Tabs */}
        {editMode && (
          <div className="flex justify-center mb-8">
            <button
              className={`px-6 py-2 rounded-l-lg font-medium transition ${activeTab === "profile"
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-600"
                }`}
              onClick={() => setActiveTab("profile")}
            >
              Edit Profile
            </button>
            <button
              className={`px-6 py-2 rounded-r-lg font-medium transition ${activeTab === "password"
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-600"
                }`}
              onClick={() => setActiveTab("password")}
            >
              Change Password
            </button>
          </div>
        )}

        {/* VIEW MODE */}
        {!editMode && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
            <div>
              <p className="text-gray-500 text-sm">Name</p>
              <p className="font-medium">{formData.name}</p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Email</p>
              <p className="font-medium">{formData.email}</p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Date of Birth</p>
              <p className="font-medium">
                {formData.dateOfBirth
                  ? new Date(formData.dateOfBirth).toLocaleDateString("en-IN")
                  : "-"}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Mobile</p>
              <p className="font-medium">{formData.mobile}</p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Alternate Mobile</p>
              <p className="font-medium">{formData.alternateMobile}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-gray-500 text-sm">Address</p>
              <p className="font-medium">{formData.address}</p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Department</p>
              <p className="font-medium">{formData.department}</p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Designation</p>
              <p className="font-medium">{formData.designation}</p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Role</p>
              <p className="font-medium capitalize">{formData.role}</p>
            </div>

            {/* OPTIONAL FIELDS DISPLAY */}
            <div>
              <p className="text-gray-500 text-sm">PAN</p>
              <p className="font-medium">{formData.pan || "-"}</p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Aadhaar</p>
              <p className="font-medium">{formData.aadhaar || "-"}</p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Account No.</p>
              <p className="font-medium">{formData.accountNumber || "-"}</p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">IFSC</p>
              <p className="font-medium">{formData.ifsc || "-"}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-gray-500 text-sm">Bank Name</p>
              <p className="font-medium">{formData.bankName || "-"}</p>
            </div>
          </div>
        )}

        {/* EDIT PROFILE */}
        {editMode && activeTab === "profile" && (
          <form
            onSubmit={onSubmitProfile}
            className="grid grid-cols-1 md:grid-cols-2 gap-5"
          >
            <Input
              label="Name"
              name="name"
              value={formData.name}
              onChange={onProfileChange}
            />
            <Input
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={onProfileChange}
            />
            <Input
              label="Date of Birth"
              name="dateOfBirth"
              type="date"
              value={formData.dateOfBirth}
              onChange={onProfileChange}
            />
            <Tel10
              label="Mobile"
              name="mobile"
              value={formData.mobile}
              onChange={onProfileChange}
            />
            <Tel10
              label="Alternate Mobile"
              name="alternateMobile"
              value={formData.alternateMobile}
              onChange={onProfileChange}
            />
            <div className="md:col-span-2">
              <Input
                label="Address"
                name="address"
                value={formData.address}
                onChange={onProfileChange}
              />
            </div>

            <Input
              label="Department"
              name="department"
              value={formData.department}
              disabled
            />
            <Input
              label="Designation"
              name="designation"
              value={formData.designation}
              disabled
            />
            <Input label="Role" name="role" value={formData.role} disabled />

            {/* OPTIONAL FIELDS */}
            <Input
              label="PAN (Optional)"
              name="pan"
              value={formData.pan}
              onChange={(e) =>
                onProfileChange({
                  target: { name: "pan", value: e.target.value.toUpperCase() },
                })
              }
            />
            <Input
              label="Aadhaar (Optional)"
              name="aadhaar"
              value={formData.aadhaar}
              onChange={onProfileChange}
              maxLength={12}
            />
            <Input
              label="Bank Account No. (Optional)"
              name="accountNumber"
              value={formData.accountNumber}
              onChange={onProfileChange}
            />
            <Input
              label="IFSC Code (Optional)"
              name="ifsc"
              value={formData.ifsc}
              onChange={(e) =>
                onProfileChange({
                  target: { name: "ifsc", value: e.target.value.toUpperCase() },
                })
              }
              maxLength={11}
            />
            <Input
              label="Bank Name (Optional)"
              name="bankName"
              value={formData.bankName}
              onChange={onProfileChange}
            />

            <div className="col-span-1 md:col-span-2 flex justify-end gap-3 mt-2">
              <button
                type="button"
                onClick={() => setEditMode(false)}
                className="border px-5 py-2 rounded-lg text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        )}

        {/* CHANGE PASSWORD */}
        {editMode && activeTab === "password" && (
          <form onSubmit={onSubmitPassword} className="space-y-5">
            {!isAdmin && (
              <PasswordField
                label="Old Password"
                name="oldPassword"
                value={pwd.oldPassword}
                onChange={onPwdChange}
              />
            )}
            <PasswordField
              label="New Password"
              name="newPassword"
              value={pwd.newPassword}
              onChange={onPwdChange}
            />
            <PasswordField
              label="Confirm Password"
              name="confirmPassword"
              value={pwd.confirmPassword}
              onChange={onPwdChange}
            />

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditMode(false)}
                className="border px-5 py-2 rounded-lg text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Reset Password"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Account;
