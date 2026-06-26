import React, { useState, useEffect } from "react";
import loginCardBackground from "../assets/loginCardBackground.png";
import iArtLogo from "../assets/logoiart.svg";
import eyeOpen from "../assets/vieweye.png";
import eyeClosed from "../assets/hideeye.png";
import { loginUser } from "../api/authApi";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
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
    <div className="min-h-screen flex flex-col md:flex-row bg-[#C6E6FB]">
      {/* Mobile logo */}
      <div className="flex md:hidden justify-center items-center pt-10">
        <div className="bg-amber-50 rounded-2xl px-8 py-6 flex justify-center items-center backdrop-blur-md shadow-md">
          <img
            src={iArtLogo}
            alt="Company logo"
            className="h-16 w-auto object-contain"
          />
        </div>
      </div>

      {/* Left Section */}
      <div className="flex flex-col justify-center px-8 md:px-16 lg:px-24 w-full md:w-1/2 py-10">
        <h1 className="text-3xl font-bold text-gray-800 mb-2 text-center md:text-left">
          Login
        </h1>
        <p className="text-gray-600 mb-2 text-center md:text-left">
          Welcome Back
        </p>
        <p className="text-gray-500 mb-8 text-center md:text-left">
          Please enter your login credentials.
        </p>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Email Field */}
          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Email ID
            </label>
            <input
              type="email"
              placeholder="Enter Email ID"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-amber-50"
            />
          </div>

          {/* Password Field */}
          <div className="relative">
            <label className="block text-gray-700 font-medium mb-1">
              Password
            </label>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-amber-50"
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
            <label className="flex items-center space-x-2 text-gray-600">
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
            className={`w-full ${loading ? "bg-blue-300" : "bg-[#1D9BF0] hover:bg-blue-600"
              } text-white font-semibold py-2 rounded-md transition`}
          >
            {loading ? "Logging in..." : "LOGIN"}
          </button>
        </form>
      </div>

      {/* Right Section */}
      <div
        className="hidden md:flex w-full md:w-1/2 justify-center items-center p-10 relative"
        style={{
          backgroundImage: `url(${loginCardBackground}), linear-gradient(135deg, #AAD9F9 10%, #72C0F6 54%, #1D9BF0 100%)`,
          backgroundRepeat: "no-repeat, no-repeat",
          backgroundPosition: "center, center",
          backgroundSize: "contain, cover",
        }}
      >
        <div className="absolute inset-0 bg-black/10 pointer-events-none" />
        <div className="relative z-10 bg-amber-50 rounded-2xl px-10 py-8 flex justify-center items-center backdrop-blur-md shadow-lg max-w-xs w-full">
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
