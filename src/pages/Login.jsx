import React, { useState, useEffect } from "react";
import loginCardBackground from "../assets/loginCardBackground.png";
import iArtLogo from "../assets/logoiart.svg";
import eyeOpen from "../assets/vieweye.png";
import eyeClosed from "../assets/hideeye.png";
import { loginUser } from "../api/authApi";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { resolvedTheme } = useTheme();
  const [remember, setRemember] = useState(false);

  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberEmail");
    const savedPassword = localStorage.getItem("rememberPassword");

    if (savedEmail && savedPassword) {
      setEmail(savedEmail);
      setPassword(atob(savedPassword)); // decode
      setRemember(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      toast.warn("Please fill in both email and password fields.", {
        position: "top-center",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await loginUser({ email, password });

      if (response.success) {
        toast.success("Login successful!", { position: "top-center" });

        // Save login details if remember me is checked
        if (remember) {
          localStorage.setItem("rememberEmail", email);
          localStorage.setItem("rememberPassword", btoa(password)); // encode for safety
        } else {
          localStorage.removeItem("rememberEmail");
          localStorage.removeItem("rememberPassword");
        }

        login(response.user, response.token);
        navigate("/dashboard", { replace: true });
      } else {
        toast.error(response.message || "Invalid credentials", {
          position: "top-center",
        });
      }
    } catch (error) {
      toast.error(error.message || "Login failed", { position: "top-center" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#C6E6FB] transition-colors md:flex-row dark:bg-slate-950">
      {/* Mobile logo */}
      <div className="flex md:hidden justify-center items-center pt-10">
        <div className="flex items-center justify-center rounded-2xl bg-amber-50 px-8 py-6 shadow-md backdrop-blur-md dark:bg-slate-100">
          <img
            src={iArtLogo}
            alt="Company logo"
            className="h-16 w-auto object-contain"
          />
        </div>
      </div>

      {/* Left Section */}
      <div className="flex flex-col justify-center px-8 md:px-16 lg:px-24 w-full md:w-1/2 py-10">
        <h1 className="mb-2 text-center text-3xl font-bold text-gray-800 dark:text-slate-100 md:text-left">
          Login
        </h1>
        <p className="mb-2 text-center text-gray-600 dark:text-slate-300 md:text-left">
          Welcome Back
        </p>
        <p className="mb-8 text-center text-gray-500 dark:text-slate-400 md:text-left">
          Please enter your login credentials.
        </p>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Email Field */}
          <div>
            <label className="mb-1 block font-medium text-gray-700 dark:text-slate-300">
              Email ID
            </label>
            <input
              type="email"
              placeholder="Enter Email ID"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-amber-50 px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400"
            />
          </div>

          {/* Password Field */}
          <div className="relative">
            <label className="mb-1 block font-medium text-gray-700 dark:text-slate-300">
              Password
            </label>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-amber-50 px-4 py-2 pr-10 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400"
            />

            {/* Flat Eye Icon */}
            <img
              src={showPassword ? eyeOpen : eyeClosed}
              alt="Toggle password visibility"
              className="absolute right-3 top-10 w-5 h-5 cursor-pointer opacity-70 hover:opacity-100"
              onClick={() => setShowPassword((prev) => !prev)}
            />
          </div>

          {/* Remember Me */}
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center space-x-2 text-gray-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={remember}
                onChange={() => setRemember(!remember)}
                className="accent-[#1D9BF0]"
              />
              <span>Remember me</span>
            </label>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full ${loading ? "bg-blue-300 dark:bg-blue-900" : "bg-[#1D9BF0] hover:bg-blue-600"
              } rounded-md py-2 font-semibold text-white transition`}
          >
            {loading ? "Logging in..." : "LOGIN"}
          </button>
        </form>
      </div>

      {/* Right Section */}
      <div
        className="hidden md:flex w-full md:w-1/2 justify-center items-center p-10 relative"
        style={{
          backgroundImage: resolvedTheme === "dark"
            ? `url(${loginCardBackground}), linear-gradient(135deg, #0f172a 10%, #1e3a5f 54%, #164e63 100%)`
            : `url(${loginCardBackground}), linear-gradient(135deg, #AAD9F9 10%, #72C0F6 54%, #1D9BF0 100%)`,
          backgroundRepeat: "no-repeat, no-repeat",
          backgroundPosition: "center, center",
          backgroundSize: "contain, cover",
        }}
      >
        <div className="pointer-events-none absolute inset-0 bg-black/10 dark:bg-black/30" />
        <div className="relative z-10 flex w-full max-w-xs items-center justify-center rounded-2xl bg-amber-50 px-10 py-8 shadow-lg backdrop-blur-md dark:bg-slate-100">
          <img
            src={iArtLogo}
            alt="Company logo"
            className="h-20 w-auto object-contain"
          />
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
