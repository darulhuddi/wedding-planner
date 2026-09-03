import React, { useState } from 'react';
import { X, Plus, Calendar, Tag, AlertCircle, Clock, FileText } from 'lucide-react';
import { TaskItem, TaskCategoryId, TaskPriority } from '../../types/checklist';
import { ALL_TASK_CATEGORY_IDS, CATEGORY_LABELS } from '../../domain/categories';
import { generateTaskId } from '../../utils/checklistUtils';

export interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (newTask: TaskItem) => void;
  initialCategory?: TaskCategoryId;
}

export const AddTaskModal: React.FC<AddTaskModalProps> = ({
  isOpen,
  onClose,
  onAddTask,
  initialCategory = 'general',
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TaskCategoryId>(initialCategory);
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    const nowIso = new Date().toISOString();
    const newTask: TaskItem = {
      id: generateTaskId(),
      title: trimmedTitle,
      description: description.trim() || null,
      category,
      status: 'todo',
      priority,
      dueDate: dueDate || null,
      estimatedMinutes: estimatedMinutes ? parseInt(estimatedMinutes, 10) : null,
      source: 'custom',
      templateId: null,
      eventIds: [],
      createdAt: nowIso,
      updatedAt: nowIso,
      completedAt: null,
    };

    onAddTask(newTask);

    // Reset form and close
    setTitle('');
    setDescription('');
    setCategory('general');
    setPriority('medium');
    setDueDate('');
    setEstimatedMinutes('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-charcoal/40 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-lg rounded-2xl sm:rounded-3xl bg-white shadow-2xl border border-beige-300 overflow-hidden transform transition-all">
          
          {/* Modal Header */}
          <div className="p-5 border-b border-beige flex items-center justify-between bg-ivory-50/70">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-gold-600 block">
                Tambah Tugas Baru
              </span>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal">
                Buat Tugas Kustom
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-charcoal-400 hover:text-charcoal hover:bg-beige-200/60 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body Form */}
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
            
            {/* Title */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-400 mb-1">
                Judul Tugas <span className="text-burgundy">*</span>
              </label>
              <input
                autoFocus
                type="text"
                required
                placeholder="Contoh: Transfer DP Catering Utama..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-beige-300 bg-white
                  text-charcoal placeholder:text-charcoal-300 focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy"
              />
            </div>

            {/* Category & Priority Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-400 mb-1 flex items-center gap-1">
                  <Tag className="w-3 h-3 text-burgundy" /> Kategori
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as TaskCategoryId)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-beige-300 bg-white
                    focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy"
                >
                  {ALL_TASK_CATEGORY_IDS.map((catId) => (
                    <option key={catId} value={catId}>
                      {CATEGORY_LABELS[catId]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-400 mb-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-gold-600" /> Prioritas
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-beige-300 bg-white
                    focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy"
                >
                  <option value="high">Prioritas Tinggi</option>
                  <option value="medium">Prioritas Sedang</option>
                  <option value="low">Prioritas Rendah</option>
                </select>
              </div>
            </div>

            {/* Due Date & Estimated Minutes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-400 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-burgundy" /> Deadline Opsional
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-beige-300 bg-white
                    focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-400 mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-gold-600" /> Perkiraan Waktu (Menit)
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="Contoh: 30"
                  value={estimatedMinutes}
                  onChange={(e) => setEstimatedMinutes(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-beige-300 bg-white
                    focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-400 mb-1 flex items-center gap-1">
                <FileText className="w-3 h-3 text-burgundy" /> Catatan / Rincian Opsional
              </label>
              <textarea
                rows={3}
                placeholder="Tambahkan catatan khusus, nomor kontak vendor, atau rincian tugas..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-beige-300 bg-white
                  focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy"
              />
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-beige flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-sm font-semibold text-charcoal-400 hover:text-charcoal transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={!title.trim()}
                className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold rounded-xl
                  bg-burgundy text-white disabled:opacity-40 hover:bg-burgundy-700 transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Simpan Tugas</span>
              </button>
            </div>

          </form>

        </div>
      </div>
    </div>
  );
};
