import React from 'react';
import { Heart, Calendar, CheckCircle2, ArrowRight, Sparkles, DollarSign, Users } from 'lucide-react';
import { Button } from '../ui/Button';
import { WorkspaceViewModel } from '../../types/workspace';

export interface WorkspaceReadyStepProps {
  workspace: WorkspaceViewModel;
  onComplete: () => void;
}

export const WorkspaceReadyStep: React.FC<WorkspaceReadyStepProps> = ({
  workspace,
  onComplete,
}) => {
  const isDatePassed = workspace.daysUntilWedding < 0;

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'budget': return 'Budget';
      case 'checklist': return 'Checklist';
      case 'vendor': return 'Vendor';
      case 'timeline': return 'Timeline';
      default: return priority;
    }
  };

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-beige-300 shadow-card space-y-6">
      
      {/* Header */}
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-burgundy-50 border border-burgundy-100 flex items-center justify-center text-burgundy mx-auto mb-4 shadow-sm">
          <Heart className="w-7 h-7 fill-burgundy text-burgundy" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold-50 border border-gold-200/80 text-gold-600 text-xs font-semibold mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Setup Selesai</span>
        </div>
        <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-charcoal tracking-tight">
          Workspace-mu Siap.
        </h2>
        <p className="text-xs sm:text-sm text-charcoal-400 mt-2 leading-relaxed max-w-md mx-auto">
          <strong className="text-charcoal font-semibold">{workspace.coupleName}</strong>
          {isDatePassed ? (
            <span>, tanggal pernikahanmu telah lewat. Workspace telah kami siapkan.</span>
          ) : (
            <span>, kamu punya <strong className="text-burgundy font-semibold">{workspace.daysUntilWedding} hari</strong> menuju hari-H. Workspace awalmu sudah kami siapkan.</span>
          )}
        </p>
      </div>

      {/* Dynamic Summary Poster Card */}
      <div className="bg-ivory-50/70 rounded-2xl p-5 border border-beige space-y-4 shadow-2xs">
        
        {/* Row 1: Date & Countdown */}
        <div className="flex items-center justify-between pb-3 border-b border-beige gap-2">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-4 h-4 text-burgundy shrink-0" />
            <div>
              <span className="text-[10px] uppercase font-bold text-gold-600 tracking-wider block">Tanggal Pernikahan</span>
              <span className="text-xs sm:text-sm font-semibold text-charcoal">{workspace.formattedDate}</span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-charcoal-400 tracking-wider block">Hitung Mundur</span>
            <span className="font-serif text-base sm:text-lg font-bold text-burgundy">
              {isDatePassed ? 'Tanggal Lewat' : `${workspace.daysUntilWedding} hari lagi`}
            </span>
          </div>
        </div>

        {/* Row 2: 3-Col Key Metrics */}
        <div className="grid grid-cols-3 gap-2 text-center pt-1">
          <div className="bg-white p-2.5 rounded-xl border border-beige shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-charcoal-400 block mb-0.5 flex items-center justify-center gap-1">
              <DollarSign className="w-3 h-3 text-burgundy" />
              Perkiraan Budget
            </span>
            <span className="font-serif text-sm sm:text-base font-bold text-charcoal truncate block">
              {workspace.formattedBudget}
            </span>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-beige shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-charcoal-400 block mb-0.5 flex items-center justify-center gap-1">
              <Users className="w-3 h-3 text-gold-600" />
              Tamu
            </span>
            <span className="font-serif text-sm sm:text-base font-bold text-charcoal block">
              {workspace.estimatedGuestCount} <span className="text-[10px] font-sans font-normal text-charcoal-400">orang</span>
            </span>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-beige shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-charcoal-400 block mb-0.5 flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Persiapan
            </span>
            <span className="font-serif text-sm sm:text-base font-bold text-charcoal block">
              {workspace.completedCategoriesCount}/6 <span className="text-[10px] text-emerald-700 font-sans font-normal">({workspace.completionPercentage}%)</span>
            </span>
          </div>
        </div>

        {/* WedFlow Recommendation Card */}
        <div className="bg-white rounded-xl p-4 border border-burgundy-200/90 shadow-soft space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[11px] font-medium text-charcoal-400">
              Fokus pilihanmu: <strong className="text-charcoal uppercase font-bold">{getPriorityLabel(workspace.primaryPlanningPriority)}</strong>
            </span>
            <span className="text-[10px] font-semibold bg-burgundy-50 text-burgundy px-2 py-0.5 rounded border border-burgundy-100">
              {workspace.nextBestAction.priorityTag}
            </span>
          </div>

          <div className="pt-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-burgundy block mb-0.5">
              Langkah pertama yang kami sarankan:
            </span>
            <h4 className="font-serif text-base sm:text-lg font-bold text-charcoal">
              {workspace.nextBestAction.title}
            </h4>
            <p className="text-xs text-charcoal-400 mt-1 leading-relaxed">
              {workspace.nextBestAction.description}
            </p>
            {workspace.nextBestAction.reason && (
              <p className="text-[11px] text-burgundy font-medium mt-1.5 pt-1.5 border-t border-burgundy-100/60">
                💡 {workspace.nextBestAction.reason}
              </p>
            )}
          </div>
        </div>

      </div>

      {/* Explanation */}
      <p className="text-xs text-charcoal-400 text-center leading-relaxed">
        Berdasarkan tanggal hari-H, status persiapan, dan pilihan fokusmu, WedFlow telah menyusun alur awal workspace-mu.
      </p>

      {/* Primary Action Button */}
      <div className="pt-2">
        <Button
          type="button"
          variant="primary"
          fullWidth
          size="lg"
          onClick={onComplete}
          icon={<ArrowRight className="w-4 h-4" />}
        >
          Lihat Wedding Overview
        </Button>
      </div>

    </div>
  );
};
