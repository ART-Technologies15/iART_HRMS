import React, { useEffect, useState, useRef } from "react";
import { toast } from "react-toastify";
import {
  punchInAPI,
  punchOutAPI,
  getTodayStatusAPI,
} from "../api/attendaceApi";

import PunchInIllustration from "../assets/PunchInIllustration.svg";
import SuccessIllustration from "../assets/SuccessIllustration.svg";
import PunchIn from "../assets/Punch-in.svg";
import PunchOut from "../assets/Punch-out.svg";

const AttendanceCard = ({ onPunchOut, hasCompletedKYC }) => {
  const [statusLoading, setStatusLoading] = useState(true);
  const [isHoliday, setIsHoliday] = useState(false);
  const [punchedIn, setPunchedIn] = useState(false);
  const [punchedOut, setPunchedOut] = useState(false);
  const [punchInTime, setPunchInTime] = useState(null);
  const [workingHours, setWorkingHours] = useState(null); // live or saved
  const timerRef = useRef(null);

  // Format live working hours into HH:MM:SS
  const formatTime = (totalSeconds = 0) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs} hrs ${mins} mins ${secs} seconds`;
  };

  // Start live timer if punched in
  const startTimer = (punchIn) => {
    timerRef.current = setInterval(() => {
      const now = new Date();
      const diffSeconds = Math.floor((now - new Date(punchIn)) / 1000);
      setWorkingHours(diffSeconds);
    }, 1000);
  };

  // Stop timer
  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  // Fetch today's punch status
  const fetchStatus = async () => {
    try {
      setStatusLoading(true);
      const res = await getTodayStatusAPI();
      setIsHoliday(res.isHoliday || false);

      setPunchedIn(res.punchedIn);
      setPunchedOut(res.punchedOut);

      if (res.punchInTime) {
        setPunchInTime(res.punchInTime);
      }

      if (res.punchedIn && !res.punchedOut) {
        // Live timer mode
        startTimer(res.punchInTime);
      } else if (res.punchedOut) {
        // Show saved totalHours
        setWorkingHours(res.totalSeconds || 0);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load attendance status");
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    return () => stopTimer();
  }, []);

  const handlePunch = async () => {
    // if (!hasCompletedKYC()) {
    //   return toast.error(
    //     "Please complete your PAN, Aadhaar and Bank details from account before punching in."
    //   );
    // }
    try {
      if (!punchedIn) {
        const res = await punchInAPI();
        toast.success("Punched In successfully");
        setPunchedIn(true);
        setPunchInTime(res.punchInTime);
        startTimer(res.punchInTime);
      } else {
        const res = await punchOutAPI();
        toast.success("Punched Out successfully");
        setPunchedOut(true);
        stopTimer();
        setWorkingHours(res.totalSeconds || 0);
        if (onPunchOut) onPunchOut();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Punch action failed");
    }
  };

  const now = new Date();
  const timeString = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  const dateString = now.toLocaleDateString("en-US", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  return (
    <div className="bg-white rounded-3xl shadow-lg p-2 max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
      {/* LEFT: Date & Time */}
      <div className="flex flex-col justify-center p-4 items-center text-center border-r border-gray-100">
        <p className="text-lg font-semibold text-gray-800">{dateString}</p>
        <p className="text-lg font-bold text-gray-900 mt-2">{timeString}</p>
      </div>

      {/* MIDDLE */}
      <div className="flex flex-col justify-center items-center">
        {/* Working Hours Box */}
        {punchedIn && (
          <div className="bg-gray-50 rounded-2xl p-3 text-center w-full mb-3">
            <p className="text-sm font-medium text-gray-600">Working Hours</p>
            <p className="text-lg font-bold text-gray-800 mt-1">
              {formatTime(workingHours)}
            </p>
          </div>
        )}

        {/* Punch Button */}
        <div className="flex items-center justify-between bg-white p-3 rounded-2xl shadow-md w-full">
          <div className="flex items-center justify-center w-14 h-14">
            <img
              src={punchedIn ? PunchOut : PunchIn}
              alt="Punch"
              className="w-10 h-10 object-contain"
            />
          </div>

          <button
            onClick={handlePunch}
            disabled={punchedOut || statusLoading || isHoliday}
            className={`flex-1 ml-2 py-2 rounded-lg font-semibold text-white transition cursor-pointer disabled:cursor-not-allowed
    ${isHoliday
                ? "bg-gray-400 cursor-not-allowed"
                : punchedOut
                  ? "bg-gray-400 cursor-not-allowed"
                  : punchedIn
                    ? "bg-red-500 hover:bg-red-600"
                    : "bg-green-600 hover:bg-green-700"
              }`}
          >
            {isHoliday
              ? "Holiday - No Punch Required"
              : punchedOut
                ? "Already Punched Out"
                : punchedIn
                  ? "Punch Out"
                  : "Punch In"}
          </button>
        </div>
      </div>

      {/* RIGHT UI */}
      <div className="bg-gray-50 rounded-2xl p-5 flex flex-col items-center justify-center text-center space-y-3">
        <img
          src={
            punchedIn && !punchedOut ? SuccessIllustration : PunchInIllustration
          }
          alt="Attendance"
          className="w-24 h-24 object-contain"
        />

        {punchedIn && !punchedOut ? (
          <>
            <p className="text-green-600 font-medium">You're Checked In</p>
            <p className="text-sm text-gray-600 leading-relaxed">
              “Success is the sum of small efforts, repeated day in and day
              out.”
            </p>
          </>
        ) : punchedOut ? (
          <>
            <p className="text-gray-500 font-medium">
              You've completed today's punch cycle.
            </p>
          </>
        ) : (
          <>
            <p className="text-blue-600 font-medium">Not Punched In Yet</p>
            <p className="text-sm text-gray-600 leading-relaxed">
              “Every day is a new opportunity to be better than yesterday.”
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default AttendanceCard;
