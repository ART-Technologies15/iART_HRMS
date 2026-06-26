import React from "react";
import upArrow from "../assets/UP.svg";
import downArrow from "../assets/Down.svg";

const DashboardCard = ({ title, subtitle, value, comparison, icon }) => {
  const isNegative = comparison?.includes("-") ?? false;
  const arrowIcon = isNegative ? downArrow : upArrow;
  const textColor = isNegative ? "text-red-500" : "text-green-500";

  const parts = comparison?.split(" ") ?? [];
  const percentagePart = parts[0] ?? "";
  const restText = parts.slice(1).join(" ");

  return (
    <div className="flex items-stretch justify-between p-4 bg-white border border-gray-200 rounded-2xl shadow-sm w-full max-w-sm">
      <div className="flex flex-col justify-between min-w-0 flex-1">
        {/* Title / Subtitle / Value */}
        <div>
          <p className="text-gray-600 text-sm font-medium text-nowrap">
            {title}
          </p>
          <p className="text-blue-700 text-lg font-semibold mt-1">{subtitle}</p>
          <h2 className="text-md font-bold text-gray-800 mt-2">{value}</h2>
        </div>

        {/* Comparison line */}
        {comparison && (
          <div className="flex items-center gap-1 mt-2 min-w-0">
            <img
              src={arrowIcon}
              alt="trend"
              className="w-4 h-4 flex-shrink-0"
            />
            <span className={`text-sm font-medium ${textColor} flex-shrink-0`}>
              {percentagePart}
            </span>
            {/* 2. keep the rest on a single line when there is room */}
            <span className="text-sm text-gray-600 whitespace-nowrap min-w-0 overflow-hidden text-nowrap">
              {restText}
            </span>
          </div>
        )}
      </div>

      {/*Force the icon to stay inside the card */}
      <div className="ml-4 flex-shrink-0 self-center overflow-hidden">
        {typeof icon === "string" ? (
          <img src={icon} alt="icon" className="w-12 h-12 object-contain" />
        ) : (
          icon
        )}
      </div>
    </div>
  );
};

export default DashboardCard;
