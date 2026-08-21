import React, { useEffect, useRef, useState } from "react";
import { Search, Menu } from "lucide-react";
import CustomTable from "../components/CustomTable";
import { getWebsiteContacts } from "../api/authApi";
import { toast } from "react-toastify";

export const WebsiteContactUs = () => {
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);

    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");

    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const searchDebounceRef = useRef(null);

    // ==========================================================
    // Search debounce
    // ==========================================================
    useEffect(() => {
        if (searchDebounceRef.current) {
            clearTimeout(searchDebounceRef.current);
        }

        searchDebounceRef.current = setTimeout(() => {
            setPage(1);
            setSearch(searchInput.trim());
        }, 400);

        return () => clearTimeout(searchDebounceRef.current);
    }, [searchInput]);

    // ==========================================================
    // Fetch contacts
    // ==========================================================
    const fetchContacts = async () => {
        try {
            setLoading(true);

            const res = await getWebsiteContacts({
                page,
                limit: rowsPerPage,
                search,
            });

            if (res?.success) {
                setContacts(res.contacts || []);
                setTotalPages(res.pagination?.totalPages || 1);
                setTotalRecords(res.pagination?.total || 0);
            } else {
                toast.error(res?.message || "Failed to load website contacts");
                setContacts([]);
            }
        } catch (err) {
            console.error("Error fetching website contacts:", err);

            toast.error(
                err?.message || "Server error while fetching website contacts"
            );

            setContacts([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchContacts();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, rowsPerPage, search]);

    // ==========================================================
    // Table columns
    // ==========================================================
    const columns = [
        {
            label: "Name",
            accessor: "name",
            render: (_, row) => (
                <div className="min-w-[200px]">
                    <p className="truncate text-sm font-semibold text-slate-800">
                        {row.name || "-"}
                    </p>

                    {row.email ? (
                        <a
                            href={`mailto:${row.email}`}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-1 block truncate text-xs text-blue-600 hover:text-blue-800 hover:underline"
                            title={`Email ${row.email}`}
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
                        title={`Call ${value}`}
                    >
                        {value}
                    </a>
                ) : (
                    <span className="text-sm text-slate-500">-</span>
                ),
        },

        {
            label: "Service",
            accessor: "service",
            render: (value) => (
                <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                    {value || "-"}
                </span>
            ),
        },

        {
            label: "Budget",
            accessor: "budget",
            render: (value) => (
                <span className="inline-flex rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                    {value || "-"}
                </span>
            ),
        },

        {
            label: "Message",
            accessor: "message",
            render: (value) => (
                <div
                    className="max-w-[300px] truncate text-sm text-slate-600"
                    title={value || ""}
                >
                    {value || "-"}
                </div>
            ),
        },

        {
            label: "Date",
            accessor: "createdAt",
            render: (value) => (
                <span className="whitespace-nowrap text-sm text-slate-600">
                    {value
                        ? new Date(value).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                        })
                        : "-"}
                </span>
            ),
        },
    ];

    const tableData = contacts.map((contact) => ({
        ...contact,
    }));

    // ==========================================================
    // Loading Skeleton
    // ==========================================================
    const LoadingSkeleton = () => (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                            {[
                                "Name",
                                "Phone",
                                "Service",
                                "Budget",
                                "Message",
                                "Date",
                            ].map((heading) => (
                                <th
                                    key={heading}
                                    className="whitespace-nowrap px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                                >
                                    {heading}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody>
                        {Array.from({ length: 5 }).map((_, index) => (
                            <tr
                                key={index}
                                className="animate-pulse border-b border-gray-100"
                            >
                                <td className="px-5 py-4">
                                    <div className="space-y-2">
                                        <div className="h-4 w-32 rounded bg-gray-200" />
                                        <div className="h-3 w-40 rounded bg-gray-100" />
                                    </div>
                                </td>

                                <td className="px-5 py-4">
                                    <div className="h-4 w-24 rounded bg-gray-200" />
                                </td>

                                <td className="px-5 py-4">
                                    <div className="h-6 w-28 rounded-full bg-gray-200" />
                                </td>

                                <td className="px-5 py-4">
                                    <div className="h-6 w-20 rounded-full bg-gray-200" />
                                </td>

                                <td className="px-5 py-4">
                                    <div className="h-4 w-52 rounded bg-gray-200" />
                                </td>

                                <td className="px-5 py-4">
                                    <div className="h-4 w-24 rounded bg-gray-200" />
                                </td>
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
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold text-gray-800 sm:text-2xl">
                    Website Contact Us
                </h1>

                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                    {totalRecords} Contacts
                </span>
            </div>

            {/* Search */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex w-full items-center gap-2">
                    <div className="relative min-w-0 flex-1">
                        <input
                            type="text"
                            placeholder="Search name, email, phone..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            className="w-full truncate rounded-lg border border-gray-300 bg-white px-4 py-2 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />

                        <Search
                            size={18}
                            className="pointer-events-none absolute left-3 top-2.5 text-gray-400"
                        />
                    </div>

                    <button
                        onClick={() => setMobileMenuOpen((value) => !value)}
                        className="flex-shrink-0 rounded-md border border-gray-300 bg-white p-2 hover:bg-gray-50 sm:hidden"
                    >
                        <Menu size={20} />
                    </button>
                </div>
            </div>

            {/* Mobile menu */}
            {mobileMenuOpen && (
                <div className="grid grid-cols-1 gap-3 border-b border-gray-200 pb-4 sm:hidden">
                    <div className="rounded-lg bg-white p-3 text-sm text-gray-600">
                        Total Contacts:{" "}
                        <span className="font-semibold text-gray-800">
                            {totalRecords}
                        </span>
                    </div>
                </div>
            )}

            {/* =====================================================
          Loading
      ====================================================== */}
            {loading ? (
                <LoadingSkeleton />
            ) : tableData.length === 0 ? (
                <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm">
                    <p className="text-sm font-medium text-gray-600">
                        No website contacts found
                    </p>

                    {search && (
                        <p className="mt-1 text-xs text-gray-400">
                            Try changing your search term.
                        </p>
                    )}
                </div>
            ) : (
                <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <div className="inline-block min-w-full align-middle">
                            <CustomTable
                                columns={columns}
                                data={tableData}
                                onRowClick={(row) => {
                                    console.log("Selected contact:", row);
                                }}
                                footerLegend={[]}
                                currentPage={page}
                                totalPages={totalPages}
                                totalRecords={totalRecords}
                                rowsPerPage={rowsPerPage}
                                onPageChange={(newPage) => setPage(newPage)}
                                onRowsPerPageChange={(newLimit) => {
                                    setRowsPerPage(newLimit);
                                    setPage(1);
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WebsiteContactUs;