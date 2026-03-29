import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import {
  BeakerIcon,
  CircleStackIcon,
  UserIcon,
  CpuChipIcon,
  HeartIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline';
import { api } from '../context/AuthContext';
import DoctorCard from '../components/DoctorCard';
import { getAssetUrl } from '../lib/runtimeConfig';
import image390 from '../assets/image_390.webp';
import image391 from '../assets/image_391.png';
import image392 from '../assets/image_392.png';
import image393 from '../assets/image_393.png';
import reviewer1 from '../assets/reviewers/r1.png';
import reviewer2 from '../assets/reviewers/r2.png';
import reviewer3 from '../assets/reviewers/r3.png';
import reviewer4 from '../assets/reviewers/r4.png';

const HERO_IMAGE = image390;
const FEATURE_LEFT = image391;
const FEATURE_CENTER = image392;
const FEATURE_RIGHT = image393;

const FEATURES = [
  { image: FEATURE_LEFT, title: 'Find a Doctor', description: 'Browse our list of trusted doctors and choose the right one for your needs.' },
  { image: FEATURE_CENTER, title: 'Book Appointment', description: 'Schedule your consultation at a time that works for you.' },
  { image: FEATURE_RIGHT, title: 'Track Appointments', description: 'Keep track of your upcoming and past medical consultations easily.' },
];

const SPECIALTIES = [
  { name: 'Dermatologist', icon: BeakerIcon },
  { name: 'Gastroenterologist', icon: CircleStackIcon },
  { name: 'Pediatricians', icon: UserIcon },
  { name: 'Neurologist', icon: CpuChipIcon },
  { name: 'Gynecologist', icon: HeartIcon },
  { name: 'General', icon: AcademicCapIcon },
];

const TRUST_METRICS = [
  { value: '120+', label: 'Trusted doctors' },
  { value: '1,000+', label: 'Patients served' },
  { value: '15+', label: 'Active clinic departments' },
  { value: '98%', label: 'Positive experience score' },
];

const TESTIMONIALS = [
  {
    name: 'Sadia Rahman',
    role: 'Patient',
    quote: 'Booking was quick, the reminders were clear, and I did not have to call the clinic even once.',
    image: reviewer1,
  },
  {
    name: 'Dr. Nadia Karim',
    role: 'Cardiology',
    quote: 'The workflow keeps appointments, prescriptions, and patient context in one place without feeling cluttered.',
    image: reviewer2,
  },
  {
    name: 'Rashed Hossain',
    role: 'Patient',
    quote: 'I could see my appointments, prescription updates, and imaging history from the same account.',
    image: reviewer3,
  },
  {
    name: 'Dr. Farhan Ahmed',
    role: 'Neurology',
    quote: 'The clinic-based flow is practical. Reception can manage the queue while I stay focused on the consultation.',
    image: reviewer4,
  },
  {
    name: 'Nabil Hasan',
    role: 'Patient',
    quote: 'The interface feels calm and professional, which matters when you are already stressed about health issues.',
    image: reviewer1,
  },
  {
    name: 'Dr. Asha Sultana',
    role: 'General Medicine',
    quote: 'It is easier to manage follow-ups when reminders and previous records are visible in the same system.',
    image: reviewer3,
  },
];

interface DoctorItem {
  id: number;
  department?: string;
  consultationFee?: number;
  profileImage?: string;
  user?: { firstName: string; lastName: string };
}

export default function LandingPage() {
  const { user } = useAuth();
  const { data: doctors = [], isLoading: loadingDoctors } = useQuery({
    queryKey: ['doctors', 'landing', 5],
    queryFn: async () => {
      const { data: res } = await api.get<{ success: boolean; data: { doctors: DoctorItem[] } }>('/doctors', {
        params: { limit: 5 },
      });
      return res.data?.doctors ?? [];
    },
  });

  const { data: ratingsMap = {} } = useQuery({
    queryKey: ['ratings', doctors.map((d) => d.id)],
    queryFn: async () => {
      const out: Record<number, { averageRating: number; totalRatings: number }> = {};
      await Promise.all(
        doctors.map(async (d) => {
          try {
            const { data: r } = await api.get<{ success: boolean; data: { summary: { averageRating: number; totalRatings: number } } }>(
              `/ratings/doctor/${d.id}`
            );
            out[d.id] = r.data?.summary ?? { averageRating: 0, totalRatings: 0 };
          } catch {
            out[d.id] = { averageRating: 0, totalRatings: 0 };
          }
        })
      );
      return out;
    },
    enabled: doctors.length > 0,
  });

  const marqueeCards = [...TESTIMONIALS, ...TESTIMONIALS];

  return (
    <div className="flex flex-col bg-slate-50 min-h-screen font-sans">
      <style>{`
        @keyframes landing-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
      {/* ================= HERO ================= */}
      <section className="relative overflow-hidden bg-white pt-10 pb-10 md:pt-12 md:pb-12 border-b border-slate-200">
        <div className="absolute inset-0 bg-blue-50/50 -skew-y-3 transform origin-top-left -z-10" />
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_0.95fr] items-center gap-8 xl:gap-10">
            <div className="text-center md:text-left">
              <span className="inline-block py-1 px-3 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold tracking-wide mb-4">
                Modern Healthcare Platform
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-tight mb-5">
                Healthcare, <br className="hidden md:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Simplified for Everyone</span>
              </h1>
              <p className="text-lg md:text-xl text-slate-600 mb-7 max-w-2xl mx-auto md:mx-0 leading-relaxed">
                Find specialists, book appointments, and manage follow-up care in one calm, clinic-ready experience.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4">
                <Link
                  to={user ? (user.role === 'patient' ? '/app/patient-dashboard' : user.role === 'doctor' ? '/app/doctor-dashboard' : user.role === 'receptionist' ? '/app/receptionist-dashboard' : '/app/admin-dashboard') : '/register'}
                  className="w-full sm:w-auto inline-flex items-center justify-center bg-blue-600 text-white text-lg font-semibold py-3 px-8 rounded-full shadow-lg hover:bg-blue-700 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
                >
                  {user ? 'Go to Dashboard' : 'Get Started Now'}
                </Link>
                <Link
                  to="/doctors"
                  className="w-full sm:w-auto inline-flex items-center justify-center bg-white text-slate-700 border border-slate-300 text-lg font-semibold py-3 px-8 rounded-full shadow-sm hover:bg-slate-50 hover:text-blue-600 transition-all duration-300"
                >
                  Find a Doctor
                </Link>
              </div>
            </div>
            <div className="w-full max-w-xl md:max-w-none relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-200 to-indigo-100 rounded-[3rem] transform rotate-3 scale-105 -z-10 opacity-70" />
              <img
                src={HERO_IMAGE}
                className="w-full h-auto rounded-[3rem] shadow-2xl object-cover bg-white"
                alt="Healthcare professionals"
                loading="eager"
                decoding="async"
                fetchPriority="high"
              />
              <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {TRUST_METRICS.map(({ value, label }) => (
                  <div key={label} className="rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 text-left shadow-sm">
                    <div className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">{value}</div>
                    <div className="mt-1 text-xs md:text-sm text-slate-500 leading-5">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= PROVIDING THE BEST MEDICAL SERVICES ================= */}
      <section className="relative py-9 md:py-10 bg-gradient-to-b from-slate-50 to-white overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-blue-100/50 blur-3xl opacity-60"></div>
          <div className="absolute top-1/2 right-0 transform translate-x-1/3 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-indigo-50/50 blur-3xl opacity-60"></div>
        </div>

        <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-8 fade-in-up">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-3 tracking-tight">
              Search, book, and stay on track.
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed">
              A simpler flow from finding the right doctor to successful follow-up care.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6 relative">
            {/* Connecting line for desktop */}
            <div className="hidden md:block absolute top-[120px] left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-blue-100 via-indigo-200 to-blue-100 -z-10"></div>

            {FEATURES.map(({ image, title, description }, idx) => (
              <div
                key={title}
                className="group relative flex flex-col items-center"
              >
                {/* Step Number Badge */}
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-10 h-10 rounded-full bg-white shadow-md border-2 border-blue-500 flex items-center justify-center text-blue-600 font-bold z-20">
                  {idx + 1}
                </div>

                <div className="bg-white rounded-3xl p-5 shadow-lg shadow-slate-200/40 border border-slate-100/80 hover:shadow-xl hover:border-slate-200 transition-all duration-500 w-full flex-1 flex flex-col items-center pt-9">
                  <div className="relative h-36 w-full flex items-center justify-center mb-5 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/40 overflow-hidden transition-colors duration-500">
                    <div className="absolute inset-0 bg-white/40 group-hover:bg-transparent transition-colors duration-500 backdrop-blur-[1px] group-hover:backdrop-blur-none"></div>
                    <img
                      src={image}
                      alt={title}
                      className="relative z-10 max-h-[85%] w-auto object-contain group-hover:scale-110 drop-shadow-md transition-transform duration-700 ease-out"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2 text-center">{title}</h3>
                  <p className="text-slate-600 text-center leading-relaxed">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= PATIENT STORIES ================= */}
      <section className="py-8 md:py-10 bg-white border-y border-slate-200 overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 mb-5">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
            <div className="max-w-3xl">
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900">
                Experience preview
              </h2>
            </div>

          </div>
        </div>

        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-16 md:w-24 bg-gradient-to-r from-white to-transparent z-10" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 md:w-24 bg-gradient-to-l from-white to-transparent z-10" />
          <div
            className="flex w-max gap-4 px-4 sm:px-6 lg:px-8 motion-reduce:[animation:none]"
            style={{ animation: 'landing-marquee 36s linear infinite' }}
          >
            {marqueeCards.map((item, index) => (
              <article
                key={`${item.name}-${index}`}
                className="w-[270px] md:w-[310px] shrink-0 rounded-[2rem] border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.45)]"
              >
                <div className="flex items-center gap-4">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-14 w-14 rounded-2xl object-cover ring-1 ring-slate-200"
                    decoding="async"
                  />
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">{item.name}</h3>
                    <p className="text-sm text-blue-700 font-medium">{item.role}</p>
                  </div>
                </div>
                <p className="mt-4 text-[15px] leading-6 text-slate-600">
                  “{item.quote}”
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ================= FIND BY SPECIALITY ================= */}
      <section className="py-9 md:py-10 bg-white relative">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-end justify-between mb-7 gap-6">
            <div className="max-w-2xl">
              <span className="inline-block py-1 px-3 rounded-full bg-slate-100 text-slate-700 text-sm font-bold tracking-widest uppercase mb-3">
                Departments
              </span>
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-3 tracking-tight">
                Explore by Speciality
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed">
                Browse departments and find the care you need.
              </p>
            </div>
            <Link
              to="/doctors"
              className="group inline-flex items-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold py-3 px-6 rounded-2xl border border-slate-200 transition-all duration-300 whitespace-nowrap"
            >
              View all specialities
              <span className="inline-block w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <span className="transform group-hover:translate-x-0.5 transition-transform text-sm leading-none">→</span>
              </span>
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {SPECIALTIES.map(({ name, icon: Icon }) => (
              <Link
                to={`/doctors?specialty=${name}`}
                key={name}
                className="group relative overflow-hidden flex flex-col items-center justify-center gap-4 bg-white rounded-[2rem] p-6 border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(57,144,215,0.12)] hover:border-slate-200 hover:-translate-y-1 transition-all duration-500"
              >
                {/* Abstract background shape on hover */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-50 to-indigo-50/50 rounded-bl-[100px] -z-10 translate-x-12 -translate-y-12 group-hover:translate-x-0 group-hover:-translate-y-0 transition-transform duration-500 ease-out"></div>

                <div className="relative w-14 h-14 flex items-center justify-center rounded-2xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-blue-200 transition-all duration-500">
                  <Icon className="w-8 h-8 relative z-10" />
                  {/* Pulse ring on hover */}
                  <div className="absolute inset-0 rounded-2xl border-2 border-blue-600 opacity-0 group-hover:animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
                </div>

                <span className="text-slate-800 font-bold text-base md:text-lg text-center group-hover:text-blue-600 transition-colors">{name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ================= TOP DOCTORS TO BOOK ================= */}
      <section className="py-9 md:py-10 bg-slate-50 border-t border-slate-200">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-7">
            <span className="text-sm font-bold tracking-wider text-blue-600 uppercase mb-2 block">Our Specialists</span>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Top Rated Doctors
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Connect with experienced doctors across key specialties.
            </p>
          </div>

          {loadingDoctors ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : doctors.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
              <p className="text-slate-500 text-lg">No doctors listed yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6 mb-12">
              {doctors.map((doc) => {
                const name = doc.user ? `Dr. ${doc.user.firstName} ${doc.user.lastName}` : 'Doctor';
                const rating = ratingsMap[doc.id] ?? { averageRating: 0, totalRatings: 0 };
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
                    isPatient={false}
                  />
                );
              })}
            </div>
          )}

          <div className="text-center">
            <Link
              to="/doctors"
              className="inline-flex items-center gap-2 bg-blue-600 text-white font-semibold py-3.5 px-10 rounded-full shadow-lg hover:bg-blue-700 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
            >
              Browse All Doctors
            </Link>
          </div>
        </div>
      </section>

      {/* ================= CTA BANNER ================= */}
      <section className="py-8 md:py-9 bg-white">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-[2rem] overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 shadow-2xl py-8 px-6 md:px-10 text-center lg:text-left flex flex-col lg:flex-row items-center justify-between gap-6">
            {/* Background decorative bubbles */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-white opacity-10 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-blue-400 opacity-20 blur-3xl"></div>

            <div className="relative z-10 max-w-2xl">
              <h2 className="text-2xl md:text-3xl lg:text-3xl font-bold text-white mb-3 leading-tight">
                Ready to take control of your health?
              </h2>
              <p className="text-blue-100 text-base md:text-lg mb-0">
                Book your first appointment and manage care from one place.
              </p>
            </div>

            <div className="relative z-10 shrink-0">
              {user ? (
                <Link
                  to={user.role === 'patient' ? '/app/patient-dashboard' : user.role === 'doctor' ? '/app/doctor-dashboard' : user.role === 'receptionist' ? '/app/receptionist-dashboard' : '/app/admin-dashboard'}
                  className="inline-flex items-center justify-center bg-white text-blue-700 text-base font-bold py-3 px-8 rounded-full shadow-xl hover:bg-slate-50 hover:scale-105 transition-all duration-300 whitespace-nowrap"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center bg-white text-blue-700 text-base font-bold py-3 px-8 rounded-full shadow-xl hover:bg-slate-50 hover:scale-105 transition-all duration-300 whitespace-nowrap"
                >
                  Create Free Account
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
