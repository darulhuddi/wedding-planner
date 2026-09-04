import React, { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { AuthLayout } from './AuthLayout';
import { Button } from '../ui/Button';
import { AlertCircle, ArrowRight, Lock, Mail } from 'lucide-react';

export interface LoginPageProps {
  onNavigateToSignup: () => void;
  onNavigateHome: () => void;
  onNavigateDashboard: () => void;
  onNavigateAdmin?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onNavigateToSignup,
  onNavigateHome,
  onNavigateDashboard,
  onNavigateAdmin,
}) => {
  const { signIn, checkAdminStatus } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const authData = await signIn(email.trim(), password);
      const isUserAdmin = await checkAdminStatus(authData?.user?.id);
      if (isUserAdmin && onNavigateAdmin) {
        onNavigateAdmin();
      } else {
        onNavigateDashboard();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan saat masuk';
      if (
        message.toLowerCase().includes('invalid login credentials') ||
        message.toLowerCase().includes('invalid credentials')
      ) {
        setErrorMessage('Email atau kata sandi salah. Silakan periksa kembali.');
      } else if (message.toLowerCase().includes('email not confirmed')) {
        setErrorMessage('Email belum dikonfirmasi. Silakan periksa inbox email Anda.');
      } else {
        setErrorMessage(message || 'Gagal masuk. Silakan coba beberapa saat lagi.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <AuthLayout onNavigateHome={onNavigateHome}>
      <div className="bg-white rounded-3xl border border-beige p-6 sm:p-8 shadow-card">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-burgundy-50 border border-burgundy-200 flex items-center justify-center text-burgundy mx-auto mb-3.5">
            <Lock className="w-5 h-5 text-burgundy" />
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-charcoal tracking-tight">
            Masuk ke WedFlow
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-charcoal-400">
            Lanjutkan perencanaan pernikahan bersama pasanganmu
          </p>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div
            role="alert"
            className="mb-5 p-3.5 bg-burgundy-50 border border-burgundy-200 rounded-xl flex items-start gap-2.5 text-xs sm:text-sm text-burgundy-700 animate-fadeIn"
          >
            <AlertCircle className="w-4 h-4 text-burgundy-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="login-email"
              className="block text-xs font-medium text-charcoal-500 mb-1.5"
            >
              Email
            </label>
            <div className="relative">
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                disabled={isSubmitting}
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3.5 py-3 bg-ivory-50 border border-beige rounded-xl text-sm text-charcoal placeholder:text-charcoal-300 focus:outline-none focus:border-burgundy focus:ring-1 focus:ring-burgundy disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              />
              <Mail className="w-4 h-4 text-charcoal-300 absolute left-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="block text-xs font-medium text-charcoal-500 mb-1.5"
            >
              Kata Sandi
            </label>
            <div className="relative">
              <input
                id="login-password"
                type="password"
                required
                autoComplete="current-password"
                disabled={isSubmitting}
                placeholder="Masukkan kata sandi"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3.5 py-3 bg-ivory-50 border border-beige rounded-xl text-sm text-charcoal placeholder:text-charcoal-300 focus:outline-none focus:border-burgundy focus:ring-1 focus:ring-burgundy disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              />
              <Lock className="w-4 h-4 text-charcoal-300 absolute left-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>

          <div className="pt-2">
            <Button
              variant="primary"
              fullWidth
              size="lg"
              type="submit"
              disabled={isSubmitting}
              icon={
                !isSubmitting ? <ArrowRight className="w-4 h-4" /> : undefined
              }
            >
              {isSubmitting ? 'Memproses...' : 'Masuk ke Akun'}
            </Button>
          </div>
        </form>

        {/* Footer Link to Sign Up */}
        <div className="mt-6 pt-5 border-t border-beige/60 text-center">
          <p className="text-xs sm:text-sm text-charcoal-400">
            Belum punya akun?{' '}
            <button
              type="button"
              onClick={onNavigateToSignup}
              className="text-burgundy font-semibold hover:underline focus:outline-none cursor-pointer"
            >
              Daftar akun baru
            </button>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
};
