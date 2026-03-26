import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { APP_NAME } from '../utils/constants';
import loginPageImage from '../assets/login_page_image.png';

interface VerifyEmailForm {
  code: string;
}

export default function VerifyEmail() {
  const { verifyEmail, resendVerificationCode, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(
    ((location.state as { verificationExpiresAt?: string | null } | null)?.verificationExpiresAt) ?? null
  );

  const email = useMemo(() => {
    return searchParams.get('email') || ((location.state as { email?: string } | null)?.email ?? '');
  }, [location.state, searchParams]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VerifyEmailForm>();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/app', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const onSubmit = async ({ code }: VerifyEmailForm) => {
    if (!email) {
      toast.error('Missing email address for verification');
      return;
    }

    setLoading(true);
    try {
      await verifyEmail(email, code);
      toast.success('Email verified successfully');
      navigate('/app', { replace: true });
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : 'Verification failed';
      toast.error(message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      toast.error('Missing email address for verification');
      return;
    }

    setResending(true);
    try {
      const result = await resendVerificationCode(email);
      setExpiresAt(result.verificationExpiresAt ?? null);
      toast.success('Verification code sent');
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : 'Could not resend verification code';
      toast.error(message || 'Could not resend verification code');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 flex justify-center items-center py-8 px-4">
      <div className="max-w-4xl w-full bg-white shadow-lg sm:rounded-lg flex justify-center" style={{ minHeight: '520px' }}>
        <div className="lg:w-1/2 xl:w-5/12 p-6 sm:p-10">
          <div className="text-center">
            <span className="text-2xl font-extrabold text-indigo-600">{APP_NAME}</span>
          </div>

          <div className="mt-8 flex flex-col items-center">
            <h1 className="text-2xl font-extrabold">Verify Email</h1>
            <div className="mt-4 w-full rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-4 text-sm text-indigo-900">
              <p className="font-semibold">Enter the 6-digit code sent to:</p>
              <p className="mt-1 break-all">{email || 'Missing email address'}</p>
              {expiresAt && <p className="mt-2 text-xs text-indigo-700">Code expires at {new Date(expiresAt).toLocaleString()}</p>}
            </div>

            <div className="w-full flex-1 mt-8">
              <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-xs space-y-4">
                <div>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="6-digit code"
                    className="w-full px-8 py-4 rounded-lg font-medium bg-gray-100 border border-gray-200 placeholder-gray-500 text-sm focus:outline-none focus:border-gray-400 focus:bg-white tracking-[0.35em]"
                    {...register('code', {
                      required: 'Verification code is required',
                      pattern: { value: /^\d{6}$/, message: 'Enter the 6-digit code' },
                    })}
                  />
                  {errors.code && <p className="mt-1 text-xs text-red-600">{errors.code.message}</p>}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="tracking-wide font-semibold bg-indigo-500 text-gray-100 w-full py-4 rounded-lg hover:bg-indigo-700 transition-all duration-300 ease-in-out disabled:opacity-50"
                >
                  {loading ? 'Verifying…' : 'Verify email'}
                </button>

                <button
                  type="button"
                  disabled={resending}
                  onClick={handleResend}
                  className="tracking-wide font-semibold bg-white text-indigo-700 border border-indigo-200 w-full py-4 rounded-lg hover:bg-indigo-50 transition-all duration-300 ease-in-out disabled:opacity-50"
                >
                  {resending ? 'Sending…' : 'Resend code'}
                </button>

                <p className="text-xs text-center text-gray-600">
                  Want to use another email?{' '}
                  <Link to="/register" className="border-b border-gray-500 border-dotted font-medium">
                    Create a new account
                  </Link>
                </p>
                <p className="text-xs text-center text-gray-600">
                  Already verified?{' '}
                  <Link to="/login" className="border-b border-gray-500 border-dotted font-medium">
                    Sign in
                  </Link>
                </p>
              </form>
            </div>
          </div>
        </div>

        <div className="flex-1 bg-indigo-100 text-center hidden lg:flex">
          <div
            className="m-12 xl:m-16 w-full bg-contain bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${loginPageImage})` }}
          />
        </div>
      </div>
    </div>
  );
}
