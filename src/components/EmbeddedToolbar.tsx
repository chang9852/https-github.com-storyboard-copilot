import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

interface EmbeddedToolbarProps {
  isVisible: boolean;
  onGenerate: (prompt: string, params: GenerateParams) => void;
  onClose?: () => void;
}

interface GenerateParams {
  aspectRatio: string;
  steps: number;
  cfg: number;
}

const ASPECT_RATIOS = ['16:9', '9:16', '4:3', '3:4', '1:1'];
const SHOT_TYPES = [
  { id: 'close-up', labelKey: 'toolbar.closeUp', icon: 'CU' },
  { id: 'wide-shot', labelKey: 'toolbar.wideShot', icon: 'WS' },
  { id: 'medium', labelKey: 'toolbar.medium', icon: 'MS' },
  { id: 'extreme-close', labelKey: 'toolbar.extremeClose', icon: 'EC' },
];

export function EmbeddedToolbar({ isVisible, onGenerate, onClose: _onClose }: EmbeddedToolbarProps) {
  const { t } = useTranslation();
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [steps, setSteps] = useState(30);
  const [cfg, setCfg] = useState(7);

  const handleGenerate = useCallback(() => {
    if (prompt.trim()) {
      onGenerate(prompt, { aspectRatio, steps, cfg });
      setPrompt('');
    }
  }, [prompt, aspectRatio, steps, cfg, onGenerate]);

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'rgba(10, 10, 15, 0.95)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '0 0 12px 12px',
        padding: '12px',
        zIndex: 10,
      }}
    >
      {/* Prompt Input */}
      <div style={{ marginBottom: '10px' }}>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={t('ai.promptPlaceholder')}
          style={{
            width: '100%',
            height: '48px',
            resize: 'none',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '8px',
            padding: '8px 10px',
            fontSize: '11px',
            color: 'rgba(255, 255, 255, 0.9)',
            outline: 'none',
            transition: 'all 0.2s ease',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
          }}
        />
      </div>

      {/* Parameters Row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        {/* Aspect Ratio */}
        <select
          value={aspectRatio}
          onChange={(e) => setAspectRatio(e.target.value)}
          style={{
            padding: '4px 8px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '6px',
            fontSize: '10px',
            color: 'rgba(255, 255, 255, 0.7)',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          {ASPECT_RATIOS.map((ratio) => (
            <option key={ratio} value={ratio}>{ratio}</option>
          ))}
        </select>

        {/* Steps */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '9px', color: 'rgba(255, 255, 255, 0.4)' }}>Steps</span>
          <input
            type="number"
            value={steps}
            onChange={(e) => setSteps(Number(e.target.value))}
            min={10}
            max={50}
            style={{
              width: '40px',
              padding: '4px 6px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '6px',
              fontSize: '10px',
              color: 'rgba(255, 255, 255, 0.7)',
              outline: 'none',
              textAlign: 'center',
            }}
          />
        </div>

        {/* CFG */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '9px', color: 'rgba(255, 255, 255, 0.4)' }}>CFG</span>
          <input
            type="number"
            value={cfg}
            onChange={(e) => setCfg(Number(e.target.value))}
            min={1}
            max={20}
            style={{
              width: '40px',
              padding: '4px 6px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '6px',
              fontSize: '10px',
              color: 'rgba(255, 255, 255, 0.7)',
              outline: 'none',
              textAlign: 'center',
            }}
          />
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          style={{
            marginLeft: 'auto',
            padding: '6px 14px',
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            border: 'none',
            borderRadius: '6px',
            fontSize: '10px',
            fontWeight: 600,
            color: 'white',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(99, 102, 241, 0.3)';
          }}
        >
          {t('toolbar.generate')}
        </button>
      </div>

      {/* Shot Type Quick Buttons */}
      <div style={{ display: 'flex', gap: '6px' }}>
        {SHOT_TYPES.map((shot) => (
          <button
            key={shot.id}
            onClick={() => setPrompt((prev) => `${prev} ${t(shot.labelKey)}`)}
            style={{
              padding: '4px 8px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '4px',
              fontSize: '9px',
              color: 'rgba(255, 255, 255, 0.5)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(99, 102, 241, 0.15)';
              e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)';
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)';
            }}
          >
            {shot.icon}
          </button>
        ))}
      </div>
    </div>
  );
}
