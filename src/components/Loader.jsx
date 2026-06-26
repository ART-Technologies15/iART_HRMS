import React from "react";

const Loader = ({ size = 40, stroke = 4, color = "#6B7280" }) => {
  // default gray-500
  return (
    <div className="flex justify-center items-center w-full py-10">
      <svg
        width={size}
        height={size}
        viewBox="0 0 50 50"
        className="animate-spin"
      >
        <circle
          cx="25"
          cy="25"
          r="20"
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray="100"
          strokeDashoffset="60"
        />
      </svg>
    </div>
  );
};

export default Loader;
