import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  Trash2,
  Edit3,
  Calendar,
  Clock,
  Tag,
  AlertCircle,
  CheckCircle2,
  FileText,
  Save,
} from 'lucide-react';
import { TaskItem, TaskCategoryId, TaskPriority } from '../../types/checklist';
import { ALL_TASK_CATEGORY_IDS, CATEGORY_LABELS } from '../../domain/categories';
import { TASK_PRIORITY_LABELS, formatDueDateLabel, getTodayStr } from '../../utils/checklistUtils';

export interface TaskDetailDrawerProps {
  task: TaskItem | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleComplete: (id: string) => void;
  onUpdateTask: (updatedTask: TaskItem) => void;
  onDeleteTask: (id: string) => void;
}

export const TaskDetailDrawer: React.FC<TaskDetailDrawerProps> = ({
  task,
  isOpen,
  onClose,
  onToggleComplete,
  onUpdateTask,
  onDeleteTask,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState<TaskCategoryId>('general');
  const [editPriority, setEditPriority] = useState<TaskPriority>('medium');
  const [editDueDate, setEditDueDate] = useState('');
  const [editEstimatedMinutes, setEditEstimatedMinutes] = useState('');

  // Reset form when task changes or drawer opens
  useEffect(() => {
    if (task) {
      setEditTitle(task.title || '');
      setEditDescription(task.description || '');
      setEditCategory(task.category || 'general');
      setEditPriority(task.priority || 'medium');
      setEditDueDate(task.dueDate || '');
      setEditEstimatedMinutes(task.estimatedMinutes ? String(task.estimatedMinutes) : '');
      setIsEditing(false);
    }
  }, [task, isOpen]);

  if (!isOpen || !task) return null;

  const isCompleted = task.status === 'completed';
  const today = getTodayStr();
  const isOverdue = !isCompleted && task.dueDate !== null && task.dueDate < today;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim()) return;

    const updated: TaskItem = {
      ...task,
      title: editTitle.trim(),
      description: editDescription.trim() || null,
      category: editCategory,
      priority: editPriority,
      dueDate: editDueDate || null,
      estimatedMinutes: editEstimatedMinutes ? parseInt(editEstimatedMinutes, 10) : null,
      updatedAt: new Date().toISOString(),
    };

    onUpdateTask(updated);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (window.confirm(`Hapus tugas "${task.title}"?`)) {
      onDeleteTask(task.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-charcoal/40 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container (Desktop slide-over right / Mobile bottom sheet) */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 md:pl-0 w-full md:w-auto">
        <div
          className={`w-full md:w-[420px] bg-white shadow-2xl flex flex-col justify-between
            transform transition-transform duration-300 ease-in-out
            fixed md:relative bottom-0 left-0 right-0 md:inset-auto
            rounded-t-3xl md:rounded-none max-h-[90vh] md:max-h-full overflow-hidden`}
        >
          {/* Header */}
          <div className="p-5 border-b border-beige flex items-center justify-between bg-ivory-50/60 shrink-0">
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full border
                  ${
                    isCompleted
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : isOverdue
                      ? 'bg-rose-50 text-rose-600 border-rose-200 font-semibold'
                      : 'bg-burgundy-50 text-burgundy border-burgundy-100'
                  }`}
              >
                {isCompleted ? 'Selesai' : isOverdue ? 'Terlambat' : 'Aktif'}
              </span>
              <span className="text-xs text-charcoal-400 font-medium">
                {task.source === 'custom' ? 'Tugas Custom' : 'Rekomendasi WedSiap'}
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-charcoal-400
                hover:text-charcoal hover:bg-beige-200/60 transition-colors cursor-pointer"
              aria-label="Tutup Detail"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1">
            {!isEditing ? (
              /* VIEW MODE */
              <div className="space-y-6">
                {/* Title & Complete Toggle */}
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => onToggleComplete(task.id)}
                      className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5
                        transition-all border cursor-pointer
                        ${
                          isCompleted
                            ? 'bg-burgundy border-burgundy text-white'
                            : 'border-charcoal-300 hover:border-burgundy bg-white'
                        }`}
                      aria-label="Tandai status selesai"
                    >
                      {isCompleted && <Check className="w-4 h-4 stroke-[2.5]" />}
                    </button>
                    <h2
                      className={`font-serif text-xl sm:text-2xl font-bold leading-snug break-words
                      ${isCompleted ? 'line-through text-charcoal-400' : 'text-charcoal'}`}
                    >
                      {task.title}
                    </h2>
                  </div>
                </div>

                {/* Metadata Badges */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="bg-ivory-50 p-3 rounded-xl border border-beige space-y-1">
                    <span className="text-[10px] uppercase font-bold text-gold-600 block flex items-center gap-1">
                      <Tag className="w-3 h-3" /> Kategori
                    </span>
                    <span className="text-xs font-semibold text-charcoal block">
                      {CATEGORY_LABELS[task.category]}
                    </span>
                  </div>

                  <div className="bg-ivory-50 p-3 rounded-xl border border-beige space-y-1">
                    <span className="text-[10px] uppercase font-bold text-gold-600 block flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Prioritas
                    </span>
                    <span className="text-xs font-semibold text-charcoal block">
                      {TASK_PRIORITY_LABELS[task.priority]}
                    </span>
                  </div>

                  <div className="bg-ivory-50 p-3 rounded-xl border border-beige space-y-1 col-span-2 sm:col-span-1">
                    <span className="text-[10px] uppercase font-bold text-gold-600 block flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Deadline
                    </span>
                    <span
                      className={`text-xs font-semibold block ${
                        isOverdue ? 'text-rose-600 font-bold' : 'text-charcoal'
                      }`}
                    >
                      {task.dueDate ? formatDueDateLabel(task.dueDate) : 'Tanpa deadline'}
                    </span>
                  </div>

                  {task.estimatedMinutes && (
                    <div className="bg-ivory-50 p-3 rounded-xl border border-beige space-y-1 sm:col-span-1">
                      <span className="text-[10px] uppercase font-bold text-gold-600 block flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Perkiraan Waktu
                      </span>
                      <span className="text-xs font-semibold text-charcoal block">
                        {task.estimatedMinutes} menit
                      </span>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-2 pt-2 border-t border-beige">
                  <span className="text-xs font-bold uppercase tracking-wider text-charcoal-400 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-burgundy" /> Catatan / Deskripsi
                  </span>
                  {task.description ? (
                    <p className="text-sm text-charcoal-600 leading-relaxed whitespace-pre-wrap bg-ivory-50/50 p-3 rounded-xl border border-beige">
                      {task.description}
                    </p>
                  ) : (
                    <p className="text-xs text-charcoal-300 italic">Tidak ada catatan tambahan.</p>
                  )}
                </div>

                {/* Timestamps */}
                <div className="text-[11px] text-charcoal-400 space-y-0.5 pt-4 border-t border-beige">
                  <div>Dibuat: {new Date(task.createdAt).toLocaleDateString('id-ID')}</div>
                  {task.updatedAt && (
                    <div>Diperbarui: {new Date(task.updatedAt).toLocaleDateString('id-ID')}</div>
                  )}
                  {task.completedAt && (
                    <div className="text-emerald-700">
                      Diselesaikan: {new Date(task.completedAt).toLocaleDateString('id-ID')}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* EDIT MODE FORM */
              <form id="edit-task-form" onSubmit={handleSave} className="space-y-4">
                <h3 className="font-serif text-lg font-bold text-charcoal border-b border-beige pb-2">
                  Edit Tugas
                </h3>

                {/* Title */}
                <div>
                  <label className="block text-xs font-bold uppercase text-charcoal-400 mb-1">
                    Judul Tugas <span className="text-burgundy">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-beige-300 bg-white
                      focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-bold uppercase text-charcoal-400 mb-1">
                    Kategori
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as TaskCategoryId)}
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-beige-300 bg-white
                      focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy"
                  >
                    {ALL_TASK_CATEGORY_IDS.map((catId) => (
                      <option key={catId} value={catId}>
                        {CATEGORY_LABELS[catId]}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-xs font-bold uppercase text-charcoal-400 mb-1">
                    Prioritas
                  </label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as TaskPriority)}
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-beige-300 bg-white
                      focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy"
                  >
                    <option value="high">Prioritas Tinggi</option>
                    <option value="medium">Prioritas Sedang</option>
                    <option value="low">Prioritas Rendah</option>
                  </select>
                </div>

                {/* Due Date */}
                <div>
                  <label className="block text-xs font-bold uppercase text-charcoal-400 mb-1">
                    Deadline (Tanggal Selesai)
                  </label>
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-beige-300 bg-white
                      focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy"
                  />
                </div>

                {/* Estimated Minutes */}
                <div>
                  <label className="block text-xs font-bold uppercase text-charcoal-400 mb-1">
                    Perkiraan Waktu (Menit, Opsional)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Contoh: 30"
                    value={editEstimatedMinutes}
                    onChange={(e) => setEditEstimatedMinutes(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-beige-300 bg-white
                      focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold uppercase text-charcoal-400 mb-1">
                    Catatan / Deskripsi Opsional
                  </label>
                  <textarea
                    rows={3}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Tambahkan detail rincian atau kontak vendor..."
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-beige-300 bg-white
                      focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy"
                  />
                </div>
              </form>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-5 border-t border-beige bg-ivory-50/60 shrink-0 flex items-center justify-between gap-3">
            {!isEditing ? (
              <>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600
                    hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Hapus</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-charcoal
                      bg-white border border-beige hover:border-beige-300 rounded-xl transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleComplete(task.id)}
                    className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl
                      transition-colors cursor-pointer text-white ${
                        isCompleted ? 'bg-charcoal hover:bg-charcoal-700' : 'bg-burgundy hover:bg-burgundy-700'
                      }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isCompleted ? 'Buka Kembali' : 'Tandai Selesai'}</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-xs font-semibold text-charcoal-400 hover:text-charcoal transition-colors cursor-pointer"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  form="edit-task-form"
                  disabled={!editTitle.trim()}
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-xl
                    bg-burgundy text-white disabled:opacity-40 hover:bg-burgundy-700 transition-colors cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Perubahan</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
