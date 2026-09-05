import React, { useState } from 'react';
import { X, Sparkles, Heart, ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from './Button';

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signup' | 'login';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'signup'
}) => {
  const [mode, setMode] = useState<'signup' | 'login'>(initialMode);
  const [partner1, setPartner1] = useState('');
  const [partner2, setPartner2] = useState('');
  const [weddingDate, setWeddingDate] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  React.useEffect(() => {
    setMode(initialMode);
    setIsSubmitted(false);
  }, [initialMode, isOpen]);

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-charcoal-900/60 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-ivory rounded-t-3xl sm:rounded-3xl border-t sm:border border-beige shadow-modal p-5 sm:p-8 max-h-[92dvh] overflow-y-auto pb-safe"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Grabber */}
        <div className="sm:hidden flex justify-center pb-2">
          <div className="w-10 h-1 rounded-full bg-charcoal-200" />
        </div>

        {/* Close Button with >=44px touch area */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 w-11 h-11 rounded-full bg-ivory-200 text-charcoal-400 hover:text-charcoal flex items-center justify-center transition-colors min-h-touch min-w-touch"
          aria-label="Tutup dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {isSubmitted ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full bg-burgundy-50 border border-burgundy-200 flex items-center justify-center text-burgundy mx-auto mb-4">
              <Heart className="w-7 h-7 fill-burgundy" />
            </div>
            <h3 className="font-serif text-2xl sm:text-3xl text-charcoal font-semibold mb-2">
              Selamat datang di WedSiap!
            </h3>
            <p className="text-sm text-charcoal-400 max-w-sm mx-auto mb-6">
              Workspace persiapan pernikahan untuk {partner1 || 'Kamu'} & {partner2 || 'Pasangan'} siap dibuat.
            </p>
            <div className="bg-white rounded-2xl p-4 border border-beige mb-6 text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-charcoal-400">Pasangan:</span>
                <span className="font-medium text-charcoal">{partner1 || 'Adit'} & {partner2 || 'Nisa'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-charcoal-400">Target Tanggal:</span>
                <span className="font-medium text-charcoal">{weddingDate || '14 Februari 2027'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-charcoal-400">Status:</span>
                <span className="text-emerald-700 font-medium">✨ Demo Workspace Aktif</span>
              </div>
            </div>
            <Button
              variant="primary"
              fullWidth
              size="lg"
              onClick={onClose}
            >
              Lanjutkan Eksplorasi Homepage
            </Button>
          </div>
        ) : (
          <div>
            {/* Header */}
            <div className="text-center mb-5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold-50 border border-gold-200/60 text-gold-600 text-xs font-medium mb-2.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Mulai Dalam 1 Menit</span>
              </div>
              <h3 className="font-serif text-2xl sm:text-3xl text-charcoal font-semibold">
                {mode === 'signup' ? 'Buat Rencana Pernikahan' : 'Masuk ke WedSiap'}
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-charcoal-400">
                {mode === 'signup'
                  ? 'Tanpa kartu kredit. Siap pakai langsung bersama pasangan.'
                  : 'Akses kembali checklist, budget, dan timeline pernikahanmu.'}
              </p>
            </div>

            {/* Mode Switcher with touch targets */}
            <div className="flex bg-ivory-200 p-1 rounded-xl border border-beige-300 mb-5">
              <button
                type="button"
                onClick={() => setMode('signup')}
                className={`flex-1 py-2.5 text-xs sm:text-sm font-medium rounded-lg transition-all min-h-touch ${
                  mode === 'signup'
                    ? 'bg-white text-burgundy shadow-sm font-semibold'
                    : 'text-charcoal-400 hover:text-charcoal'
                }`}
              >
                Daftar Akun Baru
              </button>
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`flex-1 py-2.5 text-xs sm:text-sm font-medium rounded-lg transition-all min-h-touch ${
                  mode === 'login'
                    ? 'bg-white text-burgundy shadow-sm font-semibold'
                    : 'text-charcoal-400 hover:text-charcoal'
                }`}
              >
                Sudah Ada Akun
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {mode === 'signup' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-charcoal-500 mb-1">
                        Nama Kamu
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Misal: Adit"
                        value={partner1}
                        onChange={(e) => setPartner1(e.target.value)}
                        className="w-full px-3.5 py-3 bg-white border border-beige rounded-xl text-sm text-charcoal placeholder:text-charcoal-300 focus:outline-none focus:border-burgundy focus:ring-1 focus:ring-burgundy min-h-touch"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-charcoal-500 mb-1">
                        Nama Pasangan
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Misal: Nisa"
                        value={partner2}
                        onChange={(e) => setPartner2(e.target.value)}
                        className="w-full px-3.5 py-3 bg-white border border-beige rounded-xl text-sm text-charcoal placeholder:text-charcoal-300 focus:outline-none focus:border-burgundy focus:ring-1 focus:ring-burgundy min-h-touch"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-charcoal-500 mb-1">
                      Estimasi Tanggal Pernikahan
                    </label>
                    <input
                      type="date"
                      value={weddingDate}
                      onChange={(e) => setWeddingDate(e.target.value)}
                      className="w-full px-3.5 py-3 bg-white border border-beige rounded-xl text-sm text-charcoal focus:outline-none focus:border-burgundy focus:ring-1 focus:ring-burgundy min-h-touch"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-medium text-charcoal-500 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="kamu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-3 bg-white border border-beige rounded-xl text-sm text-charcoal placeholder:text-charcoal-300 focus:outline-none focus:border-burgundy focus:ring-1 focus:ring-burgundy min-h-touch"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-charcoal-500 mb-1">
                  Kata Sandi
                </label>
                <input
                  type="password"
                  required
                  placeholder="Minimal 8 karakter"
                  className="w-full px-3.5 py-3 bg-white border border-beige rounded-xl text-sm text-charcoal placeholder:text-charcoal-300 focus:outline-none focus:border-burgundy focus:ring-1 focus:ring-burgundy min-h-touch"
                />
              </div>

              <div className="pt-2">
                <Button
                  variant="primary"
                  fullWidth
                  size="lg"
                  type="submit"
                  icon={<ArrowRight className="w-4 h-4" />}
                >
                  {mode === 'signup' ? 'Mulai Buat Wedding Plan' : 'Masuk ke Akun'}
                </Button>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-xs text-charcoal-400 pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-gold-500 shrink-0" />
                <span>Data tersimpan aman & dapat diakses berdua</span>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
