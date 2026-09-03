import React, { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { Button } from '../ui/Button';
import { Mail, Lock, LogOut, CheckCircle2, AlertCircle, X } from 'lucide-react';

export interface AccountSettingsProps {
  onNavigateLogin: () => void;
}

export const AccountSettings: React.FC<AccountSettingsProps> = ({ onNavigateLogin }) => {
  const { user, signOut, updateEmail, updatePassword } = useAuth();

  // Email modal & state
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [isEmailSaving, setIsEmailSaving] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Password modal & state
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Logout state
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Helper for user-facing auth error mapping
  const mapAuthErrorMessage = (err: unknown): string => {
    const msg = err instanceof Error ? err.message : String(err || '');
    const lower = msg.toLowerCase();
    if (lower.includes('session missing') || lower.includes('not logged in')) {
      return 'Sesi login tidak ditemukan. Silakan masuk kembali.';
    }
    if (lower.includes('already registered') || lower.includes('already been registered')) {
      return 'Email ini sudah terdaftar pada akun lain.';
    }
    if (lower.includes('rate limit') || lower.includes('60 seconds') || lower.includes('too many requests')) {
      return 'Permintaan terlalu sering. Silakan tunggu beberapa saat lagi.';
    }
    return 'Perubahan belum tersimpan. Coba lagi.';
  };

  // Handle Email Update
  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEmailSaving) return;

    if (!user) {
      setEmailStatus({ type: 'error', message: 'Sesi login tidak ditemukan. Silakan masuk kembali.' });
      return;
    }

    if (!newEmail || !newEmail.includes('@')) {
      setEmailStatus({ type: 'error', message: 'Masukkan alamat email yang valid.' });
      return;
    }

    if (newEmail.trim().toLowerCase() === user?.email?.toLowerCase()) {
      setEmailStatus({ type: 'error', message: 'Email baru sama dengan email saat ini.' });
      return;
    }

    setIsEmailSaving(true);
    setEmailStatus(null);

    try {
      await updateEmail(newEmail.trim());

      setEmailStatus({
        type: 'success',
        message: 'Perubahan berhasil disimpan.',
      });
      setTimeout(() => {
        setIsEmailModalOpen(false);
        setNewEmail('');
        setEmailStatus(null);
      }, 2500);
    } catch (err: unknown) {
      console.error('[WedFlow] Failed to update email:', err);
      setEmailStatus({
        type: 'error',
        message: mapAuthErrorMessage(err),
      });
    } finally {
      setIsEmailSaving(false);
    }
  };

  // Handle Password Update
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPasswordSaving) return;

    if (!user) {
      setPasswordStatus({ type: 'error', message: 'Sesi login tidak ditemukan. Silakan masuk kembali.' });
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setPasswordStatus({ type: 'error', message: 'Password minimal 6 karakter.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: 'error', message: 'Konfirmasi password tidak cocok.' });
      return;
    }

    setIsPasswordSaving(true);
    setPasswordStatus(null);

    try {
      await updatePassword(newPassword);

      setPasswordStatus({
        type: 'success',
        message: 'Perubahan berhasil disimpan.',
      });
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setNewPassword('');
        setConfirmPassword('');
        setPasswordStatus(null);
      }, 2000);
    } catch (err: unknown) {
      console.error('[WedFlow] Failed to update password:', err);
      setPasswordStatus({
        type: 'error',
        message: mapAuthErrorMessage(err),
      });
    } finally {
      setIsPasswordSaving(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await signOut();
      onNavigateLogin();
    } catch (err) {
      console.error('[WedFlow] Failed to sign out:', err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <section className="bg-white rounded-2xl border border-beige p-5 sm:p-6 shadow-soft space-y-6">
      <div className="border-b border-beige pb-4">
        <h2 className="font-serif text-lg sm:text-xl font-bold text-charcoal">Akun</h2>
        <p className="text-xs sm:text-sm text-charcoal-400 mt-0.5">
          Kelola kredensial akun dan akses login Anda
        </p>
      </div>

      <div className="space-y-4">
        {/* Email Display & Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-ivory-50 border border-beige">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-burgundy-50 border border-burgundy-100 flex items-center justify-center text-burgundy shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-semibold text-charcoal-400 block uppercase tracking-wider">
                Email
              </span>
              <span className="text-sm font-medium text-charcoal block truncate">
                {user?.email || 'Tidak ada email terdaftar'}
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => {
              setNewEmail('');
              setEmailStatus(null);
              setIsEmailModalOpen(true);
            }}
          >
            Ubah Email
          </Button>
        </div>

        {/* Password Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-ivory-50 border border-beige">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold-50 border border-gold-200 flex items-center justify-center text-gold-600 shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-charcoal-400 block uppercase tracking-wider">
                Password
              </span>
              <span className="text-sm font-medium text-charcoal block">••••••••••••</span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => {
              setNewPassword('');
              setConfirmPassword('');
              setPasswordStatus(null);
              setIsPasswordModalOpen(true);
            }}
          >
            Ubah Password
          </Button>
        </div>

        {/* Logout Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-rose-50/50 border border-rose-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100/70 border border-rose-200 flex items-center justify-center text-rose-700 shrink-0">
              <LogOut className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-bold text-rose-900 block">Keluar dari Akun</span>
              <span className="text-xs text-rose-600 block">Akhiri sesi di perangkat ini</span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 border-rose-300 text-rose-700 hover:bg-rose-100 hover:text-rose-800"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? 'Menyimpan...' : 'Keluar'}
          </Button>
        </div>
      </div>

      {/* Modal Ubah Email */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/50 backdrop-blur-xs">
          <div
            className="bg-white rounded-2xl border border-beige shadow-modal max-w-md w-full p-6 space-y-4 animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ubah-email-title"
          >
            <div className="flex items-center justify-between border-b border-beige pb-3">
              <h3 id="ubah-email-title" className="font-serif text-lg font-bold text-charcoal">
                Ubah Email
              </h3>
              <button
                type="button"
                onClick={() => setIsEmailModalOpen(false)}
                className="text-charcoal-400 hover:text-charcoal p-1 rounded-lg cursor-pointer"
                aria-label="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {emailStatus && (
              <div
                className={`p-3 rounded-xl flex items-start gap-2.5 text-xs sm:text-sm ${
                  emailStatus.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {emailStatus.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                )}
                <span>{emailStatus.message}</span>
              </div>
            )}

            <form onSubmit={handleUpdateEmail} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-charcoal uppercase tracking-wider mb-1.5">
                  Email Baru
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="nama@email.com"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-beige-300 text-sm focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEmailModalOpen(false)}
                  disabled={isEmailSaving}
                >
                  Batal
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={isEmailSaving}>
                  {isEmailSaving ? 'Menyimpan...' : 'Simpan Email'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ubah Password */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/50 backdrop-blur-xs">
          <div
            className="bg-white rounded-2xl border border-beige shadow-modal max-w-md w-full p-6 space-y-4 animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ubah-password-title"
          >
            <div className="flex items-center justify-between border-b border-beige pb-3">
              <h3 id="ubah-password-title" className="font-serif text-lg font-bold text-charcoal">
                Ubah Password
              </h3>
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(false)}
                className="text-charcoal-400 hover:text-charcoal p-1 rounded-lg cursor-pointer"
                aria-label="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {passwordStatus && (
              <div
                className={`p-3 rounded-xl flex items-start gap-2.5 text-xs sm:text-sm ${
                  passwordStatus.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {passwordStatus.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                )}
                <span>{passwordStatus.message}</span>
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-charcoal uppercase tracking-wider mb-1.5">
                  Password baru
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  required
                  minLength={6}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-beige-300 text-sm focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal uppercase tracking-wider mb-1.5">
                  Konfirmasi password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi password baru"
                  required
                  minLength={6}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-beige-300 text-sm focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsPasswordModalOpen(false)}
                  disabled={isPasswordSaving}
                >
                  Batal
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={isPasswordSaving}>
                  {isPasswordSaving ? 'Menyimpan...' : 'Simpan Password'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
