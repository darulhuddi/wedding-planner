/**
 * WedFlow Starter Plan Modal (Phase 2 UI)
 *
 * "Rencana Persiapan yang Direkomendasikan"
 *
 * Flow:
 *   getStarterRecommendations() → user selects → optional edit → "Tambahkan ke Checklist"
 *   → TaskItem (via existing repository, not persisted as recommendation)
 *
 * Principles:
 * - Recommendations are NEVER persisted. Only selected + confirmed items become TaskItem.
 * - Uses existing repository (workspaceRepository.bulkCreateTasks / createTask).
 * - Partial failure is surfaced; selection & edit state preserved.
 * - No UI redesign of existing modules. No new nav item.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Sparkles,
  X,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
  Calendar,
  Tag,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ClipboardList,
  MapPin,
} from 'lucide-react';
import { StarterRecommendation } from '../../domain/templateTypes';
import { StoredWorkspace } from '../../types/workspace';
import { TaskItem, TaskPriority, TaskCategoryId } from '../../types/checklist';
import { WeddingEvent } from '../../domain/events';
import { getStarterRecommendations } from '../../domain/recommendationEngine';
import { CATEGORY_LABELS } from '../../domain/categories';
import { generateTaskId } from '../../utils/checklistUtils';
import { Button } from '../ui/Button';

// ─── Props ──────────────────────────────────────────────────────────────────

export interface StarterPlanModalProps {
  isOpen: boolean;
  workspace: StoredWorkspace;
  tasks: TaskItem[];
  events: WeddingEvent[];
  onClose: () => void;
  onTasksCreated: (newTasks: TaskItem[]) => Promise<void>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(ymd: string | null): string {
  if (!ymd) return '';
  const d = new Date(ymd + 'T00:00:00');
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  high: 'Prioritas Tinggi',
  medium: 'Prioritas Sedang',
  low: 'Prioritas Rendah',
};

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  high: 'bg-rose-50 text-rose-600 border-rose-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-sky-50 text-sky-700 border-sky-200',
};

const CATCH_UP_STYLE = 'bg-burgundy-50 text-burgundy border-burgundy-200';

// ─── Edit State & Conversion ──────────────────────────────────────────────────

export interface RecEditState {
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate: string;
  eventIds: string[];
}

/**
 * Pure conversion helper: converts a StarterRecommendation + optional user edits into a canonical TaskItem.
 * Preserves source = 'template', templateId, and eventIds.
 * Does not mutate the original recommendation object.
 */
export function convertRecommendationToTask(
  rec: StarterRecommendation,
  editState?: RecEditState | null,
  nowIso?: string
): TaskItem {
  const currentIso = nowIso || new Date().toISOString();
  return {
    id: generateTaskId(),
    title: (editState?.title ?? rec.title).trim() || rec.title,
    description: (editState?.description ?? rec.description).trim() || null,
    category: rec.category,
    status: 'todo',
    priority: (editState?.priority ?? rec.priority) as TaskPriority,
    dueDate: (editState?.dueDate ?? rec.suggestedDueDate) || null,
    estimatedMinutes: null,
    source: 'template',
    templateId: rec.templateId,
    eventIds: editState?.eventIds ?? rec.eventIds ?? [],
    createdAt: currentIso,
    updatedAt: currentIso,
    completedAt: null,
  };
}

// ─── Recommendation Card ─────────────────────────────────────────────────────

interface RecCardProps {
  rec: StarterRecommendation;
  events: WeddingEvent[];
  isSelected: boolean;
  isExpanded: boolean;
  editState: RecEditState | null;
  onToggleSelect: () => void;
  onToggleExpand: () => void;
  onEditChange: (field: keyof RecEditState, value: any) => void;
}

const RecCard: React.FC<RecCardProps> = ({
  rec,
  events,
  isSelected,
  isExpanded,
  editState,
  onToggleSelect,
  onToggleExpand,
  onEditChange,
}) => {
  const categoryLabel = CATEGORY_LABELS[rec.category as TaskCategoryId] || rec.category;
  const current: RecEditState = editState ?? {
    title: rec.title,
    description: rec.description,
    priority: rec.priority,
    dueDate: rec.suggestedDueDate ?? '',
    eventIds: rec.eventIds || [],
  };

  // Matching events for display badges
  const linkedEvents = useMemo(() => {
    if (!events || events.length === 0 || !current.eventIds || current.eventIds.length === 0) {
      return [];
    }
    return events.filter((e) => current.eventIds.includes(e.id));
  }, [events, current.eventIds]);

  const handleToggleEvent = (eventId: string) => {
    const existing = current.eventIds || [];
    const next = existing.includes(eventId)
      ? existing.filter((id) => id !== eventId)
      : [...existing, eventId];
    onEditChange('eventIds', next);
  };

  return (
    <div
      className={`rounded-2xl border transition-all duration-150 overflow-hidden
        ${isSelected
          ? 'border-burgundy bg-burgundy-50/30 shadow-sm'
          : 'border-beige bg-white hover:border-beige-300'
        }`}
    >
      {/* Card Header — always visible */}
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          <button
            type="button"
            onClick={onToggleSelect}
            className="mt-0.5 shrink-0 cursor-pointer text-burgundy focus:outline-none"
            aria-label={isSelected ? 'Hapus pilihan' : 'Pilih rekomendasi ini'}
          >
            {isSelected
              ? <CheckSquare className="w-5 h-5 text-burgundy" />
              : <Square className="w-5 h-5 text-charcoal-300" />
            }
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Badges Row */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide
                bg-ivory-100 text-charcoal-400 px-2 py-0.5 rounded-full border border-beige">
                <Tag className="w-3 h-3" />
                {categoryLabel}
              </span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${PRIORITY_COLORS[current.priority]}`}>
                {PRIORITY_LABELS[current.priority]}
              </span>
              {rec.mode === 'catch_up' && (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${CATCH_UP_STYLE}`}>
                  ⚡ Segera
                </span>
              )}
              {linkedEvents.map((evt) => (
                <span
                  key={evt.id}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold
                    bg-gold-50 text-gold-700 px-2 py-0.5 rounded-full border border-gold-200/70"
                >
                  <MapPin className="w-2.5 h-2.5" />
                  {evt.name}
                </span>
              ))}
            </div>

            {/* Title */}
            <h4 className="font-serif text-sm sm:text-base font-bold text-charcoal leading-snug">
              {current.title}
            </h4>

            {/* Description summary (not in edit mode header) */}
            {!isExpanded && (
              <p className="text-xs text-charcoal-400 line-clamp-2 leading-relaxed">
                {current.description}
              </p>
            )}

            {/* Due date preview row */}
            <div className="flex flex-wrap items-center gap-3 pt-0.5">
              {current.dueDate && (
                <span className="inline-flex items-center gap-1 text-xs text-charcoal-400">
                  <Calendar className="w-3.5 h-3.5 text-gold-600 shrink-0" />
                  Target: {formatDate(current.dueDate)}
                </span>
              )}
            </div>

            {/* Reason chip */}
            <p className="text-[11px] text-burgundy font-medium italic leading-relaxed">
              💡 {rec.reason}
            </p>
          </div>

          {/* Expand toggle */}
          <button
            type="button"
            onClick={onToggleExpand}
            className="shrink-0 text-charcoal-300 hover:text-charcoal transition-colors cursor-pointer mt-0.5"
            aria-label={isExpanded ? 'Tutup detail' : 'Edit detail'}
          >
            {isExpanded
              ? <ChevronUp className="w-4 h-4" />
              : <ChevronDown className="w-4 h-4" />
            }
          </button>
        </div>
      </div>

      {/* Expanded Edit Panel */}
      {isExpanded && (
        <div className="px-4 sm:px-5 pb-5 space-y-3 border-t border-beige bg-ivory-50/70 pt-4">
          <p className="text-[10px] uppercase font-bold tracking-wider text-gold-600">
            Edit Sebelum Ditambahkan
          </p>

          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-charcoal-400 block mb-1">Judul Tugas</label>
            <input
              type="text"
              value={current.title}
              onChange={(e) => onEditChange('title', e.target.value)}
              className="w-full text-sm border border-beige rounded-xl px-3 py-2 bg-white
                focus:outline-none focus:border-burgundy/50 focus:ring-1 focus:ring-burgundy/20
                text-charcoal font-medium"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-charcoal-400 block mb-1">Deskripsi (opsional)</label>
            <textarea
              rows={2}
              value={current.description}
              onChange={(e) => onEditChange('description', e.target.value)}
              className="w-full text-xs border border-beige rounded-xl px-3 py-2 bg-white resize-none
                focus:outline-none focus:border-burgundy/50 focus:ring-1 focus:ring-burgundy/20
                text-charcoal leading-relaxed"
            />
          </div>

          {/* Priority + Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-charcoal-400 block mb-1">Prioritas</label>
              <select
                value={current.priority}
                onChange={(e) => onEditChange('priority', e.target.value as TaskPriority)}
                className="w-full text-xs border border-beige rounded-xl px-3 py-2 bg-white
                  focus:outline-none focus:border-burgundy/50 text-charcoal font-medium cursor-pointer"
              >
                <option value="high">Prioritas Tinggi</option>
                <option value="medium">Prioritas Sedang</option>
                <option value="low">Prioritas Rendah</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-charcoal-400 block mb-1">
                Target Selesai <span className="font-normal text-charcoal-300">(saran)</span>
              </label>
              <input
                type="date"
                value={current.dueDate}
                onChange={(e) => onEditChange('dueDate', e.target.value)}
                className="w-full text-xs border border-beige rounded-xl px-3 py-2 bg-white
                  focus:outline-none focus:border-burgundy/50 text-charcoal font-medium cursor-pointer"
              />
            </div>
          </div>

          {/* Event Association (when events exist) */}
          {events && events.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-charcoal-400 block mb-1.5">
                Terkait Acara / Rangkaian Acara
              </label>
              <div className="flex flex-wrap gap-2">
                {events.map((evt) => {
                  const isChecked = (current.eventIds || []).includes(evt.id);
                  return (
                    <button
                      key={evt.id}
                      type="button"
                      onClick={() => handleToggleEvent(evt.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-xl border transition-colors cursor-pointer ${
                        isChecked
                          ? 'bg-burgundy text-white border-burgundy'
                          : 'bg-white text-charcoal-400 border-beige hover:border-beige-300'
                      }`}
                    >
                      {isChecked ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                      <span>{evt.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main Modal ───────────────────────────────────────────────────────────────

export const StarterPlanModal: React.FC<StarterPlanModalProps> = ({
  isOpen,
  workspace,
  tasks,
  events,
  onClose,
  onTasksCreated,
}) => {
  // Compute recommendations fresh when opened / when tasks change (never persisted)
  const recommendations = useMemo(() => {
    if (!isOpen) return [];
    return getStarterRecommendations({ workspace, tasks, events });
  }, [isOpen, workspace, tasks, events]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() =>
    new Set(recommendations.map((r) => r.id))
  );
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editStates, setEditStates] = useState<Map<string, RecEditState>>(new Map());
  const [isSaving, setIsSaving] = useState(false);
  const [saveErrors, setSaveErrors] = useState<string[]>([]);
  const [savedCount, setSavedCount] = useState<number | null>(null);

  // Sync selectedIds when recommendations change
  React.useEffect(() => {
    if (recommendations.length > 0) {
      setSelectedIds(new Set(recommendations.map((r) => r.id)));
    }
  }, [recommendations]);

  const allSelected = selectedIds.size === recommendations.length && recommendations.length > 0;
  const noneSelected = selectedIds.size === 0;

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleToggleAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(recommendations.map((r) => r.id)));
    }
  }, [allSelected, recommendations]);

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleEditChange = useCallback(
    (recId: string, rec: StarterRecommendation, field: keyof RecEditState, value: any) => {
      setEditStates((prev) => {
        const existing = prev.get(recId) ?? {
          title: rec.title,
          description: rec.description,
          priority: rec.priority,
          dueDate: rec.suggestedDueDate ?? '',
          eventIds: rec.eventIds || [],
        };
        const next = new Map(prev);
        next.set(recId, { ...existing, [field]: value });
        return next;
      });
    },
    []
  );

  const handleConfirm = useCallback(async () => {
    if (isSaving || noneSelected) return;
    setIsSaving(true);
    setSaveErrors([]);

    const nowIso = new Date().toISOString();
    const selectedRecs = recommendations.filter((r) => selectedIds.has(r.id));

    // Check for duplicates against existing tasks by templateId
    const existingTemplateIds = new Set(tasks.map((t) => t.templateId).filter(Boolean));

    const newTasks: TaskItem[] = [];

    for (const rec of selectedRecs) {
      if (existingTemplateIds.has(rec.templateId)) {
        continue;
      }

      const edit = editStates.get(rec.id);
      newTasks.push(convertRecommendationToTask(rec, edit, nowIso));
    }

    try {
      if (newTasks.length > 0) {
        await onTasksCreated(newTasks);
      }
      setSavedCount(newTasks.length);
    } catch (err: unknown) {
      setSaveErrors([
        err instanceof Error ? err.message : 'Gagal menyimpan rekomendasi tugas. Silakan coba lagi.',
      ]);
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, noneSelected, recommendations, selectedIds, tasks, editStates, onTasksCreated]);

  const handleModalClose = () => {
    setSavedCount(null);
    setSaveErrors([]);
    onClose();
  };

  if (!isOpen) return null;

  // Success state
  if (savedCount !== null) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div
          className="fixed inset-0 bg-charcoal/40 backdrop-blur-xs"
          onClick={handleModalClose}
          aria-hidden="true"
        />
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="relative w-full max-w-md rounded-2xl sm:rounded-3xl bg-white shadow-2xl border border-beige-300 overflow-hidden p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7 text-emerald-600" />
            </div>
            <h3 className="font-serif text-xl font-bold text-charcoal">
              {savedCount} Tugas Ditambahkan
            </h3>
            <p className="text-xs text-charcoal-400 leading-relaxed">
              Tugas-tugas tersebut sudah masuk ke Checklist, Timeline, dan Dashboard-mu.
            </p>
            <Button variant="primary" onClick={handleModalClose} fullWidth>
              Buka Checklist
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-charcoal/40 backdrop-blur-xs transition-opacity"
        onClick={handleModalClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-4">
        <div
          className="relative w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl border border-beige-300
            overflow-hidden flex flex-col max-h-[95dvh] sm:max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="px-5 sm:px-7 pt-6 pb-4 border-b border-beige bg-ivory-50/70 shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gold-50 border border-gold-200/80 text-gold-600 text-[10px] font-bold uppercase tracking-wide mb-2">
                  <Sparkles className="w-3 h-3" />
                  Rencana Awal WedSiap
                </div>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal tracking-tight">
                  Rencana Persiapan yang Direkomendasikan
                </h2>
                <p className="text-xs text-charcoal-400 mt-1 leading-relaxed">
                  Pilih tugas yang ingin kamu mulai. Kamu bisa menyesuaikan detail sebelum menambahkan.
                </p>
              </div>
              <button
                type="button"
                onClick={handleModalClose}
                className="shrink-0 p-1.5 rounded-xl text-charcoal-300 hover:text-charcoal hover:bg-ivory-200 transition-all cursor-pointer"
                aria-label="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Select All */}
            {recommendations.length > 0 && (
              <button
                type="button"
                onClick={handleToggleAll}
                className="mt-3 flex items-center gap-2 text-xs font-semibold text-burgundy hover:text-burgundy-700 cursor-pointer transition-colors"
              >
                {allSelected
                  ? <CheckSquare className="w-4 h-4" />
                  : <Square className="w-4 h-4" />
                }
                {allSelected ? 'Batal Pilih Semua' : 'Pilih Semua'}
                <span className="text-charcoal-400 font-normal">({recommendations.length})</span>
              </button>
            )}
          </div>

          {/* Scrollable Recommendation List */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3">
            {/* Empty State */}
            {recommendations.length === 0 && (
              <div className="py-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-ivory-200 flex items-center justify-center mx-auto">
                  <ClipboardList className="w-6 h-6 text-charcoal-300" />
                </div>
                <h3 className="font-serif text-base font-bold text-charcoal">
                  Tidak ada rekomendasi saat ini
                </h3>
                <p className="text-xs text-charcoal-400 max-w-xs mx-auto leading-relaxed">
                  Semua langkah persiapan awal yang relevan sudah ada di Checklist-mu. Kamu dapat menambahkan tugas baru secara mandiri.
                </p>
              </div>
            )}

            {/* Recommendation Cards */}
            {recommendations.map((rec) => (
              <RecCard
                key={rec.id}
                rec={rec}
                events={events}
                isSelected={selectedIds.has(rec.id)}
                isExpanded={expandedIds.has(rec.id)}
                editState={editStates.get(rec.id) ?? null}
                onToggleSelect={() => handleToggleSelect(rec.id)}
                onToggleExpand={() => handleToggleExpand(rec.id)}
                onEditChange={(field, value) => handleEditChange(rec.id, rec, field, value)}
              />
            ))}
          </div>

          {/* Error Display */}
          {saveErrors.length > 0 && (
            <div className="px-4 sm:px-6 py-3 bg-rose-50 border-t border-rose-200 shrink-0">
              {saveErrors.map((err, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-rose-700">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{err}</span>
                </div>
              ))}
            </div>
          )}

          {/* Footer CTA */}
          <div className="px-4 sm:px-6 py-4 border-t border-beige bg-white shrink-0">
            {recommendations.length > 0 ? (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:justify-between">
                <p className="text-xs text-charcoal-400 text-center sm:text-left">
                  {selectedIds.size === 0
                    ? 'Pilih setidaknya satu rekomendasi'
                    : `${selectedIds.size} tugas dipilih`}
                </p>
                <div className="flex gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={handleModalClose}
                    className="flex-1 sm:flex-none px-4 py-2.5 text-xs font-semibold rounded-xl
                      border border-beige text-charcoal hover:bg-ivory-200 transition-colors cursor-pointer min-h-touch"
                  >
                    Lewati
                  </button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleConfirm}
                    disabled={noneSelected || isSaving}
                    className="flex-1 sm:flex-none"
                    icon={isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
                    iconPosition="left"
                  >
                    {isSaving ? 'Menyimpan...' : 'Tambahkan ke Checklist'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex justify-end">
                <Button variant="secondary" size="sm" onClick={handleModalClose}>
                  Tutup
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
