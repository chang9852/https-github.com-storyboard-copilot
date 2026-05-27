import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useProjectStore } from "@/stores/projectStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useCanvasStore } from "@/stores/canvasStore";
import { PROVIDERS, getModelsByProvider, createGenerationTask, pollTaskResult } from "@/services/ai";
import type { ProviderId } from "@/types/ai";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

type PanelType = "image" | "upload" | null;
type ImageMode = "txt2img" | "img2img";

export function CanvasToolbar() {
  const { t } = useTranslation();
  const { currentProject, addCell } = useProjectStore();
  const { providerConfigs } = useSettingsStore();
  const { fitToScreen } = useCanvasStore();
  const [showMenu, setShowMenu] = useState(false);
  const [activePanel, setActivePanel] = useState<PanelType>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const refImageInputRef = useRef<HTMLInputElement>(null);

  const [imageMode, setImageMode] = useState<ImageMode>("txt2img");
  const [imagePrompt, setImagePrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [refImageUrl, setRefImageUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [provider, setProvider] = useState<ProviderId>("kie");
  const [model, setModel] = useState("nano-banana-pro");

  const getNewCellPosition = () => {
    const cells = currentProject?.cells || [];
    const count = cells.length;
    const cols = 4;
    const spacingX = 340;
    const spacingY = 260;
    const col = count % cols;
    const row = Math.floor(count / cols);
    return { x: 50 + col * spacingX, y: 50 + row * spacingY };
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && menuRef.current.contains(e.target as Node)) return;
      setShowMenu(false);
      setActivePanel(null);
    };
    if (showMenu || activePanel) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu, activePanel]);

  const handleGenerateImage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentProject || !imagePrompt.trim()) return;

    const apiKey = providerConfigs[provider]?.apiKey;
    if (!apiKey) {
      alert(t("ai.no_api_key"));
      return;
    }

    setIsGenerating(true);
    const pos = getNewCellPosition();
    const cellId = generateId();
    addCell({
      id: cellId, projectId: currentProject.id, position: pos,
      size: { width: 320, height: 280 }, prompt: imagePrompt, negativePrompt,
      status: "generating", aiProvider: provider, aiModel: model,
    });

    try {
      const result = await createGenerationTask({
        provider,
        model,
        prompt: imagePrompt,
        negativePrompt: negativePrompt || undefined,
        width: 1024,
        height: 1024,
      });

      if (result.status === "completed" && result.task_id) {
        const { updateCell } = useProjectStore.getState();
        updateCell(cellId, { status: "completed" });
      } else if (result.task_id) {
        const pollResult = await pollTaskResult(provider, result.task_id);
        const { updateCell } = useProjectStore.getState();
        if (pollResult.images.length > 0) {
          updateCell(cellId, { status: "completed", imageUrl: pollResult.images[0].url });
        } else {
          updateCell(cellId, { status: "error" });
        }
      }
    } catch (err) {
      console.error("Generation failed:", err);
      const { updateCell } = useProjectStore.getState();
      updateCell(cellId, { status: "error" });
    } finally {
      setIsGenerating(false);
    }

    setImagePrompt(""); setNegativePrompt(""); setRefImageUrl(""); setActivePanel(null); setShowMenu(false);
  };

  const handleGenerateFromImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentProject || !refImageUrl.trim()) return;
    setIsGenerating(true);
    const pos = getNewCellPosition();
    const cellId = generateId();
    addCell({
      id: cellId, projectId: currentProject.id, position: pos,
      size: { width: 320, height: 280 }, prompt: imagePrompt || "图生图",
      status: "generating", aiProvider: provider, aiModel: model,
    });
    setTimeout(() => {
      const { updateCell } = useProjectStore.getState();
      updateCell(cellId, { status: "completed", imageUrl: refImageUrl });
      setIsGenerating(false);
    }, 2000);
    setImagePrompt(""); setRefImageUrl(""); setActivePanel(null); setShowMenu(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !currentProject) return;
    Array.from(files).forEach((file, i) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const pos = getNewCellPosition();
        addCell({ id: generateId(), projectId: currentProject.id, position: { x: pos.x + i * 30, y: pos.y + i * 30 }, size: { width: 320, height: 280 }, imageUrl: event.target?.result as string, status: "idle" });
      };
      reader.readAsDataURL(file);
    });
    setActivePanel(null); setShowMenu(false);
  };

  const tools = [
    { id: "image" as PanelType, label: "图像生成", desc: "AI 生成图片" },
    { id: "upload" as PanelType, label: "上传图片", desc: "本地图片上传" },
  ];

  return (
    <div ref={menuRef} className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40" onClick={(e) => e.stopPropagation()}>
      {/* Image Panel */}
      {activePanel === "image" && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-96 bg-surface-secondary border border-border rounded-xl p-4 shadow-lg">
          <div className="flex gap-1 p-1 bg-surface-primary rounded-lg mb-3">
            <button onClick={(e) => { e.stopPropagation(); setImageMode("txt2img"); }} className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${imageMode === "txt2img" ? "bg-accent text-white" : "text-text-secondary hover:text-text-primary"}`}>文本生成图片</button>
            <button onClick={(e) => { e.stopPropagation(); setImageMode("img2img"); }} className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${imageMode === "img2img" ? "bg-accent text-white" : "text-text-secondary hover:text-text-primary"}`}>图片生成图片</button>
          </div>
          {/* Provider/Model select */}
          <div className="flex gap-2 mb-3">
            <select value={provider} onChange={(e) => { e.stopPropagation(); setProvider(e.target.value as ProviderId); setModel(""); }}
              className="flex-1 px-2 py-1.5 text-xs bg-surface-primary text-text-primary border border-border rounded-lg outline-none"
              onClick={(e) => e.stopPropagation()}>
              {PROVIDERS.filter((p) => providerConfigs[p.id]?.enabled).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <select value={model} onChange={(e) => { e.stopPropagation(); setModel(e.target.value); }}
              className="flex-1 px-2 py-1.5 text-xs bg-surface-primary text-text-primary border border-border rounded-lg outline-none"
              onClick={(e) => e.stopPropagation()}>
              {getModelsByProvider(provider).map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <textarea className="w-full h-16 px-3 py-2 text-sm bg-surface-primary text-text-primary border border-border rounded-lg outline-none focus:border-accent resize-none" placeholder="输入 AI 提示词..." value={imagePrompt} onChange={(e) => setImagePrompt(e.target.value)} onClick={(e) => e.stopPropagation()} />
          <input type="text" className="w-full mt-2 px-3 py-2 text-sm bg-surface-primary text-text-primary border border-border rounded-lg outline-none focus:border-accent" placeholder="负面提示词（可选）..." value={negativePrompt} onChange={(e) => setNegativePrompt(e.target.value)} onClick={(e) => e.stopPropagation()} />
          {imageMode === "img2img" && (
            <div className="mt-3">
              <p className="text-xs text-text-secondary mb-2">参考图片</p>
              <div className="flex gap-2">
                <input type="text" className="flex-1 px-3 py-2 text-sm bg-surface-primary text-text-primary border border-border rounded-lg outline-none focus:border-accent" placeholder="图片 URL..." value={refImageUrl} onChange={(e) => setRefImageUrl(e.target.value)} onClick={(e) => e.stopPropagation()} />
                <button onClick={(e) => { e.stopPropagation(); refImageInputRef.current?.click(); }} className="px-3 py-2 text-sm bg-surface-tertiary text-text-primary rounded-lg hover:bg-border transition-colors">上传</button>
              </div>
              <input ref={refImageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onload = (ev) => setRefImageUrl(ev.target?.result as string); reader.readAsDataURL(file); } }} />
              {refImageUrl && <div className="mt-2 h-20 bg-surface-tertiary rounded-lg overflow-hidden"><img src={refImageUrl} alt="" className="w-full h-full object-contain" /></div>}
            </div>
          )}
          <button onClick={imageMode === "txt2img" ? handleGenerateImage : handleGenerateFromImage} disabled={isGenerating || (imageMode === "txt2img" ? !imagePrompt.trim() : !refImageUrl.trim())} className="w-full mt-3 py-2.5 text-sm font-medium bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
            {isGenerating ? (<><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />生成中...</>) : "生成图片"}
          </button>
        </div>
      )}

      {/* Upload Panel */}
      {activePanel === "upload" && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-72 bg-surface-secondary border border-border rounded-xl p-4 shadow-lg">
          <div onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} className="h-28 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-accent hover:bg-accent/5 transition-colors">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-muted mb-2"><path d="M12 16V4M8 8l4-4 4 4" strokeLinecap="round" strokeLinejoin="round" /><path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" /></svg>
            <p className="text-xs text-text-muted">点击上传图片</p>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileUpload} />
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-1 p-1.5 bg-surface-secondary border border-border rounded-xl shadow-lg">
        <button onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); setActivePanel(null); }}
          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${showMenu ? "bg-accent text-white rotate-45" : "bg-accent/10 text-accent hover:bg-accent hover:text-white"}`}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 3v12M3 9h12" strokeLinecap="round" /></svg>
        </button>
        <div className="w-px h-6 bg-border" />
        {/* Undo */}
        <button className="w-9 h-9 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-tertiary transition-colors">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 6h7a3 3 0 010 6H8" strokeLinecap="round" /><path d="M6 3L3 6l3 3" strokeLinecap="round" /></svg>
        </button>
        {/* Redo */}
        <button className="w-9 h-9 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-tertiary transition-colors">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M13 6H6a3 3 0 000 6h2" strokeLinecap="round" /><path d="M10 3l3 3-3 3" strokeLinecap="round" /></svg>
        </button>
        <div className="w-px h-6 bg-border" />
        {/* Fit to screen */}
        <button
          onClick={(e) => { e.stopPropagation(); fitToScreen(window.innerWidth - 48, window.innerHeight - 40); }}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-tertiary transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 5V2h3M11 2h3v3M14 11v3h-3M5 14H2v-3" strokeLinecap="round" /></svg>
        </button>
      </div>

      {/* Menu */}
      {showMenu && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-44 py-1.5 bg-surface-secondary border border-border rounded-xl overflow-hidden shadow-lg">
          {tools.map((tool) => (
            <button key={tool.id} onClick={(e) => { e.stopPropagation(); setActivePanel(activePanel === tool.id ? null : tool.id); setShowMenu(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${activePanel === tool.id ? "bg-accent/10 text-accent" : "text-text-primary hover:bg-surface-tertiary"}`}>
              <span className="w-6 h-6 rounded bg-surface-tertiary flex items-center justify-center text-[10px] font-bold text-text-secondary">{tool.label[0]}</span>
              <div className="text-left"><div className="font-medium text-xs">{tool.label}</div><div className="text-[10px] text-text-muted">{tool.desc}</div></div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
