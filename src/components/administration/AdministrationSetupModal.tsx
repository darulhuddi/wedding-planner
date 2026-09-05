import React, { useState } from 'react';
import {
  StoredAdministrationContext,
  GroomMaritalStatus,
  BrideMaritalStatus,
  CitizenshipType,
  ServiceStatus,
} from '../../domain/administration/types';
import { X, UserCheck, Heart, Shield } from 'lucide-react';

interface AdministrationSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialContext?: StoredAdministrationContext | null;
  onSave: (context: StoredAdministrationContext) => void;
}

export const AdministrationSetupModal: React.FC<AdministrationSetupModalProps> = ({
  isOpen,
  onClose,
  initialContext,
  onSave,
}) => {
  const [groomBirthDate, setGroomBirthDate] = useState<string>(
    initialContext?.groom.birthDate || '1998-01-01'
  );
  const [brideBirthDate, setBrideBirthDate] = useState<string>(
    initialContext?.bride.birthDate || '2000-01-01'
  );

  const [groomMarital, setGroomMarital] = useState<GroomMaritalStatus>(
    (initialContext?.groom.maritalStatus as GroomMaritalStatus) || 'single'
  );
  const [brideMarital, setBrideMarital] = useState<BrideMaritalStatus>(
    (initialContext?.bride.maritalStatus as BrideMaritalStatus) || 'single'
  );

  const [groomSameKua, setGroomSameKua] = useState<boolean>(
    initialContext?.groom.isSameKuaDistrictAsCeremony ?? true
  );
  const [brideSameKua, setBrideSameKua] = useState<boolean>(
    initialContext?.bride.isSameKuaDistrictAsCeremony ?? true
  );

  const [groomTni, setGroomTni] = useState<boolean>(
    initialContext?.groom.serviceStatus === 'tni_polri'
  );
  const [brideTni, setBrideTni] = useState<boolean>(
    initialContext?.bride.serviceStatus === 'tni_polri'
  );

  const [groomWna, setGroomWna] = useState<boolean>(
    initialContext?.groom.citizenship === 'wna'
  );
  const [brideWna, setBrideWna] = useState<boolean>(
    initialContext?.bride.citizenship === 'wna'
  );

  const [hasSpecialWali, setHasSpecialWali] = useState<boolean>(
    initialContext?.hasSpecialWaliCase ?? false
  );

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedContext: StoredAdministrationContext = {
      groom: {
        birthDate: groomBirthDate || null,
        maritalStatus: groomMarital,
        citizenship: groomWna ? ('wna' as CitizenshipType) : ('wni' as CitizenshipType),
        serviceStatus: groomTni ? ('tni_polri' as ServiceStatus) : ('civilian' as ServiceStatus),
        isSameKuaDistrictAsCeremony: groomSameKua,
      },
      bride: {
        birthDate: brideBirthDate || null,
        maritalStatus: brideMarital,
        citizenship: brideWna ? ('wna' as CitizenshipType) : ('wni' as CitizenshipType),
        serviceStatus: brideTni ? ('tni_polri' as ServiceStatus) : ('civilian' as ServiceStatus),
        isSameKuaDistrictAsCeremony: brideSameKua,
      },
      hasSpecialWaliCase: hasSpecialWali,
      isSetupCompleted: true,
      updatedAt: new Date().toISOString(),
    };
    onSave(updatedContext);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal-900/60 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-modal border border-beige-200 w-full max-w-xl max-h-[90vh] flex flex-col my-auto overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-beige-200 flex items-center justify-between bg-ivory-50">
          <div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal">
              Setup Profil Administrasi Pernikahan
            </h2>
            <p className="text-xs text-charcoal-500 mt-1">
              Sesuaikan panduan dokumen KUA berdasarkan domisili dan kondisi pasangan.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-charcoal-400 hover:text-charcoal p-2 rounded-xl hover:bg-ivory-200 transition-colors"
            aria-label="Tutup modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Section 1: Yurisdiksi Domisili KTP */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-charcoal uppercase tracking-wider">
              1. Domisili KTP vs Lokasi Akad Nikah
            </label>
            <p className="text-xs text-charcoal-500">
              Apakah alamat KTP kamu dan pasangan berada di kecamatan yang sama dengan tempat akad?
            </p>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3.5 rounded-2xl border border-beige-200 hover:border-burgundy-200 cursor-pointer transition-colors bg-white hover:bg-ivory-50">
                <input
                  type="checkbox"
                  checked={!groomSameKua}
                  onChange={(e) => setGroomSameKua(!e.target.checked)}
                  className="rounded text-burgundy focus:ring-burgundy w-4 h-4"
                />
                <div className="text-xs sm:text-sm">
                  <span className="font-semibold text-charcoal">Calon Suami di luar kecamatan tempat akad</span>
                  <p className="text-xs text-charcoal-400 mt-0.5">Akan memunculkan panduan Surat Rekomendasi Nikah KUA Asal.</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3.5 rounded-2xl border border-beige-200 hover:border-burgundy-200 cursor-pointer transition-colors bg-white hover:bg-ivory-50">
                <input
                  type="checkbox"
                  checked={!brideSameKua}
                  onChange={(e) => setBrideSameKua(!e.target.checked)}
                  className="rounded text-burgundy focus:ring-burgundy w-4 h-4"
                />
                <div className="text-xs sm:text-sm">
                  <span className="font-semibold text-charcoal">Calon Istri di luar kecamatan tempat akad</span>
                  <p className="text-xs text-charcoal-400 mt-0.5">Akan memunculkan panduan Surat Rekomendasi Nikah KUA Asal.</p>
                </div>
              </label>
            </div>
          </div>

          {/* Section 2: Status Perkawinan Sebelumnya */}
          <div className="space-y-3 pt-4 border-t border-beige-200">
            <label className="block text-xs font-bold text-charcoal uppercase tracking-wider">
              2. Status Perkawinan Sebelumnya
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-charcoal-500 mb-1.5">Status Calon Suami</label>
                <select
                  value={groomMarital}
                  onChange={(e) => setGroomMarital(e.target.value as GroomMaritalStatus)}
                  className="w-full text-xs sm:text-sm rounded-xl border border-beige-300 p-3 bg-white text-charcoal focus:ring-2 focus:ring-burgundy/20 cursor-pointer"
                >
                  <option value="single">Belum Pernah Menikah (Lajang)</option>
                  <option value="divorced_alive">Duda Cerai Hidup (Akta Cerai)</option>
                  <option value="widowed">Duda Cerai Mati (Akta Kematian)</option>
                  <option value="polygamy_married">Masih Menikah (Izin Poligami)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-charcoal-500 mb-1.5">Status Calon Istri</label>
                <select
                  value={brideMarital}
                  onChange={(e) => setBrideMarital(e.target.value as BrideMaritalStatus)}
                  className="w-full text-xs sm:text-sm rounded-xl border border-beige-300 p-3 bg-white text-charcoal focus:ring-2 focus:ring-burgundy/20 cursor-pointer"
                >
                  <option value="single">Belum Pernah Menikah (Lajang)</option>
                  <option value="divorced_alive">Janda Cerai Hidup (Akta Cerai)</option>
                  <option value="widowed">Janda Cerai Mati (Akta Kematian)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Tanggal Lahir (Derivasi Usia Hukum) */}
          <div className="space-y-3 pt-4 border-t border-beige-200">
            <label className="block text-xs font-bold text-charcoal uppercase tracking-wider">
              3. Tanggal Lahir Calon Pengantin
            </label>
            <p className="text-xs text-charcoal-500">
              Digunakan murni untuk menghitung kategori izin orang tua (&lt;21 thn) atau dispensasi pengadilan (&lt;19 thn).
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-charcoal-500 mb-1.5">Tgl Lahir Calon Suami</label>
                <input
                  type="date"
                  value={groomBirthDate}
                  onChange={(e) => setGroomBirthDate(e.target.value)}
                  className="w-full text-xs sm:text-sm rounded-xl border border-beige-300 p-3 bg-white text-charcoal focus:ring-2 focus:ring-burgundy/20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-charcoal-500 mb-1.5">Tgl Lahir Calon Istri</label>
                <input
                  type="date"
                  value={brideBirthDate}
                  onChange={(e) => setBrideBirthDate(e.target.value)}
                  className="w-full text-xs sm:text-sm rounded-xl border border-beige-300 p-3 bg-white text-charcoal focus:ring-2 focus:ring-burgundy/20"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Kondisi Khusus Lainnya */}
          <div className="space-y-3 pt-4 border-t border-beige-200">
            <label className="block text-xs font-bold text-charcoal uppercase tracking-wider">
              4. Kondisi Khusus Kedinasan & Wali (Opsional)
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3.5 rounded-2xl border border-beige-200 hover:border-burgundy-200 cursor-pointer transition-colors bg-white hover:bg-ivory-50">
                <input
                  type="checkbox"
                  checked={groomTni || brideTni}
                  onChange={(e) => {
                    setGroomTni(e.target.checked);
                    setBrideTni(false);
                  }}
                  className="rounded text-burgundy focus:ring-burgundy w-4 h-4"
                />
                <span className="text-xs sm:text-sm font-semibold text-charcoal">
                  Anggota aktif TNI atau POLRI (Wajib izin komandan)
                </span>
              </label>

              <label className="flex items-center gap-3 p-3.5 rounded-2xl border border-beige-200 hover:border-burgundy-200 cursor-pointer transition-colors bg-white hover:bg-ivory-50">
                <input
                  type="checkbox"
                  checked={groomWna || brideWna}
                  onChange={(e) => {
                    setGroomWna(e.target.checked);
                    setBrideWna(false);
                  }}
                  className="rounded text-burgundy focus:ring-burgundy w-4 h-4"
                />
                <span className="text-xs sm:text-sm font-semibold text-charcoal">
                  Warga Negara Asing / WNA (Izin kedutaan & paspor)
                </span>
              </label>

              <label className="flex items-center gap-3 p-3.5 rounded-2xl border border-beige-200 hover:border-burgundy-200 cursor-pointer transition-colors bg-white hover:bg-ivory-50">
                <input
                  type="checkbox"
                  checked={hasSpecialWali}
                  onChange={(e) => setHasSpecialWali(e.target.checked)}
                  className="rounded text-burgundy focus:ring-burgundy w-4 h-4"
                />
                <span className="text-xs sm:text-sm font-semibold text-charcoal">
                  Memerlukan Wali Hakim (Ayah wafat & tanpa wali nasab)
                </span>
              </label>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-4 border-t border-beige-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs sm:text-sm font-semibold text-charcoal-500 hover:text-charcoal hover:bg-ivory-200 rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 text-xs sm:text-sm font-semibold text-white bg-burgundy hover:bg-burgundy-700 active:scale-98 rounded-xl shadow-sm transition-all cursor-pointer"
            >
              Simpan & Terapkan Panduan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
