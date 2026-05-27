import { UiButton, UiModal } from '@/components/ui';

interface UpdateAvailableDialogProps {
  isOpen: boolean;
  onClose: () => void;
  latestVersion?: string;
  currentVersion?: string;
}

export function UpdateAvailableDialog({
  isOpen,
  onClose,
  latestVersion,
  currentVersion,
}: UpdateAvailableDialogProps) {
  return (
    <UiModal
      isOpen={isOpen}
      onClose={onClose}
      title="Update Available"
      footer={(
        <>
          <UiButton variant="muted" onClick={onClose}>
            Cancel
          </UiButton>
          <UiButton variant="primary" onClick={onClose}>
            OK
          </UiButton>
        </>
      )}
    >
      <div className="text-sm text-text-muted leading-6">
        <p>A new version is available.</p>
        {(latestVersion || currentVersion) && (
          <p className="mt-2 text-xs">
            Current: {currentVersion ?? '-'} → Latest: {latestVersion ?? '-'}
          </p>
        )}
      </div>
    </UiModal>
  );
}
