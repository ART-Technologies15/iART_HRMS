import React, { useRef, useState } from "react";
import { MoreVertical } from "lucide-react";
import PortalMenu from "./PortalMenu"; 

const AttendanceActionsMenu = ({ onEdit, onDelete }) => {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);

  return (
    <div className="relative inline-flex">
      <button
        ref={btnRef}
        onClick={() => setOpen((o) => !o)}
        className="p-2 rounded-md hover:bg-gray-100"
      >
        <MoreVertical size={18} />
      </button>

      <PortalMenu anchorRef={btnRef} open={open} onClose={() => setOpen(false)}>
        <button
          className="w-full text-left px-3 py-2 hover:bg-gray-50"
          onClick={() => {
            setOpen(false);
            onEdit?.();
          }}
        >
          Edit
        </button>
        <button
          className="w-full text-left px-3 py-2 text-red-600 hover:bg-red-50"
          onClick={() => {
            setOpen(false);
            onDelete?.();
          }}
        >
          Delete
        </button>
      </PortalMenu>
    </div>
  );
};

export default AttendanceActionsMenu;
