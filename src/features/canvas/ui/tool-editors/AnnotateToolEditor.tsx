import { AnnotateStage } from './AnnotateStage';
import { AnnotateToolbar } from './AnnotateToolbar';
import type { VisualToolEditorProps } from './types';
import { useAnnotateEditorState } from './useAnnotateEditorState';

export function AnnotateToolEditor({ options, onOptionsChange, sourceImageUrl }: VisualToolEditorProps) {
  const { toolbarProps, stageProps } = useAnnotateEditorState({
    options,
    onOptionsChange,
    sourceImageUrl,
  });

  return (
    <div className="space-y-3">
      <AnnotateToolbar {...toolbarProps} />
      <AnnotateStage {...stageProps} />
    </div>
  );
}
