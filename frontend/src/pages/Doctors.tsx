import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, useAuth } from '../context/AuthContext';
import { MEDICAL_DEPARTMENTS } from '../utils/departments';
import DoctorCard from '../components/DoctorCard';
import BookAppointmentModal from '../components/BookAppointmentModal';
import { MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { getAssetUrl } from '../lib/runtimeConfig';

interface DoctorListItem {
  id: number;
  department?: string;
  consultationFee?: number;
  profileImage?: string;
  user?: { firstName: string; lastName: string; email?: string };
}

export default function Doctors() {
  const { user, loading } = useAuth();
  const isPatient = user?.role === 'patient';
  const bookingMode = loading ? 'loading' : isPatient ? 'patient' : user ? 'other-role' : 'guest';

  // URL Params parsing
  const searchParams = new URLSearchParams(window.location.search);
  const initialSpecialty = searchParams.get('specialty') || '';

  const [department, setDepartment] = useState<string>(initialSpecialty);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [bookDoctorId, setBookDoctorId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['doctors', department],
    queryFn: async () => {
      const params = department ? { department } : {};
      const { data: res } = await api.get<{ success: boolean; data: { doctors: DoctorListItem[] } }>('/doctors', {
        params,
      });
      return res.data?.doctors ?? [];
    },
  });

  const { data: ratingsMap } = useQuery({
    queryKey: ['ratings', data?.map((d) => d.id) ?? []],
    queryFn: async () => {
      if (!data?.length) return {};
      const out: Record<number, { averageRating: number; totalRatings: number }> = {};
      await Promise.all(
        data.map(async (d) => {
          try {
            const { data: r } = await api.get<{
              success: boolean;
              data: { summary: { averageRating: number; totalRatings: number } };
            }>(`/ratings/doctor/${d.id}`);
            out[d.id] = r.data?.summary ?? { averageRating: 0, totalRatings: 0 };
          } catch {
            out[d.id] = { averageRating: 0, totalRatings: 0 };
          }
        })
      );
      return out;
    },
    enabled: !!data?.length,
  });

  // Filter doctors by search query in memory
  const filteredDoctors = useMemo(() => {
    const doctors = data ?? [];
    if (!searchQuery.trim()) return doctors;
    const lowerQuery = searchQuery.toLowerCase();

    return doctors.filter(doc => {
      const firstName = doc.user?.firstName?.toLowerCase() || '';
      const lastName = doc.user?.lastName?.toLowerCase() || '';
      const fullName = `${firstName} ${lastName}`.trim();
      const docDepartment = doc.department?.toLowerCase() || '';

      return fullName.includes(lowerQuery) || docDepartment.includes(lowerQuery);
    });
  }, [data, searchQuery]);

  return (
    <div className="flex flex-col bg-slate-50 min-h-screen font-sans">
      {/* ================= HEADER HERO ================= */}
      <section className="relative overflow-hidden bg-white pt-12 pb-16 border-b border-slate-200">
        <div className="absolute inset-0 bg-blue-50/30 -z-10" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="max-w-2xl">
              <span className="inline-block py-1 px-3 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold tracking-wide mb-4">
                Our Database
              </span>
              <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 leading-tight mb-4">
                Find Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Specialist</span>
              </h1>
              <p className="text-lg text-slate-600">
                Browse our extensive list of verified medical professionals and book your appointment instantly.
              </p>
              {!isPatient && !user && (
                <div className="mt-4">
                  <p className="text-sm text-slate-500 mb-2">Want to book an appointment?</p>
                  <Link to="/login" className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700">
                    Sign in to your account <span className="ml-1">&rarr;</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Search and Filter Card */}
            <div className="w-full lg:w-auto bg-white rounded-2xl p-4 shadow-lg border border-slate-100 flex flex-col sm:flex-row gap-4 relative z-10">
              {/* Search Bar */}
              <div className="relative flex-1 min-w-[280px]">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-slate-400" aria-hidden="true" />
                </div>
                <input
                  type="text"
                  placeholder="Search doctors by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow text-sm"
                />
              </div>

              {/* Department Dropdown */}
              <div className="relative min-w-[200px]">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FunnelIcon className="h-4 w-4 text-slate-400" aria-hidden="true" />
                </div>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="block w-full pl-9 pr-10 py-3 text-sm border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <option value="">All Departments</option>
                  {MEDICAL_DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                  <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= DOCTOR GRID ================= */}
      <section className="flex-1 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Active Filters Summary */}
          {(department || searchQuery) && (
            <div className="mb-8 flex items-center gap-2 flex-wrap">
              <span className="text-sm text-slate-500">Showing results for:</span>
              {department && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-100">
                  {department}
                  <button onClick={() => setDepartment('')} className="hover:text-blue-900">
                    &times;
                  </button>
                </span>
              )}
              {searchQuery && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                  "{searchQuery}"
                  <button onClick={() => setSearchQuery('')} className="hover:text-indigo-900">
                    &times;
                  </button>
                </span>
              )}
              <button
                onClick={() => { setDepartment(''); setSearchQuery(''); }}
                className="text-sm text-slate-500 hover:text-slate-700 underline underline-offset-2 ml-2"
              >
                Clear all
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 min-h-[400px]">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-slate-500 font-medium">Loading medical professionals...</p>
            </div>
          ) : filteredDoctors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 px-4 bg-white rounded-3xl border border-slate-200 shadow-sm text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                <MagnifyingGlassIcon className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">No doctors found</h3>
              <p className="text-slate-500 max-w-sm">
                We couldn't find any medical professionals matching your current search criteria. Try adjusting your filters or search term.
              </p>
              <button
                onClick={() => { setDepartment(''); setSearchQuery(''); }}
                className="mt-6 inline-flex items-center justify-center px-6 py-2.5 bg-blue-50 text-blue-600 font-medium rounded-full hover:bg-blue-100 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {filteredDoctors.map((doc) => {
                const rating = ratingsMap?.[doc.id] ?? { averageRating: 0, totalRatings: 0 };
                const name = doc.user
                  ? `Dr. ${doc.user.firstName} ${doc.user.lastName}`
                  : 'Doctor';
                const imgSrc = getAssetUrl(doc.profileImage);
                return (
                  <DoctorCard
                    key={doc.id}
                    id={doc.id}
                    name={name}
                    department={doc.department}
                    imgSrc={imgSrc}
                    averageRating={rating.averageRating}
                    totalRatings={rating.totalRatings}
                    consultationFee={doc.consultationFee}
                    bookingMode={bookingMode}
                    onBookNow={(doctorId) => setBookDoctorId(doctorId)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </section>

      {bookDoctorId != null ? (
        <BookAppointmentModal
          prefilledDoctorId={bookDoctorId}
          lockDoctor
          onClose={() => setBookDoctorId(null)}
        />
      ) : null}
    </div>
  );
}
