import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useOnboarding } from './OnboardingContext';
import { GuideRenderer } from './GuideRenderer';
import { OnboardingWizard } from './onboarding/OnboardingWizard';
import { X } from 'lucide-react';

export function OnboardingModal() {
  const { showOnboarding, dismissOnboarding, pageGuide, pageGuideOpen, closePageGuide } = useOnboarding();

  const isOpen = showOnboarding || pageGuideOpen;
  const isOnboarding = showOnboarding && !pageGuideOpen;

  const handleClose = () => {
    if (isOnboarding) dismissOnboarding();
    else closePageGuide();
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={() => {}} size="lg">
      <div className="relative">
        <button
          onClick={handleClose}
          className="absolute -top-2 -right-2 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Skip"
        >
          <X className="w-5 h-5" />
        </button>

        {isOnboarding ? (
          <OnboardingWizard />
        ) : pageGuide ? (
          <div>
            <GuideRenderer guide={pageGuide} />
            <div className="flex justify-end mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button size="sm" onClick={handleClose}>Got it</Button>
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
