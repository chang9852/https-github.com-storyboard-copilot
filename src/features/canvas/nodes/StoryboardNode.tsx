import { memo, useMemo, useState, useCallback } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Download } from 'lucide-react';
import type { StoryboardCell, StoryboardSplitFrame } from '@/types/project';

interface StoryboardNodeProps {
  id: string;
  data: StoryboardCell;
  selected?: boolean;
}

function generateFrameId(): string {
  return `frame-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const StoryboardNode = memo(({ id, data, selected }: StoryboardNodeProps) => {
  const { updateNodeData } = useReactFlow();

  const frames = (data as any).frames || [];
  const gridRows = (data as any).gridRows || 2;
  const gridCols = (data as any).gridCols || 2;
  const aspectRatio = data.aspectRatio || '16:9';

  const [isExpanded, setIsExpanded] = useState(false);

  const totalFrames = gridRows * gridCols;

  // 自动调整帧数量
  const normalizedFrames = useMemo(() => {
    if (frames.length === totalFrames) return frames;
    if (frames.length > totalFrames) return frames.slice(0, totalFrames);

    const newFrames = [...frames];
    for (let i = frames.length; i < totalFrames; i++) {
      newFrames.push({
        id: generateFrameId(),
        imageUrl: null,
        note: '',
        order: i,
      });
    }
    return newFrames;
  }, [frames, totalFrames]);

  // 更新帧数据
  const updateFrame = useCallback((frameIndex: number, updates: Partial<StoryboardSplitFrame>) => {
    const newFrames = [...normalizedFrames];
    newFrames[frameIndex] = { ...newFrames[frameIndex], ...updates };
    updateNodeData(id, { frames: newFrames });
  }, [id, normalizedFrames, updateNodeData]);

  // 更新网格设置
  const updateGrid = useCallback((rows: number, cols: number) => {
    updateNodeData(id, { gridRows: rows, gridCols: cols });
  }, [id, updateNodeData]);

  // 导出分镜图
  const handleExport = useCallback(async () => {
    // TODO: 实现分镜导出功能
    console.log('Export storyboard:', { frames: normalizedFrames, gridRows, gridCols, aspectRatio });
  }, [normalizedFrames, gridRows, gridCols, aspectRatio]);

  // CSS宽高比
  const cssAspectRatio = useMemo(() => {
    const [w = '16', h = '9'] = aspectRatio.split(':');
    return `${w} / ${h}`;
  }, [aspectRatio]);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        borderRadius: 'var(--node-radius)',
        background: 'var(--ui-surface-panel)',
        border: `1px solid ${selected ? 'var(--accent)' : 'var(--ui-border-soft)'}`,
        boxShadow: selected
          ? '0 0 0 2px rgba(var(--accent-rgb), 0.2), 0 4px 12px rgba(0,0,0,0.1)'
          : '0 2px 6px rgba(0,0,0,0.06)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <Handle type="target" position={Position.Left} style={{ width: 8, height: 8, background: 'var(--accent)', border: '2px solid white' }} />
      <Handle type="source" position={Position.Right} style={{ width: 8, height: 8, background: 'var(--accent)', border: '2px solid white' }} />

      {/* Header */}
      <div style={{ padding: '12px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '20px',
            height: '20px',
            borderRadius: '6px',
            background: 'linear-gradient(135deg, #ec4899, #be185d)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.5">
              <rect x="2" y="2" width="5" height="5" rx="1" />
              <rect x="9" y="2" width="5" height="5" rx="1" />
              <rect x="2" y="9" width="5" height="5" rx="1" />
              <rect x="9" y="9" width="5" height="5" rx="1" />
            </svg>
          </div>
          <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>分镜切割</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              padding: '4px 8px',
              fontSize: '10px',
              color: 'var(--text-muted)',
              background: 'var(--ui-surface-field)',
              border: '1px solid var(--ui-border-soft)',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            {isExpanded ? '收起' : '展开'}
          </button>
        </div>
      </div>

      {/* Grid Controls */}
      <div style={{ padding: '0 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Rows */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>行</span>
            <button onClick={() => updateGrid(Math.max(1, gridRows - 1), gridCols)} style={{ width: '20px', height: '20px', borderRadius: '4px', border: '1px solid var(--ui-border-soft)', background: 'var(--ui-surface-field)', cursor: 'pointer', fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</button>
            <span style={{ fontSize: '13px', fontWeight: 500, minWidth: '20px', textAlign: 'center' }}>{gridRows}</span>
            <button onClick={() => updateGrid(Math.min(6, gridRows + 1), gridCols)} style={{ width: '20px', height: '20px', borderRadius: '4px', border: '1px solid var(--ui-border-soft)', background: 'var(--ui-surface-field)', cursor: 'pointer', fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
          </div>

          {/* Cols */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>列</span>
            <button onClick={() => updateGrid(gridRows, Math.max(1, gridCols - 1))} style={{ width: '20px', height: '20px', borderRadius: '4px', border: '1px solid var(--ui-border-soft)', background: 'var(--ui-surface-field)', cursor: 'pointer', fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</button>
            <span style={{ fontSize: '13px', fontWeight: 500, minWidth: '20px', textAlign: 'center' }}>{gridCols}</span>
            <button onClick={() => updateGrid(gridRows, Math.min(6, gridCols + 1))} style={{ width: '20px', height: '20px', borderRadius: '4px', border: '1px solid var(--ui-border-soft)', background: 'var(--ui-surface-field)', cursor: 'pointer', fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
          </div>
        </div>

        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{totalFrames}格</span>
      </div>

      {/* Frame Grid */}
      <div style={{ flex: 1, padding: '0 16px 12px', overflow: 'auto' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
            gap: '2px',
            background: 'var(--ui-surface-field)',
            borderRadius: '8px',
            padding: '8px',
          }}
        >
          {normalizedFrames.map((frame: StoryboardSplitFrame, index: number) => (
            <div
              key={frame.id}
              style={{
                aspectRatio: cssAspectRatio,
                background: 'var(--ui-surface-panel)',
                borderRadius: '6px',
                padding: '8px',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                border: '1px solid var(--ui-border-soft)',
                overflow: 'hidden',
              }}
            >
              {/* Frame Image */}
              {frame.imageUrl ? (
                <img
                  src={frame.imageUrl}
                  alt={`Frame ${index + 1}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: '4px',
                  }}
                />
              ) : (
                <div style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '10px',
                }}>
                  {index + 1}
                </div>
              )}

              {/* Frame Note */}
              {isExpanded && (
                <textarea
                  value={frame.note || ''}
                  onChange={(e) => updateFrame(index, { note: e.target.value })}
                  placeholder={`分镜 ${index + 1} 备注`}
                  style={{
                    position: 'absolute',
                    bottom: '4px',
                    left: '4px',
                    right: '4px',
                    height: '24px',
                    resize: 'none',
                    border: 'none',
                    background: 'rgba(0,0,0,0.6)',
                    color: 'white',
                    fontSize: '9px',
                    padding: '2px 4px',
                    borderRadius: '3px',
                    outline: 'none',
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Controls */}
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px solid var(--ui-border-soft)' }}>
        {/* Aspect Ratio */}
        <select
          value={aspectRatio}
          onChange={(e) => updateNodeData(id, { aspectRatio: e.target.value })}
          style={{
            padding: '6px 10px',
            background: 'var(--ui-surface-field)',
            border: '1px solid var(--ui-border-soft)',
            borderRadius: 'var(--ui-radius-lg)',
            fontSize: '11px',
            color: 'var(--text)',
            cursor: 'pointer',
            outline: 'none',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <option value="16:9">16:9</option>
          <option value="9:16">9:16</option>
          <option value="4:3">4:3</option>
          <option value="3:4">3:4</option>
          <option value="1:1">1:1</option>
        </select>

        {/* Export Button */}
        <button
          onClick={(e) => { e.stopPropagation(); handleExport(); }}
          style={{
            marginLeft: 'auto',
            padding: '8px 16px',
            fontSize: '12px',
            fontWeight: 500,
            color: 'white',
            background: 'var(--accent)',
            border: 'none',
            borderRadius: 'var(--ui-radius-lg)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Download size={12} />
          导出
        </button>
      </div>
    </div>
  );
});

StoryboardNode.displayName = 'StoryboardNode';
