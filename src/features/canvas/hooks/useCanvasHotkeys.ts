import { useCallback, useEffect } from 'react';

export function useCanvasHotkeys(params: {
  selectedNodeId: string | null;
  deleteNode: (nodeId: string) => void;
}): void {
  const { selectedNodeId, deleteNode } = params;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key !== 'Delete' && event.key !== 'Backspace') {
        return;
      }

      const target = event.target as HTMLElement;
      if (
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'INPUT' ||
        target.isContentEditable
      ) {
        return;
      }

      event.preventDefault();
      if (selectedNodeId) {
        deleteNode(selectedNodeId);
      }
    },
    [selectedNodeId, deleteNode]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
