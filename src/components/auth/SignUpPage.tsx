import React, { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { AuthLayout } from './AuthLayout';
import { Button } from '../ui/Button';
import { AlertCircle, ArrowRight, Lock, Mail, Sparkles, ShieldCheck } from 'lucide-react';

export interface SignUpPageProps {
  onNavigateToLogin: () => void;
  onNavigateHome: () => void;
  onNavigateOnboarding: () => void;
}

export const SignUpPage: React.FC<SignUpPageProps> = ({
  onNavigateToLogin,
  onNavigateHome,
  onNavigateOnboarding,
}) => {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMessage(null);

    // Client-side password confirmation validation
    if (password !== confirmPassword) {
      setErrorMessage('Kata sandi dan konfirmasi kata sandi tidak cocok.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Kata sandi minimal 6 karakter.');
      return;
    }

    setIsSubmitting(true);

    try {
      await signUp(email.trim(), password);
      onNavigateOnboarding();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan saat pendaftaran';
      if (message.toLowerCase().includes('user already registered')) {
        setErrorMessage('Email sudah terdaftar. Silakan masuk ke akun Anda.');
      } else if (
        message.toLowerCase().includes('password should be at least') ||
        message.toLowerCase().includes('weak password')
      ) {
        setErrorMessage('Kata sandi minimal 6 karakter.');
      } else {
        setErrorMessage(message || 'Gagal mendaftar. Silakan coba beberapa saat lagi.');
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
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold-50 border border-gold-200/60 text-gold-600 text-xs font-medium mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Mulai Dalam 1 Menit</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-charcoal tracking-tight">
            Buat Akun WedFlow
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-charcoal-400">
            Mulai persiapkan hari bahagia dengan tenang dan terstruktur
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

        {/* Sign Up Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="signup-email"
              className="block text-xs font-medium text-charcoal-500 mb-1.5"
            >
              Email
            </label>
            <div className="relative">
              <input
                id="signup-email"
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
              htmlFor="signup-password"
              className="block text-xs font-medium text-charcoal-500 mb-1.5"
            >
              Kata Sandi
            </label>
            <div className="relative">
              <input
                id="signup-password"
                type="password"
                required
                autoComplete="new-password"
                disabled={isSubmitting}
                placeholder="Minimal 6 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3.5 py-3 bg-ivory-50 border border-beige rounded-xl text-sm text-charcoal placeholder:text-charcoal-300 focus:outline-none focus:border-burgundy focus:ring-1 focus:ring-burgundy disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              />
              <Lock className="w-4 h-4 text-charcoal-300 absolute left-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>

          <div>
            <label
              htmlFor="signup-confirm-password"
              className="block text-xs font-medium text-charcoal-500 mb-1.5"
            >
              Konfirmasi Kata Sandi
            </label>
            <div className="relative">
              <input
                id="signup-confirm-password"
                type="password"
                required
                autoComplete="new-password"
                disabled={isSubmitting}
                placeholder="Ketik ulang kata sandi"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
              {isSubmitting ? 'Memproses...' : 'Buat Akun & Mulai'}
            </Button>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-xs text-charcoal-400 pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-gold-500 shrink-0" />
            <span>Data tersimpan aman & dapat diakses berdua</span>
          </div>
        </form>

        {/* Footer Link to Login */}
        <div className="mt-6 pt-5 border-t border-beige/60 text-center">
          <p className="text-xs sm:text-sm text-charcoal-400">
            Sudah punya akun?{' '}
            <button
              type="button"
              onClick={onNavigateToLogin}
              className="text-burgundy font-semibold hover:underline focus:outline-none cursor-pointer"
            >
              Masuk ke akun
            </button>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
};
