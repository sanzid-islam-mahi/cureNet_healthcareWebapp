import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { APP_NAME } from '../utils/constants';
import loginPageImage from '../assets/login_page_image.webp';

interface LoginForm {
  emailOrPhone: string;
  password: string;
  remember?: boolean;
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const redirectUrl = searchParams.get('redirect');
  const from = redirectUrl || (location.state as { from?: { pathname: string } })?.from?.pathname || '/app';

  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      await login(data.emailOrPhone, data.password);
      toast.success('Signed in successfully');
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const responseData = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string; code?: string; data?: { email?: string } } } }).response?.data
        : undefined;
      if (responseData?.code === 'EMAIL_NOT_VERIFIED' && responseData.data?.email) {
        toast.error('Verify your email before signing in');
        navigate(`/verify-email?email=${encodeURIComponent(responseData.data.email)}`, {
          replace: true,
          state: { email: responseData.data.email },
        });
        return;
      }

      const message = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : 'Invalid email/phone or password';
      toast.error(message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 flex justify-center items-center py-8 px-4">
      <div className="max-w-4xl w-full bg-white shadow-lg sm:rounded-lg flex justify-center" style={{ minHeight: '520px' }}>

        {/* ── Form panel ── */}
        <div className="lg:w-1/2 xl:w-5/12 p-6 sm:p-10">
          {/* Logo / App name */}
          <div className="text-center">
            <span className="text-2xl font-extrabold text-indigo-600">{APP_NAME}</span>
          </div>

          <div className="mt-8 flex flex-col items-center">
            <h1 className="text-2xl font-extrabold">Sign In</h1>

            <div className="w-full flex-1 mt-8">
              {/* Divider */}
              <div className="my-6 border-b text-center">
                <div className="leading-none px-2 inline-block text-sm text-gray-600 tracking-wide font-medium bg-white transform translate-y-1/2">
                  Sign in with e-mail or phone
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-xs space-y-4">
                {/* Email / Phone */}
                <div>
                  <input
                    id="emailOrPhone"
                    type="text"
                    autoComplete="username"
                    placeholder="Email or Phone"
                    className="w-full px-8 py-4 rounded-lg font-medium bg-gray-100 border border-gray-200 placeholder-gray-500 text-sm focus:outline-none focus:border-gray-400 focus:bg-white"
                    {...registerField('emailOrPhone', { required: 'Email or phone is required' })}
                  />
                  {errors.emailOrPhone && (
                    <p className="mt-1 text-xs text-red-600">{errors.emailOrPhone.message}</p>
                  )}
                </div>

                {/* Password */}
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Password"
                    className="w-full px-8 py-4 rounded-lg font-medium bg-gray-100 border border-gray-200 placeholder-gray-500 text-sm focus:outline-none focus:border-gray-400 focus:bg-white pr-12"
                    {...registerField('password', {
                      required: 'Password is required',
                      minLength: { value: 6, message: 'At least 6 characters' },
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

                {/* Remember me + Forgot */}
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      {...registerField('remember')}
                    />
                    <span className="text-gray-600">Remember me</span>
                  </label>
                  <Link to="/forgot-password" className="text-indigo-600 hover:text-indigo-500">
                    Forgot password?
                  </Link>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 tracking-wide font-semibold bg-indigo-500 text-gray-100 w-full py-4 rounded-lg hover:bg-indigo-700 transition-all duration-300 ease-in-out flex items-center justify-center focus:shadow-outline focus:outline-none disabled:opacity-50"
                >
                  <svg className="w-6 h-6 -ml-2" fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                    <polyline points="10 17 15 12 10 7" />
                    <line x1="15" y1="12" x2="3" y2="12" />
                  </svg>
                  <span className="ml-3">{loading ? 'Signing in…' : 'Sign In'}</span>
                </button>

                <p className="mt-4 text-xs text-gray-600 text-center">
                  Don't have an account?{' '}
                  <Link to="/register" className="border-b border-gray-500 border-dotted font-medium">
                    Sign up
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
              backgroundImage: `url(${loginPageImage})`,
            }}
          />
        </div>

      </div>
    </div>
  );
}
