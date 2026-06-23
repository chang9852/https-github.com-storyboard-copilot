import { ArrowRight, Brush, Circle, Redo2, Square, Trash2, Type, Undo2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { ToolOptions } from '@/features/canvas/tools';
import type { AnnotationToolType } from '@/features/canvas/tools/annotation';
import {
  MAX_LINE_WIDTH_PERCENT,
  MAX_TEXT_SIZE_PERCENT,
  MIN_LINE_WIDTH_PERCENT,
  MIN_TEXT_SIZE_PERCENT,
} from './annotateEditorUtils';

type ToolButton = { type: AnnotationToolType; label: string; icon: typeof Square };

export function AnnotateToolbar({
  tool,
  activeStyleKind,
  color,
  lineWidthPercent,
  textSizePercent,
  canUndo,
  canRedo,
  canDeleteSelected,
  canClear,
  onToolChange,
  onStyleInputChange,
  onUndo,
  onRedo,
  onDeleteSelected,
  onClear,
}: {
  tool: AnnotationToolType;
  activeStyleKind: 'shape' | 'text' | null;
  color: string;
  lineWidthPercent: number;
  textSizePercent: number;
  canUndo: boolean;
  canRedo: boolean;
  canDeleteSelected: boolean;
  canClear: boolean;
  onToolChange: (tool: AnnotationToolType) => void;
  onStyleInputChange: (patch: Partial<ToolOptions>) => void;
  onUndo: () => void;
  onRedo: () => void;
  onDeleteSelected: () => void;
  onClear: () => void;
}) {
  const { t } = useTranslation();
  const toolButtons: ToolButton[] = [
    { type: 'rect', label: t('annotateEditor.rect'), icon: Square },
    { type: 'ellipse', label: t('annotateEditor.ellipse'), icon: Circle },
    { type: 'arrow', label: t('annotateEditor.arrow'), icon: ArrowRight },
    { type: 'pen', label: t('annotateEditor.pen'), icon: Brush },
    { type: 'text', label: t('annotateEditor.text'), icon: Type },
  ];

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {toolButtons.map((button) => {
          const Icon = button.icon;
          const active = tool === button.type;
          return (
            <button
              key={button.type}
              type="button"
              onClick={() => onToolChange(button.type)}
              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                active
                  ? 'border-accent/45 bg-accent/15 text-text-dark'
                  : 'border-[rgba(255,255,255,0.14)] text-text-muted hover:bg-bg-dark'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {button.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {activeStyleKind && (
          <>
            <input
              type="color"
              value={color}
              onChange={(event) => onStyleInputChange({ color: event.target.value })}
              className="h-9 w-10 cursor-pointer rounded-md border border-[rgba(255,255,255,0.18)] bg-transparent p-1"
            />
            {activeStyleKind === 'shape' && (
              <>
                <input
                  type="range"
                  min={MIN_LINE_WIDTH_PERCENT}
                  max={MAX_LINE_WIDTH_PERCENT}
                  step={0.1}
                  value={Number(lineWidthPercent.toFixed(1))}
                  onChange={(event) => onStyleInputChange({ lineWidthPercent: Number(event.target.value) })}
                />
                <span className="w-10 text-xs text-text-muted">{lineWidthPercent.toFixed(1)}%</span>
              </>
            )}
            {activeStyleKind === 'text' && (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={MIN_TEXT_SIZE_PERCENT}
                  max={MAX_TEXT_SIZE_PERCENT}
                  step={0.5}
                  value={Number(textSizePercent.toFixed(1))}
                  onChange={(event) =>
                    onStyleInputChange({ fontSizePercent: Number(event.target.value) })
                  }
                  className="h-9 w-24 rounded-lg border border-[rgba(255,255,255,0.14)] bg-bg-dark/80 px-2 text-sm text-text-dark outline-none"
                />
                <span className="text-xs text-text-muted">%</span>
              </div>
            )}
          </>
        )}
        <ToolbarButton onClick={onUndo} disabled={!canUndo} label={t('annotateEditor.undo')}>
          <Undo2 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={onRedo} disabled={!canRedo} label={t('annotateEditor.redo')}>
          <Redo2 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={onDeleteSelected}
          disabled={!canDeleteSelected}
          label={t('annotateEditor.deleteSelected')}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={onClear} disabled={!canClear} label={t('annotateEditor.clear')}>
          <Trash2 className="h-3.5 w-3.5" />
        </ToolbarButton>
      </div>
    </>
  );
}

function ToolbarButton({
  children,
  label,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 rounded-lg border border-[rgba(255,255,255,0.14)] px-2.5 py-1.5 text-xs text-text-muted transition-colors hover:bg-bg-dark"
      onClick={onClick}
      disabled={disabled}
    >
      {children}
      {label}
    </button>
  );
}
