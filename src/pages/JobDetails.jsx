import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
    ArrowLeft,
    Eye,
    X,
    MapPin,
    Users,
    CalendarClock,
    Wallet,
    Clock,
    Briefcase,
    GraduationCap,
    CheckCircle2,
    ExternalLink,
    History,
} from "lucide-react";
import CustomTable from "../components/CustomTable";
import { getCareerPostById, updateCareerApplicationStatus } from "../api/authApi";

// =====================================================================
// Static option lists / label maps
// =====================================================================

const APPLICATION_STATUS_OPTIONS = [
    "new",
    "reviewing",
    "shortlisted",
    "interview",
    "selected",
    "rejected",
    "withdrawn",
];

const JOB_POST_STATUS_STYLES = {
    draft: "bg-slate-100 text-slate-600",
    published: "bg-green-50 text-green-700",
    closed: "bg-red-50 text-red-700",
    archived: "bg-slate-100 text-slate-500",
};

const APPLICATION_STATUS_STYLES = {
    new: "bg-blue-50 text-blue-700",
    reviewing: "bg-amber-50 text-amber-700",
    shortlisted: "bg-purple-50 text-purple-700",
    interview: "bg-indigo-50 text-indigo-700",
    selected: "bg-green-50 text-green-700",
    rejected: "bg-red-50 text-red-700",
    withdrawn: "bg-slate-100 text-slate-500",
};

const EXPERIENCE_LABELS = {
    student: "Student",
    fresher: "Fresher",
    "0-1-years": "0-1 years",
    "1-3-years": "1-3 years",
    "3-5-years": "3-5 years",
    "5-plus-years": "5+ years",
};

const OPPORTUNITY_THEME = {
    job: {
        icon: Briefcase,
        gradient: "from-blue-600 to-sky-500",
        chip: "bg-blue-50 text-blue-700",
    },
    internship: {
        icon: GraduationCap,
        gradient: "from-amber-500 to-orange-500",
        chip: "bg-amber-50 text-amber-700",
    },
};

// =====================================================================
// Small presentational helpers
// =====================================================================

const StatusBadge = ({ status, styles = APPLICATION_STATUS_STYLES, light = false }) => (
    <span
        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
            light
                ? "bg-white/20 text-white backdrop-blur-sm"
                : styles[status] || "bg-slate-100 text-slate-600"
        }`}
    >
        {status ? status.replace(/-/g, " ") : "-"}
    </span>
);

const formatDate = (value, withTime = false) =>
    value
        ? new Date(value).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
          })
        : "-";

const formatSalary = (salary) => {
    if (!salary) return "-";
    if (salary.displayText) return salary.displayText;
    if (salary.min || salary.max) {
        const min = salary.min ? `₹${salary.min.toLocaleString("en-IN")}` : "";
        const max = salary.max ? `₹${salary.max.toLocaleString("en-IN")}` : "";
        return `${min}${min && max ? " - " : ""}${max}${
            salary.period ? `/${salary.period}` : ""
        }`;
    }
    return "-";
};

const formatDuration = (duration) => {
    if (!duration || !duration.value) return "-";
    return `${duration.value} ${duration.unit}`;
};

const capitalize = (str) =>
    str ? str.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "";

const getLatestStatus = (application) => {
    if (!application?.statusHistory?.length) return "new";
    return application.statusHistory[application.statusHistory.length - 1].status;
};

const InfoTile = ({ icon: Icon, label, value }) => (
    <div className="flex items-start gap-2.5 rounded-xl border border-gray-100 bg-gray-50/70 p-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-gray-500 shadow-sm">
            <Icon size={15} />
        </div>
        <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{label}</p>
            <p className="truncate text-sm font-medium text-gray-800">{value || "-"}</p>
        </div>
    </div>
);

const ChecklistSection = ({ label, items }) =>
    items && items.length > 0 ? (
        <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
            <ul className="space-y-1.5">
                {items.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                        <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-green-500" />
                        <span>{item}</span>
                    </li>
                ))}
            </ul>
        </div>
    ) : null;

const DetailRow = ({ label, value }) => (
    <div className="flex items-start justify-between gap-4 border-b border-gray-50 pb-2">
        <span className="w-36 flex-shrink-0 text-xs font-medium uppercase tracking-wide text-gray-400">
            {label}
        </span>
        <span className="flex-1 text-right text-gray-700">{value || "-"}</span>
    </div>
);

const DetailBlock = ({ label, text }) =>
    text ? (
        <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
            <p className="text-gray-700">{text}</p>
        </div>
    ) : null;

// =====================================================================
// Main page
// =====================================================================

export const JobDetails = () => {
    const navigate = useNavigate();
    const { id } = useParams();

    const [jobPost, setJobPost] = useState(null);
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);

    const [showJobModal, setShowJobModal] = useState(false);
    const [selectedApplication, setSelectedApplication] = useState(null);
    const [statusTarget, setStatusTarget] = useState(null); // application pending a status update

    const fetchDetails = async () => {
        try {
            setLoading(true);
            const res = await getCareerPostById(id);

            if (res?.success) {
                setJobPost(res.data.careerPost);
                setApplications(res.data.applications || []);
            } else {
                toast.error(res?.message || "Failed to load job details");
            }
        } catch (err) {
            console.error("Error fetching career post:", err);
            toast.error(err?.message || "Server error while fetching job details");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) fetchDetails();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const columns = [
        {
            label: "Candidate",
            accessor: "fullName",
            render: (_, row) => (
                <div className="min-w-[200px]">
                    <p className="truncate text-sm font-semibold text-slate-800">{row.fullName || "-"}</p>
                    {row.email ? (
                        <a
                            href={`mailto:${row.email}`}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-1 block truncate text-xs text-blue-600 hover:text-blue-800 hover:underline"
                        >
                            {row.email}
                        </a>
                    ) : (
                        <p className="mt-1 text-xs text-slate-500">-</p>
                    )}
                </div>
            ),
        },
        {
            label: "Phone",
            accessor: "phone",
            render: (value) =>
                value ? (
                    <a
                        href={`tel:${value}`}
                        onClick={(e) => e.stopPropagation()}
                        className="whitespace-nowrap text-sm text-blue-600 hover:text-blue-800 hover:underline"
                    >
                        {value}
                    </a>
                ) : (
                    <span className="text-sm text-slate-500">-</span>
                ),
        },
        {
            label: "Experience",
            accessor: "experience",
            render: (value) => (
                <span className="whitespace-nowrap text-sm text-slate-600">
                    {EXPERIENCE_LABELS[value] || value || "-"}
                </span>
            ),
        },
        {
            label: "Type",
            accessor: "opportunityType",
            render: (value) => (
                <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium capitalize text-slate-600">
                    {value || "-"}
                </span>
            ),
        },
        {
            label: "Status",
            accessor: "statusHistory",
            render: (_, row) => <StatusBadge status={getLatestStatus(row)} />,
        },
        {
            label: "Applied On",
            accessor: "createdAt",
            render: (value) => (
                <span className="whitespace-nowrap text-sm text-slate-600">{formatDate(value)}</span>
            ),
        },
        {
            label: "Actions",
            accessor: "_id",
            render: (_, row) => (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        setStatusTarget(row);
                    }}
                    className="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                >
                    Update Status
                </button>
            ),
        },
    ];

    const LoadingSkeleton = () => (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                            {columns.map((col) => (
                                <th
                                    key={col.label}
                                    className="whitespace-nowrap px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                                >
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: 5 }).map((_, index) => (
                            <tr key={index} className="animate-pulse border-b border-gray-100">
                                {columns.map((col, cIdx) => (
                                    <td key={cIdx} className="px-5 py-4">
                                        <div className="h-4 w-24 rounded bg-gray-200" />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen max-w-full overflow-x-hidden bg-[#F3F8FB] p-4 space-y-6 sm:p-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                    <h1 className="text-xl font-semibold text-gray-800 sm:text-2xl">Job Details</h1>
                    {jobPost && (
                        <p className="mt-1 truncate text-sm text-gray-500">
                            {jobPost.title} · {applications.length} application
                            {applications.length === 1 ? "" : "s"}
                        </p>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
                    >
                        <ArrowLeft size={16} />
                        Back
                    </button>

                    <button
                        type="button"
                        disabled={!jobPost}
                        onClick={() => setShowJobModal(true)}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:opacity-50"
                    >
                        <Eye size={16} />
                        View Job Post
                    </button>
                </div>
            </div>

            {/* Applications table */}
            {loading ? (
                <LoadingSkeleton />
            ) : applications.length === 0 ? (
                <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm">
                    <p className="text-sm font-medium text-gray-600">No applications yet</p>
                    <p className="mt-1 text-xs text-gray-400">
                        Applications for this opening will show up here.
                    </p>
                </div>
            ) : (
                <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <div className="inline-block min-w-full align-middle">
                            <CustomTable
                                columns={columns}
                                data={applications}
                                onRowClick={(row) => setSelectedApplication(row)}
                                footerLegend={[]}
                                hidePagination={applications.length <= 10}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* View Job Post modal */}
            {showJobModal && jobPost && (
                <JobPostModal jobPost={jobPost} onClose={() => setShowJobModal(false)} />
            )}

            {/* Application detail modal */}
            {selectedApplication && (
                <ApplicationDetailModal
                    application={selectedApplication}
                    onClose={() => setSelectedApplication(null)}
                    onUpdateStatus={() => {
                        setStatusTarget(selectedApplication);
                        setSelectedApplication(null);
                    }}
                />
            )}

            {/* Update status modal */}
            {statusTarget && (
                <UpdateStatusModal
                    application={statusTarget}
                    onClose={() => setStatusTarget(null)}
                    onUpdated={() => {
                        setStatusTarget(null);
                        fetchDetails();
                    }}
                />
            )}
        </div>
    );
};

// =====================================================================
// View Job Post modal
// =====================================================================

const JobPostModal = ({ jobPost, onClose }) => {
    const theme = OPPORTUNITY_THEME[jobPost.opportunityType] || OPPORTUNITY_THEME.job;
    const ThemeIcon = theme.icon;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-xl">
                <div className={`relative rounded-t-2xl bg-gradient-to-r ${theme.gradient} px-6 py-5 text-white`}>
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
                                <ThemeIcon size={20} />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-lg font-semibold leading-snug">{jobPost.title}</h2>
                                <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-white/80">
                                    {jobPost.opportunityType}
                                    {jobPost.internshipType ? ` · ${jobPost.internshipType}` : ""}
                                    {" · "}
                                    {jobPost.category}
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="rounded-md p-1 text-white/80 hover:bg-white/15 hover:text-white">
                            <X size={18} />
                        </button>
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                        <StatusBadge status={jobPost.status} styles={JOB_POST_STATUS_STYLES} light />
                        {jobPost.publishedAt && (
                            <span className="text-xs text-white/80">
                                Published {formatDate(jobPost.publishedAt)}
                            </span>
                        )}
                        {jobPost.closedAt && (
                            <span className="text-xs text-white/80">
                                · Closed {formatDate(jobPost.closedAt)}
                            </span>
                        )}
                    </div>
                </div>

                <div className="space-y-5 px-6 py-5">
                    <div className="grid grid-cols-2 gap-3">
                        <InfoTile icon={MapPin} label="Location" value={`${jobPost.location || "-"} · ${jobPost.workMode || "-"}`} />
                        <InfoTile icon={Users} label="Vacancies" value={jobPost.vacancies} />
                        {jobPost.opportunityType === "job" ? (
                            <InfoTile icon={Wallet} label="Salary" value={formatSalary(jobPost.salary)} />
                        ) : (
                            <InfoTile icon={Clock} label="Duration" value={formatDuration(jobPost.duration)} />
                        )}
                        <InfoTile icon={CalendarClock} label="Deadline" value={formatDate(jobPost.applicationDeadline)} />
                    </div>

                    {jobPost.description && (
                        <div className="rounded-xl border border-gray-100 bg-white p-4">
                            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">Description</p>
                            <p className="text-sm leading-relaxed text-gray-700">{jobPost.description}</p>
                        </div>
                    )}

                    {(jobPost.responsibilities?.length > 0 || jobPost.requirements?.length > 0) && (
                        <div className="grid gap-5 sm:grid-cols-2">
                            <ChecklistSection label="Responsibilities" items={jobPost.responsibilities} />
                            <ChecklistSection label="Requirements" items={jobPost.requirements} />
                        </div>
                    )}

                    {jobPost.skills?.length > 0 && (
                        <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Skills</p>
                            <div className="flex flex-wrap gap-1.5">
                                {jobPost.skills.map((skill, idx) => (
                                    <span key={idx} className={`rounded-full px-2.5 py-1 text-xs font-medium ${theme.chip}`}>
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// =====================================================================
// Application detail modal
// =====================================================================

const ApplicationDetailModal = ({ application, onClose, onUpdateStatus }) => {
    const currentStatus = getLatestStatus(application);
    const location = application.currentLocation;
    const locationLabel = [location?.city, location?.state, location?.country]
        .filter(Boolean)
        .join(", ");

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                    <div className="min-w-0">
                        <h2 className="truncate text-lg font-semibold text-gray-800">{application.fullName}</h2>
                        <p className="mt-0.5 text-xs uppercase tracking-wide text-gray-400">
                            Applied for {application.category} / {application.subCategory}
                        </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <button
                            onClick={onUpdateStatus}
                            className="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                        >
                            Update Status
                        </button>
                        <button onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                            <X size={18} />
                        </button>
                    </div>
                </div>

                <div className="space-y-5 px-6 py-5 text-sm">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Current Status</span>
                        <StatusBadge status={currentStatus} />
                    </div>

                    <div className="space-y-3">
                        <DetailRow label="Email" value={application.email} />
                        <DetailRow label="Phone" value={application.phone} />
                        <DetailRow label="Experience" value={EXPERIENCE_LABELS[application.experience] || application.experience} />
                        <DetailRow label="Opportunity Type" value={application.opportunityType} />
                        {locationLabel && <DetailRow label="Location" value={locationLabel} />}
                        {application.linkedinProfile && (
                            <DetailRow
                                label="LinkedIn"
                                value={
                                    <a href={application.linkedinProfile} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline">
                                        View <ExternalLink size={12} />
                                    </a>
                                }
                            />
                        )}
                        {application.githubProfile && (
                            <DetailRow
                                label="GitHub"
                                value={
                                    <a href={application.githubProfile} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline">
                                        View <ExternalLink size={12} />
                                    </a>
                                }
                            />
                        )}
                        {application.portfolio && (
                            <DetailRow
                                label="Portfolio"
                                value={
                                    <a href={application.portfolio} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline">
                                        View <ExternalLink size={12} />
                                    </a>
                                }
                            />
                        )}
                        {application.resume?.fileUrl && (
                            <DetailRow
                                label="Resume"
                                value={
                                    <a href={application.resume.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline">
                                        {application.resume.fileName || "View Resume"} <ExternalLink size={12} />
                                    </a>
                                }
                            />
                        )}
                    </div>

                    <DetailBlock label="About" text={application.about} />

                    {application.pastExperience?.length > 0 && (
                        <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                                Past Experience
                            </p>
                            <div className="space-y-3">
                                {application.pastExperience.map((exp, idx) => (
                                    <div key={exp._id || idx} className="rounded-xl border border-gray-100 bg-gray-50/70 p-3">
                                        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                                            <p className="text-sm font-semibold text-gray-800">
                                                {exp.jobTitle} · {exp.companyName}
                                            </p>
                                            <span className="text-xs capitalize text-gray-400">
                                                {capitalize(exp.employmentType)}
                                            </span>
                                        </div>
                                        <p className="mt-0.5 text-xs text-gray-400">
                                            {formatDate(exp.startDate)} —{" "}
                                            {exp.currentlyWorking ? "Present" : formatDate(exp.endDate)}
                                        </p>
                                        {exp.description && (
                                            <p className="mt-1.5 text-sm text-gray-700">{exp.description}</p>
                                        )}
                                        {exp.technologies?.length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-1.5">
                                                {exp.technologies.map((tech, tIdx) => (
                                                    <span key={tIdx} className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-gray-600 shadow-sm">
                                                        {tech}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {application.statusHistory?.length > 0 && (
                        <div>
                            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                                <History size={13} /> Status History
                            </p>
                            <ul className="space-y-2.5">
                                {[...application.statusHistory].reverse().map((entry, idx) => (
                                    <li key={idx} className="flex items-start gap-3">
                                        <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <StatusBadge status={entry.status} />
                                                <span className="text-xs text-gray-400">
                                                    {formatDate(entry.changedAt, true)}
                                                </span>
                                            </div>
                                            {entry.note && (
                                                <p className="mt-1 text-sm text-gray-600">{entry.note}</p>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// =====================================================================
// Update status modal
// =====================================================================

const UpdateStatusModal = ({ application, onClose, onUpdated }) => {
    const currentStatus = getLatestStatus(application);
    const [status, setStatus] = useState(currentStatus);
    const [note, setNote] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (status === currentStatus) {
            toast.error(`Application is already '${status}'`);
            return;
        }

        try {
            setSubmitting(true);
            const res = await updateCareerApplicationStatus(application._id, {
                status,
                note: note.trim(),
            });

            if (res?.success !== false) {
                toast.success("Application status updated");
                onUpdated();
            } else {
                toast.error(res?.message || "Failed to update status");
            }
        } catch (err) {
            console.error("Error updating application status:", err);
            toast.error(err?.message || "Server error while updating status");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                    <div className="min-w-0">
                        <h2 className="text-lg font-semibold text-gray-800">Update Status</h2>
                        <p className="mt-0.5 truncate text-xs text-gray-400">{application.fullName}</p>
                    </div>
                    <button onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Current</span>
                        <StatusBadge status={currentStatus} />
                    </div>

                    <label className="block text-xs font-medium text-gray-500">
                        New Status
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm capitalize focus:outline-none focus:ring-2 focus:ring-blue-400"
                        >
                            {APPLICATION_STATUS_OPTIONS.map((opt) => (
                                <option key={opt} value={opt} className="capitalize">
                                    {opt.replace(/-/g, " ")}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="block text-xs font-medium text-gray-500">
                        Note <span className="normal-case text-gray-400">(optional)</span>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            rows={3}
                            placeholder="e.g. Strong React fundamentals, moving to interview round"
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                    </label>

                    {application.statusHistory?.length > 0 && (
                        <div>
                            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                                History
                            </p>
                            <ul className="max-h-32 space-y-2 overflow-y-auto pr-1">
                                {[...application.statusHistory].reverse().map((entry, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-xs text-gray-500">
                                        <StatusBadge status={entry.status} />
                                        <span className="mt-0.5">{formatDate(entry.changedAt, true)}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
                        >
                            {submitting ? "Updating..." : "Update Status"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default JobDetails;