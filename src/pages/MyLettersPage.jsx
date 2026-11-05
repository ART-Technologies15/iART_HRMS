import React, { useEffect, useState } from "react";
import { Download, FileText } from "lucide-react";
import { toast } from "react-toastify";
import Table from "../reusableComponents/Table";
import { getMyLetters } from "../api/authApi";
import { useAuth } from "../context/AuthContext";

const LETTER_LABELS = {
  appointment: "Appointment Letter",
  offer: "Offer Letter",
  appraisal: "Appraisal Letter",
  experience: "Experience Letter",
  relieving: "Relieving Letter",
  termination: "Termination Letter",
};

const extractLetters = (response) => {
  const candidates = [
    response?.letters,
    response?.data?.letters,
    response?.data?.assignments,
    response?.data,
  ];
  return candidates.find(Array.isArray) || [];
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const MyLettersPage = () => {
  const { user } = useAuth();
  const [letters, setLetters] = useState([]);
  const [employeeDetails, setEmployeeDetails] = useState(null);
  const [totalLetters, setTotalLetters] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    let active = true;
    const fetchLetters = async () => {
      try {
        setLoading(true);
        const response = await getMyLetters();
        if (!response?.success) {
          toast.error(response?.message || "Unable to load your letters");
          if (active) {
            setLetters([]);
            setEmployeeDetails(null);
            setTotalLetters(0);
          }
          return;
        }
        if (active) {
          const data = response.data || {};
          const nextLetters = extractLetters(response);
          setLetters(nextLetters);
          setEmployeeDetails(data.employee || data);
          setTotalLetters(data.totalLetters ?? nextLetters.length);
        }
      } catch (error) {
        toast.error(error?.response?.data?.message || "Unable to load your letters");
        if (active) {
          setLetters([]);
          setEmployeeDetails(null);
          setTotalLetters(0);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchLetters();
    return () => {
      active = false;
    };
  }, [user]);

  const columns = [
    {
      key: "type",
      header: "Letter",
      render: (letter) => (
        <div className="flex min-w-[180px] items-center gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <FileText size={17} />
          </span>
          <span className="font-medium text-slate-800">
            {letter.title || LETTER_LABELS[letter.type] || letter.type || "Letter"}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (letter) => (
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${letter.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
          {letter.status || "active"}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Assigned",
      render: (letter) => <span className="text-sm text-slate-600">{formatDate(letter.assignedAt || letter.createdAt)}</span>,
    },
    {
      key: "assignedBy",
      header: "Assigned By",
      render: (letter) => <span className="text-sm text-slate-600">{letter.assignedBy?.name || "-"}</span>,
    },
    {
      key: "file",
      header: "Document",
      render: (letter) => {
        const attachment = letter.fileUrl || letter.file || letter.url || letter.documentUrl || letter.letterUrl;
        const fileUrl = typeof attachment === "string" ? attachment : attachment?.url;
        return fileUrl ? (
          <a href={fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline">
            <Download size={15} /> Open PDF
          </a>
        ) : <span className="text-sm text-slate-400">No document link</span>;
      },
    },
  ];

  return (
    <div className="flex min-h-full flex-col gap-5 p-2 sm:p-4">
      <header>
        <h1 className="mt-1 text-2xl font-semibold text-slate-800">My Letters</h1>
        <p className="mt-1 text-sm text-slate-500">
          {employeeDetails?.name || user?.name || "You"}
          {employeeDetails?.employeeId ? ` · ${employeeDetails.employeeId}` : ""}
          {employeeDetails?.department ? ` · ${employeeDetails.department}` : ""}
          {employeeDetails?.email ? ` · ${employeeDetails.email}` : ""}
        </p>
      </header>

      {!loading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Total letters</p>
            <p className="mt-1 text-lg font-semibold text-slate-800">{totalLetters}</p>
          </div>
        </div>
      )}

      <Table
        columns={columns}
        data={letters}
        loading={loading}
        emptyText="No letters have been assigned to you."
      />
    </div>
  );
};

export default MyLettersPage;
