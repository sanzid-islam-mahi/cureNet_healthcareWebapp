import { Link, useNavigate } from 'react-router-dom';
import { UserCircleIcon } from '@heroicons/react/24/outline';
import { StarIcon, CalendarDaysIcon } from '@heroicons/react/24/solid';

interface DoctorCardProps {
    id: number;
    name: string;
    department?: string;
    imgSrc?: string | null;
    averageRating?: number;
    totalRatings?: number;
    consultationFee?: number;
    isPatient?: boolean;
    onBookNow?: (doctorId: number) => void;
}

export default function DoctorCard({
    id,
    name,
    department,
    imgSrc,
    averageRating = 0,
    totalRatings = 0,
    isPatient = false,
    onBookNow,
}: DoctorCardProps) {
    const navigate = useNavigate();

    return (
        <div
            onClick={() => navigate(`/doctors/${id}`)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(`/doctors/${id}`);
                }
            }}
            tabIndex={0}
            role="button"
            className="group relative bg-white rounded-2xl overflow-hidden flex flex-col shadow-md
                 border border-slate-200/80 hover:shadow-xl hover:-translate-y-1
                 transition-all duration-300 ease-out focus:outline-none cursor-pointer
                 focus:ring-2 focus:ring-[#3990D7] focus:ring-offset-2"
        >
            {/* ── Image / avatar area with gradient backdrop ── */}
            <div className="relative h-52 overflow-hidden bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 flex items-end justify-center">
                {/* subtle radial glow */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,255,255,0.18),transparent_70%)]" />

                {imgSrc ? (
                    <img
                        src={imgSrc}
                        alt={name}
                        className="absolute inset-0 w-full h-full object-cover object-top
                       group-hover:scale-105 transition-transform duration-500 ease-out"
                        decoding="async"
                    />
                ) : (
                    <UserCircleIcon className="relative z-10 w-24 h-24 text-white/70 mb-2" />
                )}

                {/* Frosted rating badge */}
                {totalRatings > 0 && (
                    <div className="absolute top-3 right-3 z-20 flex items-center gap-1
                          bg-white/20 backdrop-blur-md border border-white/30
                          text-white text-xs font-semibold px-2 py-1 rounded-full shadow">
                        <StarIcon className="w-3 h-3 text-yellow-300" />
                        {averageRating.toFixed(1)}
                    </div>
                )}

                {/* bottom fade from image into card */}
                <div className="absolute bottom-0 inset-x-0 h-12
                        bg-gradient-to-t from-white to-transparent" />
            </div>

            {/* ── Content ── */}
            <div className="flex flex-col flex-1 px-4 pt-2 pb-4 gap-1">
                {/* Available dot */}
                <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    Available
                </p>

                <h3 className="text-sm font-bold text-gray-900 leading-tight truncate">{name}</h3>

                <p className="text-xs text-[#3990D7] font-medium truncate">
                    {department || 'General Physician'}
                </p>

                {totalRatings > 0 ? (
                    <p className="text-[11px] text-gray-400 flex items-center gap-1">
                        <StarIcon className="w-3 h-3 text-yellow-400" />
                        {averageRating.toFixed(1)}
                        <span className="text-gray-300">·</span>
                        {totalRatings} {totalRatings === 1 ? 'review' : 'reviews'}
                    </p>
                ) : (
                    <p className="text-[11px] text-gray-400">No reviews yet</p>
                )}

                {/* CTA button */}
                <div className="mt-auto pt-3" onClick={(e) => e.stopPropagation()}>
                    {isPatient ? (
                        <button
                            type="button"
                            className="flex items-center justify-center gap-1.5 w-full text-center
                         rounded-full bg-gradient-to-r from-[#3990D7] to-indigo-500
                         py-2 px-3 text-xs font-semibold text-white
                         hover:from-[#2d7ab8] hover:to-indigo-600
                         shadow-sm hover:shadow-md transition-all duration-200"
                            onClick={(e) => {
                                e.stopPropagation();
                                onBookNow?.(id);
                            }}
                        >
                            <CalendarDaysIcon className="w-3.5 h-3.5" />
                            Book Now
                        </button>
                    ) : (
                        <Link
                            to="/login?redirect=/doctors"
                            className="block w-full text-center rounded-full border-2 border-[#3990D7]
                         py-2 px-3 text-xs font-semibold text-[#3990D7]
                         hover:bg-[#EAEFFF] transition-colors"
                            onClick={(e) => e.stopPropagation()}
                        >
                            Sign in to book
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}
