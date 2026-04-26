import { useState, useEffect } from "react";
import {
  Users,
  Search,
  RefreshCw,
  UserPlus,
  Calendar,
  Mail,
  Phone,
  ArrowRight,
  Clock,
  Trash2,
  AlertCircle,
  GraduationCap,
} from "lucide-react";
import toast from "react-hot-toast";

const API_BASE = "http://localhost:8000";

interface PreRegistration {
  id: number;
  name: string;
  personal_email: string;
  mobile: string;
  nic_number: string;
  gender: string;
  faculty: string;
  department: string;
  degree_program: string;
  intake: string;
  created_at: string;
}

interface PendingRegistrationsProps {
  onProcess: (data: PreRegistration) => void;
}

export default function PendingRegistrations({
  onProcess,
}: PendingRegistrationsProps) {
  const [data, setData] = useState<PreRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const getToken = () => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      toast.error("Authentication required. Please log in as Admin.");
      return null;
    }
    return token;
  };

  const fetchData = async () => {
    setLoading(true);
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/admin/pre-registrations`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else if (res.status === 401) {
        toast.error("Session expired. Please log in again.");
      } else if (res.status === 403) {
        toast.error("Not authorized to view pre-registrations.");
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.detail || "Failed to load the registration queue.");
      }
    } catch {
      toast.error("Network error. Could not reach the server.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (
      !confirm(`Reject the application from "${name}"? This cannot be undone.`)
    )
      return;

    const token = getToken();
    if (!token) return;

    setDeletingId(id);
    try {
      const res = await fetch(`${API_BASE}/api/admin/pre-registrations/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 204 || res.ok) {
        toast.success(`Application from ${name} has been rejected.`);
        setData((prev) => prev.filter((item) => item.id !== id));
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.detail || "Failed to reject application.");
      }
    } catch {
      toast.error("Network error. Could not complete the action.");
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = data.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.personal_email.toLowerCase().includes(search.toLowerCase()) ||
      item.nic_number.toLowerCase().includes(search.toLowerCase()),
  );

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="text-blue-600" />
            Pre-Registration Queue
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Review and process student applications submitted via the public
            portal.
          </p>
        </div>

        {/* Search Bar + Refresh grouped together */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={17}
            />
            <input
              type="text"
              placeholder="Search name, email or NIC..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm text-sm w-72"
            />
          </div>
          <button
            onClick={fetchData}
            className="p-2.5 text-gray-400 cursor-pointer hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-gray-200 bg-white shadow-sm"
            title="Refresh Queue"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-24 text-center">
              <RefreshCw className="w-10 h-10 text-blue-200 animate-spin mx-auto mb-4" />
              <p className="text-gray-400 font-medium tracking-wide text-sm">
                Gathering applications...
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-24 text-center mb-5">
              <div className="w-20 h-20 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-2">
                <AlertCircle size={38} />
              </div>
              <p className="text-gray-600 font-bold text-lg">Queue is Empty</p>
              <p className="text-gray-400 text-sm max-w-xs mx-auto mt-1.5">
                {search
                  ? "No results match your search."
                  : "No pending applications found."}
              </p>
            </div>
          ) : (
            <table className="w-full text-left table-fixed">
              <colgroup>
                <col className="w-[34%]" />
                <col className="w-[30%]" />
                <col className="w-[18%]" />
                <col className="w-[18%]" />
              </colgroup>
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-sm font-bold tracking-wider border-b border-gray-100">
                  <th className="px-6 py-4">Student Information</th>
                  <th className="px-6 py-4">Academic Details</th>
                  <th className="px-6 py-4">
                    <span className="flex items-center px-10 gap-2">
                      <Calendar size={13} />
                      Applied Date
                    </span>
                  </th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-blue-50/20 transition-colors group"
                  >
                    {/* Student Info */}
                    <td className="px-6 py-5 align-top">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-900 capitalize text-base">
                          {item.name}
                        </span>
                        <div className="flex flex-col gap-1 mt-1.5">
                          <span className="text-sm font-medium text-blue-700 flex items-center gap-1.5 truncate">
                            <Mail
                              size={12}
                              className="text-gray-500 shrink-0"
                            />
                            {item.personal_email}
                          </span>
                          {item.mobile && (
                            <span className="text-sm text-gray-500 flex items-center gap-1.5">
                              <Phone
                                size={12}
                                className="text-gray-500 shrink-0"
                              />
                              {item.mobile}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Academic Details */}
                    <td className="px-6 py-5 align-top">
                      <div className="flex flex-col gap-1.5">
                        <span className="font-medium text-gray-800 text-sm flex items-center gap-1.5">
                          <GraduationCap
                            size={15}
                            className="text-indigo-500 shrink-0"
                          />
                          <span className="truncate">{item.faculty}</span>
                        </span>
                        <span className="text-gray-500 font-semibold text-xs leading-tight line-clamp-2">
                          {item.degree_program}
                        </span>
                        {item.intake && (
                          <span className="flex items-left py-0.5 rounded-full text-sm font-bold text-blue-700 mt-0.5">
                            Batch: {item.intake}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-6 py-5 align-top">
                      <div className="flex items-center gap-2 font-semibold text-sm text-gray-500 pt-0.5">
                        <Clock size={15} className="text-gray-500 shrink-0" />
                        {formatDate(item.created_at)}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-5 align-top">
                      <div className="flex items-center gap-6 justify-center">
                        {/* Reject */}
                        <button
                          onClick={() => handleDelete(item.id, item.name)}
                          disabled={deletingId === item.id}
                          className="flex items-center cursor-pointer gap-1.5 px-3 py-2 text-red-600 bg-white border-2 border-red-200 hover:bg-red-50 rounded-xl font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Reject Application"
                        >
                          {deletingId === item.id ? (
                            <RefreshCw size={13} className="animate-spin" />
                          ) : (
                            <Trash2 size={13} />
                          )}
                          Reject
                        </button>

                        {/* Enroll */}
                        <button
                          onClick={() => onProcess(item)}
                          className="inline-flex cursor-pointer items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl border-2 hover:bg-blue-700 transition-all shadow-sm shadow-blue-500/20 active:scale-95"
                        >
                          <UserPlus size={14} />
                          Enroll
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        {!loading && data.length > 0 && (
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
              {filtered.length} Application{filtered.length !== 1 ? "s" : ""}
              {search &&
                data.length !== filtered.length &&
                ` (filtered from ${data.length})`}
            </span>
            <span className="text-xs text-gray-400">
              Last refreshed just now
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
