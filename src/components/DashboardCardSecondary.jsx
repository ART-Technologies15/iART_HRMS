import React from "react";
import upArrow from "../assets/UP.svg";
import downArrow from "../assets/Down.svg";

const DashboardCardSecondary = ({ title, subtitle, lines = [], comparison, icon }) => {
  const isNegative = comparison?.includes("-");
  const arrowIcon = isNegative ? downArrow : upArrow;
  const textColor = isNegative ? "text-[#F26A4B]" : "text-[#5CB85C]";

  // Split comparison text into parts
  const parts = comparison?.split(" ") || [];
  const percentagePart = parts[0]; // e.g. "-13%"
  const restText = parts.slice(1).join(" "); // e.g. "Compared to January"

  return (
    <div className="flex items-start justify-between bg-white border border-[#E5EAF1] rounded-2xl shadow-sm p-6 w-full max-w-[300px] sm:max-w-[320px] md:max-w-[360px]">
      {/* Left Section */}
      <div className="flex flex-col">
        <p className="text-[#203864] text-[16px] font-semibold">
          {title}{" "}
          <span className="text-[#B7C3D0] font-medium">/ {subtitle}</span>
        </p>

        {/* Multiple value lines */}
        <div className="mt-2 space-y-[2px]">
          {lines.map((line, i) => (
            <p
              key={i}
              className="text-[#203864] text-[18px] sm:text-[20px] font-bold"
            >
              {line}
            </p>
          ))}
        </div>

        {/* Comparison */}
        <div className="flex items-center mt-3">
          <img src={arrowIcon} alt="trend" className="w-4 h-4 mr-1" />
          <span className={`text-[14px] font-medium ${textColor}`}>
            {percentagePart}
          </span>
          <span className="text-[14px] text-[#A6B3C5] ml-1">{restText}</span>
        </div>
      </div>

      {/* Right Section (Chart / Icon) */}
      <div className="ml-4 flex-shrink-0">{icon}</div>
    </div>
  );
};

export default DashboardCardSecondary;
