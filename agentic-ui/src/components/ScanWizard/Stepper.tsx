// src/components/ScanWizard/Stepper.tsx

import React from 'react';
import type { ScanWizardStep } from '../../types/scans';

const steps: { key: ScanWizardStep; label: string }[] = [
  { key: 'ArtifactSelect', label: 'Artifact' },
  { key: 'DataSourceSelect', label: 'Source' },
  { key: 'DatabaseSelect', label: 'Database' },
  { key: 'ScheduleSelect', label: 'Schedule' },
  { key: 'ConfirmScan', label: 'Confirm' }
];

interface Props {
  currentStep: ScanWizardStep;
}

export const Stepper: React.FC<Props> = ({ currentStep }) => {
  const currentIdx = steps.findIndex(step => step.key === currentStep);

  return (
    <ol className="flex space-x-4 mb-8">
      {steps.map((step, idx) => (
        <li key={step.key} className="flex items-center">
          <div
            className={`rounded-full w-8 h-8 flex items-center justify-center
              ${idx <= currentIdx ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}
            `}
          >
            {idx + 1}
          </div>
          <span className="ml-2">{step.label}</span>
          {idx < steps.length - 1 && <span className="mx-2 text-gray-400">→</span>}
        </li>
      ))}
    </ol>
  );
};
