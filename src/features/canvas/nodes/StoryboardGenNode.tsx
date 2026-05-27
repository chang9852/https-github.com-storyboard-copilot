import { memo, useState, useCallback, useEffect, useMemo } from "react";
import { Handle, Position, useReactFlow, useNodes, useEdges } from "@xyflow/react";
import { useSettingsStore } from "@/stores/settingsStore";
import { useProjectStore } from "@/stores/projectStore";
import { createGenerationTask, pollTaskResult, getModelsByProvider } from "@/services/ai";
import type { StoryboardCell, StoryboardGenFrame } from "@/types/project";
import type { ProviderId } from "@/types/ai";

interface StoryboardGenNodeProps {
  id: string;
  data: StoryboardCell;
  selected?: boolean;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function generateFrameId(): string {
  return `frame-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// 解析@引用
function parseAtReferences(text: string): { text: string; refs: number[] } {
  const refs: number[] = [];
  const parsed = text.replace(/@图(\d+)/g, (_, num) => {
    const index = parseInt(num) - 1;
    if (index >= 0) {
      refs.push(index);
    }
    return `{{ref:${num}}}`;
  });
  return { text: parsed, refs };
}

export const StoryboardGenNode = memo(({ id, data, selected }: StoryboardGenNodeProps) => {
  const { addNodes, addEdges } = useReactFlow();
  const { providerConfigs } = useSettingsStore();
  const { updateCell } = useProjectStore();
  const nodes = useNodes();
  const edges = useEdges();

  const [selectedProvider, setSelectedProvider] = useState<ProviderId>((data.aiProvider as ProviderId) || "kie");
  const [selectedModel, setSelectedModel] = useState(data.aiModel || "kie/nano-banana-pro");
  const [selectedSize, setSelectedSize] = useState<"1K" | "2K" | "4K">("2K");
  const [selectedAspectRatio, setSelectedAspectRatio] = useState("auto");
  const [gridRows, setGridRows] = useState(2);
  const [gridCols, setGridCols] = useState(2);
  const [frames, setFrames] = useState<StoryboardGenFrame[]>(() => {
    const count = gridRows * gridCols;
    return Array.from({ length: count }, () => ({
      id: generateFrameId(),
      description: "",
      referenceIndex: null,
    }));
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [pickerFrameIndex, setPickerFrameIndex] = useState<number | null>(null);
  const [pickerActiveIndex, setPickerActiveIndex] = useState(0);

  const models = getModelsByProvider(selectedProvider);
  const totalFrames = gridRows * gridCols;

  // 获取上游图片
  const incomingImages = useMemo(() => {
    const imageNodes: string[] = [];
    const nodeById = new Map(nodes.map((n) => [n.id, n]));

    edges.forEach((edge) => {
      if (edge.target === id) {
        const sourceNode = nodeById.get(edge.source);
        if (sourceNode?.data?.imageUrl) {
          imageNodes.push(sourceNode.data.imageUrl as string);
        }
      }
    });

    return imageNodes;
  }, [nodes, edges, id]);

  // 自动调整帧数量
  useEffect(() => {
    const currentCount = frames.length;
    if (currentCount === totalFrames) return;

    if (totalFrames > currentCount) {
      const newFrames = [...frames];
      for (let i = currentCount; i < totalFrames; i++) {
        newFrames.push({
          id: generateFrameId(),
          description: "",
          referenceIndex: null,
        });
      }
      setFrames(newFrames);
    } else {
      setFrames(frames.slice(0, totalFrames));
    }
  }, [totalFrames]);

  // 构建提示词
  const buildPrompt = useCallback((): string => {
    const parts: string[] = [];
    parts.push(`生成一张${gridRows}×${gridCols}的${totalFrames}宫格分镜图。`);

    frames.forEach((frame, index) => {
      if (frame.description.trim()) {
        const { text: parsedText, refs } = parseAtReferences(frame.description);
        let desc = parsedText;

        refs.forEach((refIndex) => {
          if (refIndex < incomingImages.length) {
            desc = desc.replace(`{{ref:${refIndex + 1}}}`, `[参考图${refIndex + 1}]`);
          }
        });

        parts.push(`分镜${index + 1}：${desc}`);
      }
    });

    return parts.join("\n");
  }, [gridRows, gridCols, frames, totalFrames, incomingImages]);

  // 插入@引用
  const insertAtReference = useCallback((frameIndex: number, imageIndex: number) => {
    const frame = frames[frameIndex];
    if (!frame) return;

    const newDescription = frame.description + `@图${imageIndex + 1}`;
    const newFrames = [...frames];
    newFrames[frameIndex] = { ...frame, description: newDescription, referenceIndex: imageIndex };
    setFrames(newFrames);
    setShowImagePicker(false);
  }, [frames]);

  // 处理键盘事件
  const handleFrameKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
    if (e.key === "@") {
      e.preventDefault();
      if (incomingImages.length > 0) {
        setPickerFrameIndex(index);
        setPickerActiveIndex(0);
        setShowImagePicker(true);
      }
    }

    if (e.key === "Escape" && showImagePicker) {
      setShowImagePicker(false);
    }
  }, [incomingImages.length, showImagePicker]);

  // 生成分镜
  const handleGenerate = useCallback(async () => {
    if (frames.every((f) => !f.description.trim())) {
      setError("请填写至少一个分镜描述");
      return;
    }

    const apiKey = providerConfigs[selectedProvider]?.apiKey;
    if (!apiKey) {
      setError("请先在设置中配置 API Key");
      return;
    }

    setIsGenerating(true);
    setError(null);
    updateCell(id, { status: "generating", prompt: buildPrompt(), aiProvider: selectedProvider, aiModel: selectedModel });

    try {
      const finalPrompt = buildPrompt();

      const result = await createGenerationTask({
        provider: selectedProvider,
        model: selectedModel,
        prompt: finalPrompt,
        width: 1024,
        height: 1024,
      });

      if (result.status === "completed" && result.task_id) {
        updateCell(id, { status: "completed" });

        // 创建切割节点
        const newNodeId = generateId();
        const newNodePosition = {
          x: (data.position?.x || 0) + (data.size?.width || 380) + 50,
          y: data.position?.y || 0,
        };

        addNodes({
          id: newNodeId,
          type: "storyboardNode",
          position: newNodePosition,
          data: {
            id: newNodeId,
            projectId: data.projectId,
            cellType: "storyboard",
            status: "completed",
            imageUrl: result.images?.[0]?.url || "",
            size: { width: 400, height: 300 },
            position: newNodePosition,
            prompt: `分镜切割 - ${gridRows}×${gridCols}`,
          },
          style: { width: 400, height: 300 },
        });

        addEdges({
          id: generateId(),
          source: id,
          target: newNodeId,
          type: "smoothstep",
          animated: true,
          style: { stroke: "#3b82f6", strokeWidth: 2 },
        });
      } else if (result.task_id) {
        const pollResult = await pollTaskResult(selectedProvider, result.task_id);
        if (pollResult.images.length > 0) {
          updateCell(id, { status: "completed", imageUrl: pollResult.images[0].url });

          // 创建切割节点
          const newNodeId = generateId();
          const newNodePosition = {
            x: (data.position?.x || 0) + (data.size?.width || 380) + 50,
            y: data.position?.y || 0,
          };

          addNodes({
            id: newNodeId,
            type: "storyboardNode",
            position: newNodePosition,
            data: {
              id: newNodeId,
              projectId: data.projectId,
              cellType: "storyboard",
              status: "completed",
              imageUrl: pollResult.images[0].url,
              size: { width: 400, height: 300 },
              position: newNodePosition,
              prompt: `分镜切割 - ${gridRows}×${gridCols}`,
            },
            style: { width: 400, height: 300 },
          });

          addEdges({
            id: generateId(),
            source: id,
            target: newNodeId,
            type: "smoothstep",
            animated: true,
            style: { stroke: "#3b82f6", strokeWidth: 2 },
          });
        } else {
          updateCell(id, { status: "error" });
        }
      }
    } catch (err) {
      console.error("Storyboard generation failed:", err);
      updateCell(id, { status: "error" });
      setError(err instanceof Error ? err.message : "生成失败");
    } finally {
      setIsGenerating(false);
    }
  }, [id, selectedProvider, selectedModel, gridRows, gridCols, frames, totalFrames, providerConfigs, data, updateCell, addNodes, addEdges, buildPrompt]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: "var(--node-radius)",
        background: "var(--ui-surface-panel)",
        border: `1px solid ${selected ? "var(--accent)" : "var(--ui-border-soft)"}`,
        boxShadow: selected
          ? "0 0 0 2px rgba(var(--accent-rgb), 0.2), 0 4px 12px rgba(0,0,0,0.1)"
          : "0 2px 6px rgba(0,0,0,0.06)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <Handle type="target" position={Position.Left} style={{ width: 8, height: 8, background: "var(--accent)", border: "2px solid white" }} />
      <Handle type="source" position={Position.Right} style={{ width: 8, height: 8, background: "var(--accent)", border: "2px solid white" }} />

      {/* Header */}
      <div style={{ padding: "12px 16px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{
            width: "20px",
            height: "20px",
            borderRadius: "6px",
            background: "linear-gradient(135deg, #ec4899, #be185d)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.5">
              <rect x="2" y="2" width="5" height="5" rx="1" />
              <rect x="9" y="2" width="5" height="5" rx="1" />
              <rect x="2" y="9" width="5" height="5" rx="1" />
              <rect x="9" y="9" width="5" height="5" rx="1" />
            </svg>
          </div>
          <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--text)" }}>分镜生成</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {incomingImages.length > 0 && (
            <span style={{ fontSize: "10px", color: "var(--accent)", padding: "2px 6px", background: "rgba(var(--accent-rgb), 0.1)", borderRadius: "4px" }}>
              {incomingImages.length}张参考图
            </span>
          )}
          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>¥0.43/次</span>
        </div>
      </div>

      {/* Grid Controls */}
      <div style={{ padding: "0 16px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* Rows */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>行</span>
            <button onClick={() => setGridRows(Math.max(1, gridRows - 1))} style={{ width: "20px", height: "20px", borderRadius: "4px", border: "1px solid var(--ui-border-soft)", background: "var(--ui-surface-field)", cursor: "pointer", fontSize: "12px", color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>-</button>
            <span style={{ fontSize: "13px", fontWeight: 500, minWidth: "20px", textAlign: "center" }}>{gridRows}</span>
            <button onClick={() => setGridRows(Math.min(6, gridRows + 1))} style={{ width: "20px", height: "20px", borderRadius: "4px", border: "1px solid var(--ui-border-soft)", background: "var(--ui-surface-field)", cursor: "pointer", fontSize: "12px", color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
          </div>

          {/* Cols */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>列</span>
            <button onClick={() => setGridCols(Math.max(1, gridCols - 1))} style={{ width: "20px", height: "20px", borderRadius: "4px", border: "1px solid var(--ui-border-soft)", background: "var(--ui-surface-field)", cursor: "pointer", fontSize: "12px", color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>-</button>
            <span style={{ fontSize: "13px", fontWeight: 500, minWidth: "20px", textAlign: "center" }}>{gridCols}</span>
            <button onClick={() => setGridCols(Math.min(6, gridCols + 1))} style={{ width: "20px", height: "20px", borderRadius: "4px", border: "1px solid var(--ui-border-soft)", background: "var(--ui-surface-field)", cursor: "pointer", fontSize: "12px", color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
          </div>
        </div>

        <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{totalFrames}格</span>
      </div>

      {/* Frame Grid */}
      <div style={{ flex: 1, padding: "0 16px 12px", overflow: "auto" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
            gap: "2px",
            background: "var(--ui-surface-field)",
            borderRadius: "8px",
            padding: "8px",
          }}
        >
          {frames.map((frame, index) => (
            <div
              key={frame.id}
              style={{
                aspectRatio: "1.4",
                background: "var(--ui-surface-panel)",
                borderRadius: "6px",
                padding: "10px",
                display: "flex",
                flexDirection: "column",
                position: "relative",
                border: pickerFrameIndex === index ? "1px solid var(--accent)" : "1px solid transparent",
              }}
            >
              {/* 描述显示/输入 */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                <textarea
                  value={frame.description}
                  onChange={(e) => {
                    const newFrames = [...frames];
                    newFrames[index] = { ...frame, description: e.target.value };
                    setFrames(newFrames);
                  }}
                  onKeyDown={(e) => handleFrameKeyDown(index, e)}
                  placeholder={`分镜 ${String(index + 1).padStart(2, "0")} 描述`}
                  style={{
                    width: "100%",
                    height: "100%",
                    resize: "none",
                    border: "none",
                    background: "transparent",
                    fontSize: "11px",
                    lineHeight: "1.5",
                    color: "var(--text)",
                    outline: "none",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Image Picker */}
      {showImagePicker && pickerFrameIndex !== null && (
        <div
          style={{
            position: "absolute",
            bottom: "140px",
            left: "16px",
            width: "160px",
            background: "var(--ui-surface-panel)",
            border: "1px solid var(--ui-border-soft)",
            borderRadius: "var(--ui-radius-lg)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
            zIndex: 100,
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "6px 10px", fontSize: "10px", color: "var(--text-muted)", borderBottom: "1px solid var(--ui-border-soft)" }}>
            选择参考图
          </div>
          {incomingImages.map((img, index) => (
            <button
              key={index}
              onClick={() => insertAtReference(pickerFrameIndex, index)}
              style={{
                width: "100%",
                padding: "8px 10px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                border: "none",
                background: pickerActiveIndex === index ? "var(--ui-surface-field)" : "transparent",
                cursor: "pointer",
                textAlign: "left",
              }}
              onMouseEnter={() => setPickerActiveIndex(index)}
            >
              <img src={img} alt="" style={{ width: "32px", height: "32px", objectFit: "cover", borderRadius: "4px" }} />
              <span style={{ fontSize: "12px", color: "var(--text)" }}>图{index + 1}</span>
            </button>
          ))}
          <div style={{ padding: "6px 10px", fontSize: "10px", color: "var(--text-muted)", borderTop: "1px solid var(--ui-border-soft)" }}>
            Esc 关闭
          </div>
        </div>
      )}

      {/* Bottom Controls */}
      <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: "8px", borderTop: "1px solid var(--ui-border-soft)" }}>
        {/* Model selector */}
        <select
          value={`${selectedProvider}-${selectedModel}`}
          onChange={(e) => {
            const [provider, model] = e.target.value.split("-");
            setSelectedProvider(provider as ProviderId);
            setSelectedModel(model);
          }}
          style={{
            padding: "6px 10px",
            background: "var(--ui-surface-field)",
            border: "1px solid var(--ui-border-soft)",
            borderRadius: "var(--ui-radius-lg)",
            fontSize: "11px",
            color: "var(--text)",
            cursor: "pointer",
            outline: "none",
            minWidth: "140px",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {models.map((m) => (
            <option key={m.id} value={`${selectedProvider}-${m.id}`}>{m.name}</option>
          ))}
        </select>

        {/* Aspect Ratio */}
        <select
          value={selectedAspectRatio}
          onChange={(e) => setSelectedAspectRatio(e.target.value)}
          style={{
            padding: "6px 10px",
            background: "var(--ui-surface-field)",
            border: "1px solid var(--ui-border-soft)",
            borderRadius: "var(--ui-radius-lg)",
            fontSize: "11px",
            color: "var(--text)",
            cursor: "pointer",
            outline: "none",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <option value="auto">自动</option>
          <option value="1:1">1:1</option>
          <option value="16:9">16:9</option>
          <option value="9:16">9:16</option>
          <option value="4:3">4:3</option>
          <option value="3:4">3:4</option>
        </select>

        {/* Resolution */}
        <select
          value={selectedSize}
          onChange={(e) => setSelectedSize(e.target.value as "1K" | "2K" | "4K")}
          style={{
            padding: "6px 10px",
            background: "var(--ui-surface-field)",
            border: "1px solid var(--ui-border-soft)",
            borderRadius: "var(--ui-radius-lg)",
            fontSize: "11px",
            color: "var(--text)",
            cursor: "pointer",
            outline: "none",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <option value="1K">1K</option>
          <option value="2K">2K</option>
          <option value="4K">4K</option>
        </select>

        {/* Other params button */}
        <button
          style={{
            padding: "6px 10px",
            background: "var(--ui-surface-field)",
            border: "1px solid var(--ui-border-soft)",
            borderRadius: "var(--ui-radius-lg)",
            fontSize: "11px",
            color: "var(--text-muted)",
            cursor: "pointer",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          其他参数
        </button>

        {/* Generate button */}
        <button
          onClick={(e) => { e.stopPropagation(); handleGenerate(); }}
          disabled={isGenerating}
          style={{
            marginLeft: "auto",
            padding: "8px 16px",
            fontSize: "12px",
            fontWeight: 500,
            color: "white",
            background: isGenerating ? "var(--text-muted)" : "var(--accent)",
            border: "none",
            borderRadius: "var(--ui-radius-lg)",
            cursor: isGenerating ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          {isGenerating ? (
            <div style={{ width: "12px", height: "12px", border: "2px solid white", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
          ) : (
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M8 2L14 12H2L8 2Z" fill="currentColor" />
              <circle cx="8" cy="9" r="2" fill="white" />
            </svg>
          )}
          {isGenerating ? "生成中..." : "生成"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: "8px 16px", fontSize: "11px", color: "var(--danger)" }}>
          {error}
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
});

StoryboardGenNode.displayName = "StoryboardGenNode";
