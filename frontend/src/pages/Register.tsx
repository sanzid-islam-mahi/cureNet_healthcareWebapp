import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import type { RegisterData } from '../context/AuthContext';
import { MEDICAL_DEPARTMENTS } from '../utils/departments';
import { APP_NAME } from '../utils/constants';
import { validatePassword } from '../utils/passwordValidation';
import registerPageImage from '../assets/register_page_image.png';
type Role = 'patient' | 'doctor';

interface RegisterForm extends RegisterData {
  confirmPassword: string;
}

export default function Register() {
  const { register: doRegister } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>('patient');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register: registerField,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>();

  const password = watch('password');

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true);
    try {
      const payload: RegisterData = {
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        address: data.address,
        bmdcRegistrationNumber: data.bmdcRegistrationNumber,
        department: data.department,
        experience: data.experience,
      };
      await doRegister({ ...payload, role });
      toast.success('Account created successfully');
      navigate('/app', { replace: true });
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : 'Registration failed';
      toast.error(message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    'w-full px-8 py-4 rounded-lg font-medium bg-gray-100 border border-gray-200 placeholder-gray-500 text-sm focus:outline-none focus:border-gray-400 focus:bg-white';

  const inputSmCls =
    'w-full px-4 py-3 rounded-lg font-medium bg-gray-100 border border-gray-200 placeholder-gray-500 text-sm focus:outline-none focus:border-gray-400 focus:bg-white';

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 flex justify-center items-center py-8 px-4">
      <div className="max-w-4xl w-full bg-white shadow-lg sm:rounded-lg flex justify-center" style={{ minHeight: '560px' }}>

        {/* ── Form panel ── */}
        <div className="lg:w-1/2 xl:w-5/12 p-6 sm:p-10 overflow-y-auto">
          {/* App name */}
          <div className="text-center">
            <span className="text-2xl font-extrabold text-indigo-600">{APP_NAME}</span>
          </div>

          <div className="mt-10 flex flex-col items-center">
            <h1 className="text-2xl xl:text-3xl font-extrabold">Create Account</h1>

            <div className="w-full flex-1 mt-6">
              {/* Role selector */}
              <div className="mx-auto max-w-xs mb-6">
                <p className="text-sm font-medium text-gray-700 mb-2">I am a:</p>
                <div className="flex gap-4">
                  {(['patient', 'doctor'] as const).map((r) => (
                    <label
                      key={r}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border cursor-pointer text-sm font-medium transition-all duration-200 ${role === r
                        ? 'bg-indigo-500 text-white border-indigo-500'
                        : 'bg-gray-100 text-gray-700 border-gray-200 hover:border-indigo-300'
                        }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        checked={role === r}
                        onChange={() => setRole(r)}
                        className="hidden"
                      />
                      <span className="capitalize">{r}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="my-4 border-b text-center">
                <div className="leading-none px-2 inline-block text-sm text-gray-600 tracking-wide font-medium bg-white transform translate-y-1/2">
                  Fill in your details
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-xs space-y-3 mt-6">

                {/* First & Last name */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      placeholder="First name"
                      className={inputSmCls}
                      {...registerField('firstName', { required: 'Required' })}
                    />
                    {errors.firstName && (
                      <p className="mt-1 text-xs text-red-600">{errors.firstName.message}</p>
                    )}
                  </div>
                  <div>
                    <input
                      placeholder="Last name"
                      className={inputSmCls}
                      {...registerField('lastName', { required: 'Required' })}
                    />
                    {errors.lastName && (
                      <p className="mt-1 text-xs text-red-600">{errors.lastName.message}</p>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div>
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="Email"
                    className={inputCls}
                    {...registerField('email', {
                      required: 'Email is required',
                      pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' },
                    })}
                  />
                  {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
                </div>

                {/* Password */}
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Password"
                    className={`${inputCls} pr-12`}
                    {...registerField('password', {
                      required: 'Password is required',
                      validate: (v) => validatePassword(v ?? ''),
                    })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                  </button>
                  {errors.password && (
                    <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
                  )}
                </div>

                {/* Confirm password */}
                <div>
                  <input
                    type="password"
                    autoComplete="new-password"
                    placeholder="Confirm password"
                    className={inputCls}
                    {...registerField('confirmPassword', {
                      required: 'Please confirm password',
                      validate: (v) => v === password || 'Passwords do not match',
                    })}
                  />
                  {errors.confirmPassword && (
                    <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <input
                    type="tel"
                    placeholder="Phone (optional)"
                    className={inputCls}
                    {...registerField('phone')}
                  />
                </div>

                {/* DOB & Gender */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="date"
                      className={inputSmCls}
                      {...registerField('dateOfBirth')}
                    />
                  </div>
                  <div>
                    <select className={inputSmCls} {...registerField('gender')}>
                      <option value="">Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                {/* Address */}
                <div>
                  <input
                    type="text"
                    placeholder="Address (optional)"
                    className={inputCls}
                    {...registerField('address')}
                  />
                </div>

                {/* Doctor-specific fields */}
                {role === 'doctor' && (
                  <>
                    <div>
                      <input
                        placeholder="BMDC Registration Number"
                        className={inputCls}
                        {...registerField('bmdcRegistrationNumber')}
                      />
                    </div>
                    <div>
                      <select className={inputCls} {...registerField('department')}>
                        <option value="">Select department</option>
                        {MEDICAL_DEPARTMENTS.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <input
                        type="number"
                        min={0}
                        placeholder="Years of experience"
                        className={inputCls}
                        {...registerField('experience', { valueAsNumber: true })}
                      />
                    </div>
                  </>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 tracking-wide font-semibold bg-indigo-500 text-gray-100 w-full py-4 rounded-lg hover:bg-indigo-700 transition-all duration-300 ease-in-out flex items-center justify-center focus:shadow-outline focus:outline-none disabled:opacity-50"
                >
                  <svg className="w-6 h-6 -ml-2" fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                    <circle cx="8.5" cy="7" r="4" />
                    <path d="M20 8v6M23 11h-6" />
                  </svg>
                  <span className="ml-3">{loading ? 'Creating account…' : 'Create Account'}</span>
                </button>

                <p className="mt-4 text-xs text-gray-600 text-center">
                  Already have an account?{' '}
                  <Link to="/login" className="border-b border-gray-500 border-dotted font-medium">
                    Sign in
                  </Link>
                </p>
              </form>
            </div>
          </div>
        </div>

        {/* ── Illustration panel ── */}
        <div className="flex-1 bg-indigo-100 text-center hidden lg:flex">
          <div
            className="m-12 xl:m-16 w-full bg-contain bg-center bg-no-repeat"
            style={{
              backgroundImage: `url(${registerPageImage})`,
            }}
          />
        </div>

      </div>
    </div>
  );
}
