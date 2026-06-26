import LeaveActionMenu from "./LeaveActionMenu";

const formatRange = (leaveDays) => {
  const from = new Date(leaveDays[0].date).toLocaleDateString();
  const to = new Date(
    leaveDays[leaveDays.length - 1].date
  ).toLocaleDateString();
  return from === to ? from : `${from} → ${to}`;
};

const badge = (status) => {
  const colors = {
    pending: "bg-yellow-100 text-yellow-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    cancelled: "bg-gray-200 text-gray-700",
  };
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded ${colors[status]}`}>
      {status}
    </span>
  );
};

const leaveColumns = ({ role, onCancel, onApprove, onReject }) => {
  const baseColumns = [
    { label: "Leave Type", accessor: "leaveCategory" },
    {
      label: "Dates Requested",
      accessor: "leaveDays",
      render: (_, row) => formatRange(row.leaveDays),
    },
    { label: "Reason", accessor: "reason" },
    { label: "Status", accessor: "status", render: (value) => badge(value) },
    { label: "Action By", accessor: "actionBy" },
    {
      label: "Actions",
      accessor: "_id",
      render: (_, row) => (
        <LeaveActionMenu
          row={row}
          role={role}
          onCancel={onCancel}
          onApprove={onApprove}
          onReject={onReject}
        />
      ),
    },
  ];

  
  if (role === "admin") {
    baseColumns.unshift({ label: "Employee", accessor: "employeeName" });
  }

  return baseColumns;
};

export default leaveColumns;
