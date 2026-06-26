import React, { useState, useRef, useEffect } from "react";
import { MoreVertical } from "lucide-react";
import { createPortal } from "react-dom";

const PortalMenu = ({ anchorRef, open, onClose, children, width = 160 }) => {
  const menuRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const updatePosition = () => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const top = rect.bottom + window.scrollY + 8;
    const left = rect.right + window.scrollX - width;
    setPos({ top, left });
  };

  useEffect(() => {
    if (!open) return;
    updatePosition();

    const onScrollOrResize = () => updatePosition();
    const onClickOutside = (e) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        !anchorRef.current?.contains(e.target)
      ) {
        onClose?.();
      }
    };

    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    document.addEventListener("mousedown", onClickOutside);

    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      ref={menuRef}
      style={{ top: pos.top, left: pos.left, width }}
      className="fixed z-50 bg-white border border-gray-200 rounded-md shadow-lg"
    >
      {children}
    </div>,
    document.body
  );
};

const UserActionsMenu = ({ onView, onEdit, onViewAttendance, onDelete }) => {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);

  return (
    <div className="relative inline-flex">
      <button
        ref={btnRef}
        onClick={() => setOpen((o) => !o)}
        className="p-2 rounded-md hover:bg-gray-100"
        aria-label="User actions"
      >
        <MoreVertical size={18} />
      </button>

      <PortalMenu anchorRef={btnRef} open={open} onClose={() => setOpen(false)}>
        <button
          onClick={() => {
            setOpen(false);
            onView?.();
          }}
          className="w-full text-left px-3 py-2 hover:bg-gray-50"
        >
          View User
        </button>

        <button
          onClick={() => {
            setOpen(false);
            onEdit?.();
          }}
          className="w-full text-left px-3 py-2 hover:bg-gray-50"
        >
          Edit User
        </button>

        <button
          onClick={() => {
            setOpen(false);
            onViewAttendance?.();
          }}
          className="w-full text-left px-3 py-2 hover:bg-gray-50"
        >
          View Attendance
        </button>

        <button
          onClick={() => {
            setOpen(false);
            onDelete?.();
          }}
          className="w-full text-left px-3 py-2 text-red-600 hover:bg-red-50"
        >
          Delete
        </button>
      </PortalMenu>
    </div>
  );
};

export default UserActionsMenu;
