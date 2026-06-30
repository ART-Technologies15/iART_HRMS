import React, { useEffect, useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import PhoneBookCard from "../components/PhoneBookCard";
import AdminUserFilterModal from "../components/AdminUserFilterModal";
import UserDetailsModal from "../components/UserDetailsModal";
import { getAllUsers } from "../api/authApi";
import Loader from "../components/Loader";
import { useAuth } from "../context/AuthContext";

const PER_PAGE = 10;

const PhoneBookPage = () => {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    designation: "",
    role: "",
    department: "",
  });
  const { user: loggedInUser } = useAuth();


  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    const res = await getAllUsers({
      page: pagination.page,
      limit: PER_PAGE,
      search,
      ...filters,
    });

    if (res.success) {
      setUsers(res.users);
      setPagination(res.pagination);
    } else {
      setUsers([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, [search, filters, pagination.page]);

  // Build dynamic filter options from API data
  const options = useMemo(() => {
    const roles = [...new Set(users.map((u) => u.role))];
    const departments = [...new Set(users.map((u) => u.department))];
    const designations = [...new Set(users.map((u) => u.designation))];
    return { roles, departments, designations };
  }, [users]);

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-[#F3F8FB]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-800">
          Phone Book
        </h1>

        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <input
              type="text"
              placeholder="Search name, phone, email, address..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <Search
              size={18}
              className="absolute left-3 top-2.5 text-gray-400 pointer-events-none"
            />
          </div>

          <button
            onClick={() => setFilterOpen(true)}
            className="inline-flex items-center gap-2 bg-white border border-gray-300 px-3 py-2 rounded-lg text-sm hover:bg-gray-50"
          >
            <SlidersHorizontal size={16} />
            Filters
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && <Loader className="mt-10" />}

      {/* Empty State */}
      {!loading && users.length === 0 && (
        <div className="text-center py-10 text-gray-500">No users found 🚫</div>
      )}

      {/* Cards Grid */}
      {!loading && users.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {users
            .map((user) => (
              <PhoneBookCard
                key={user._id}
                user={user}
                onClick={() => setSelectedUser(user)}
              />
            ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && pagination.totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 pt-4">
          <button
            onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
            disabled={pagination.page === 1}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Prev
          </button>

          {Array.from({ length: pagination.totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPagination((p) => ({ ...p, page: i + 1 }))}
              className={`px-3 py-1 border rounded ${pagination.page === i + 1
                  ? "bg-blue-600 text-white"
                  : "bg-white"
                }`}
            >
              {i + 1}
            </button>
          ))}

          <button
            onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
            disabled={pagination.page === pagination.totalPages}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Filter Modal */}
      <AdminUserFilterModal
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        initialFilters={filters}
        onApply={(f) => {
          setFilters(f);
          setPagination((p) => ({ ...p, page: 1 }));
        }}
        options={options}
      />

      {/* User Detail Modal */}
      <UserDetailsModal
        open={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        user={selectedUser}
      />
    </div>
  );
};

export default PhoneBookPage;
