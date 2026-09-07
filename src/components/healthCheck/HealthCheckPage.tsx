import React, { useState, useEffect, useMemo } from 'react';
import { HealthCheckEntry } from './HealthCheckEntry';
import { HealthCheckQuestionnaire } from './HealthCheckQuestionnaire';
import { HealthCheckAnalyzing } from './HealthCheckAnalyzing';
import { HealthCheckReport } from './HealthCheckReport';
import { HealthCheckInput, PersistedHealthCheckAssessment, WeddingHealthReport } from '../../domain/healthCheck/types';
import { createPersistedAssessment } from '../../domain/healthCheck/conversion';
import { getPendingAssessment, savePendingAssessment, clearPendingAssessment } from '../../domain/healthCheck/storage';

export interface HealthCheckPageProps {
  initialSubRoute?: 'entry' | 'report';
  onNavigateToSignup: () => void;
  onNavigateHome: () => void;
}

type FlowState = 'entry' | 'questionnaire' | 'analyzing' | 'report';

function getTodayYMD(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const HealthCheckPage: React.FC<HealthCheckPageProps> = ({
  initialSubRoute = 'entry',
  onNavigateToSignup,
  onNavigateHome,
}) => {
  const [existingAssessment, setExistingAssessment] = useState<PersistedHealthCheckAssessment | null>(() =>
    getPendingAssessment()
  );

  const [flowState, setFlowState] = useState<FlowState>(() => {
    const saved = getPendingAssessment();
    if (initialSubRoute === 'report' && saved?.report) {
      return 'report';
    }
    return 'entry';
  });

  const [currentInput, setCurrentInput] = useState<HealthCheckInput | null>(() => {
    return existingAssessment?.input || null;
  });

  const [activeReport, setActiveReport] = useState<WeddingHealthReport | null>(() => {
    return existingAssessment?.report || null;
  });

  // Keep state synchronized if storage changes
  useEffect(() => {
    const saved = getPendingAssessment();
    if (saved) {
      setExistingAssessment(saved);
      if (!currentInput) setCurrentInput(saved.input);
      if (!activeReport && saved.report) setActiveReport(saved.report);
    }
  }, []);

  const handleStartFromEntry = () => {
    setFlowState('questionnaire');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleViewExistingReport = () => {
    if (existingAssessment?.report) {
      setActiveReport(existingAssessment.report);
      setCurrentInput(existingAssessment.input);
      setFlowState('report');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleResetExisting = () => {
    clearPendingAssessment();
    setExistingAssessment(null);
    setCurrentInput(null);
    setActiveReport(null);
    setFlowState('questionnaire');
  };

  const handleQuestionnaireComplete = (input: HealthCheckInput) => {
    setCurrentInput(input);
    setFlowState('analyzing');

    // Run authoritative pure domain assessment computation
    const today = getTodayYMD();
    const assessment = createPersistedAssessment(input, today);

    // Save to storage immediately for persistence
    savePendingAssessment(assessment);
    setExistingAssessment(assessment);
    setActiveReport(assessment.report || null);
  };

  const handleAnalyzingComplete = () => {
    setFlowState('report');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditAnswers = () => {
    setFlowState('questionnaire');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartPlanning = () => {
    // Ensure the assessment is persisted in localStorage before navigating to signup
    if (currentInput) {
      const assessment = createPersistedAssessment(currentInput, getTodayYMD());
      savePendingAssessment(assessment);
    }
    onNavigateToSignup();
  };

  if (flowState === 'entry') {
    return (
      <HealthCheckEntry
        onStart={handleStartFromEntry}
        hasExistingAssessment={Boolean(existingAssessment?.report)}
        onViewExisting={handleViewExistingReport}
        onResetExisting={handleResetExisting}
      />
    );
  }

  if (flowState === 'questionnaire') {
    return (
      <HealthCheckQuestionnaire
        initialValues={currentInput || undefined}
        onComplete={handleQuestionnaireComplete}
        onBackToEntry={() => setFlowState('entry')}
      />
    );
  }

  if (flowState === 'analyzing') {
    return <HealthCheckAnalyzing onComplete={handleAnalyzingComplete} />;
  }

  if (flowState === 'report' && activeReport && currentInput) {
    return (
      <HealthCheckReport
        report={activeReport}
        input={currentInput}
        onStartPlanning={handleStartPlanning}
        onEditAnswers={handleEditAnswers}
      />
    );
  }

  // Fallback to entry if state is incomplete
  return (
    <HealthCheckEntry
      onStart={handleStartFromEntry}
      hasExistingAssessment={Boolean(existingAssessment?.report)}
      onViewExisting={handleViewExistingReport}
      onResetExisting={handleResetExisting}
    />
  );
};
