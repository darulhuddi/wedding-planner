import React from 'react';
import { Lightbulb } from 'lucide-react';

import { BudgetInsightMessage } from '../../domain/budgetSelectors';

interface BudgetInsightsCardProps {
  insights: BudgetInsightMessage[];
}

export const BudgetInsightsCard: React.FC<BudgetInsightsCardProps> = ({
  insights,
}) => {
  if (insights.length === 0) {
    return (
      <div className="bg-ivory-100 rounded-2xl p-5 border border-beige text-center">
        <Lightbulb className="w-6 h-6 text-charcoal-300 mx-auto mb-2" />
        <p className="text-sm text-charcoal-500 font-medium">
          Budget kamu dalam kondisi aman.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-burgundy-50 rounded-2xl p-5 border border-burgundy-100">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="w-5 h-5 text-burgundy" />
        <h3 className="font-serif text-lg font-bold text-burgundy-900">
          Insight Budget
        </h3>
      </div>
      <ul className="space-y-2">
        {insights.map((insight, index) => (
          <li key={index} className={`flex gap-2 text-sm ${insight.isCritical ? 'text-red-700' : 'text-burgundy-800'}`}>
            <span className={`shrink-0 mt-0.5 ${insight.isCritical ? 'text-red-500' : 'text-burgundy-400'}`}>•</span>
            <div className="flex flex-col">
              <span className="leading-relaxed font-medium">{insight.title}</span>
              {insight.subtitle && (
                <span className="text-xs opacity-80 mt-0.5 leading-relaxed">{insight.subtitle}</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
