import { LayoutGrid, Sparkles, Type, Upload, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { CanvasNodeType } from '../domain/canvasNodes';
import { getMenuNodeDefinitions, type MenuIconKey } from '../domain/nodeRegistry';

export interface CanvasCreateMenuPosition {
  x: number;
  y: number;
  canvasX: number;
  canvasY: number;
}

const iconByKey: Record<MenuIconKey, LucideIcon> = {
  upload: Upload,
  sparkles: Sparkles,
  layout: LayoutGrid,
  text: Type,
};

const accentByKey: Record<MenuIconKey, { gradient: string; bg: string; bgHover: string; borderHover: string; shadow: string }> = {
  sparkles: {
    gradient: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    bg: 'rgba(99, 102, 241, 0.08)',
    bgHover: 'rgba(99, 102, 241, 0.15)',
    borderHover: 'rgba(99, 102, 241, 0.4)',
    shadow: 'rgba(99, 102, 241, 0.3)',
  },
  upload: {
    gradient: 'linear-gradient(135deg, #22c55e, #16a34a)',
    bg: 'rgba(34, 197, 94, 0.08)',
    bgHover: 'rgba(34, 197, 94, 0.15)',
    borderHover: 'rgba(34, 197, 94, 0.4)',
    shadow: 'rgba(34, 197, 94, 0.3)',
  },
  text: {
    gradient: 'linear-gradient(135deg, #a855f7, #9333ea)',
    bg: 'rgba(168, 85, 247, 0.08)',
    bgHover: 'rgba(168, 85, 247, 0.15)',
    borderHover: 'rgba(168, 85, 247, 0.4)',
    shadow: 'rgba(168, 85, 247, 0.3)',
  },
  layout: {
    gradient: 'linear-gradient(135deg, #ec4899, #db2777)',
    bg: 'rgba(236, 72, 153, 0.08)',
    bgHover: 'rgba(236, 72, 153, 0.15)',
    borderHover: 'rgba(236, 72, 153, 0.4)',
    shadow: 'rgba(236, 72, 153, 0.3)',
  },
};

export function CanvasCreateMenu({
  position,
  onCreate,
  onDismiss,
}: {
  position: CanvasCreateMenuPosition;
  onCreate: (nodeType: CanvasNodeType) => void;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  const definitions = getMenuNodeDefinitions();

  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        zIndex: 999,
      }}
      onClick={onDismiss}
    >
      <div
        style={{
          position: 'absolute',
          left: position.x,
          top: position.y,
          transform: 'translate(-50%, -50%)',
          zIndex: 1000,
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          style={{
            background: 'var(--ui-glass-bg)',
            backdropFilter: 'blur(20px) saturate(120%)',
            border: '1px solid var(--ui-glass-border)',
            borderRadius: '20px',
            padding: '12px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            boxShadow:
              '0 20px 40px -15px rgba(31, 38, 135, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.6)',
          }}
        >
          {definitions.map((definition) => (
            <CreateMenuButton
              key={definition.type}
              label={t(definition.menuLabelKey)}
              iconKey={definition.menuIcon}
              onClick={() => onCreate(definition.type)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function CreateMenuButton({
  label,
  iconKey,
  onClick,
}: {
  label: string;
  iconKey: MenuIconKey;
  onClick: () => void;
}) {
  const Icon = iconByKey[iconKey];
  const accent = accentByKey[iconKey];

  return (
    <button
      onClick={onClick}
      style={{
        padding: '16px',
        borderRadius: '14px',
        border: '1px solid var(--ui-border-soft)',
        background: accent.bg,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '10px',
        minWidth: '100px',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.background = accent.bgHover;
        event.currentTarget.style.borderColor = accent.borderHover;
        event.currentTarget.style.transform = 'scale(1.02)';
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.background = accent.bg;
        event.currentTarget.style.borderColor = 'var(--ui-border-soft)';
        event.currentTarget.style.transform = 'scale(1)';
      }}
    >
      <div
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '12px',
          background: accent.gradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 4px 12px ${accent.shadow}`,
          color: '#ffffff',
        }}
      >
        <Icon size={20} strokeWidth={1.8} />
      </div>
      <span
        style={{
          fontSize: '11px',
          color: 'var(--text)',
          fontWeight: 600,
          textShadow: '0 1px 0 rgb(var(--bg-rgb) / 0.35)',
        }}
      >
        {label}
      </span>
    </button>
  );
}
