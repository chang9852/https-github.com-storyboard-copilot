import type { CanvasToolPlugin, ToolFieldSchema } from "./types";
import { registerTool } from "./registry";
import i18n from "@/i18n";

// Crop Tool
const cropToolPlugin: CanvasToolPlugin = {
  type: "crop",
  label: i18n.t('toolDef.crop'),
  icon: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 2v10h10M2 4h10v10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  editorKind: "modal",
  fieldSchemas: [
    {
      key: "aspectRatio",
      label: i18n.t('toolDef.aspectRatio'),
      type: "select",
      defaultValue: "free",
      options: [
        { value: "free", label: i18n.t('toolDef.free') },
        { value: "1:1", label: "1:1" },
        { value: "16:9", label: "16:9" },
        { value: "9:16", label: "9:16" },
        { value: "4:3", label: "4:3" },
        { value: "3:4", label: "3:4" },
      ],
    },
    {
      key: "quality",
      label: i18n.t('toolDef.quality'),
      type: "number",
      defaultValue: 90,
      min: 1,
      max: 100,
      step: 10,
    },
  ] as ToolFieldSchema[],
  execute: async (params) => {
    const { imageUrl, fields } = params;
    const aspectRatio = fields.aspectRatio as string;
    const quality = fields.quality as number;

    try {
      const img = new Image();
      img.crossOrigin = "anonymous";

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = imageUrl;
      });

      const canvas = document.createElement("canvas");
      let { width, height } = img;

      // Apply aspect ratio
      if (aspectRatio !== "free") {
        const [w, h] = aspectRatio.split(":").map(Number);
        const targetRatio = w / h;
        const currentRatio = width / height;

        if (currentRatio > targetRatio) {
          width = height * targetRatio;
        } else {
          height = width / targetRatio;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return { success: false, error: "Failed to get canvas context" };
      }

      // Center crop
      const sx = (img.width - width) / 2;
      const sy = (img.height - height) / 2;
      ctx.drawImage(img, sx, sy, width, height, 0, 0, width, height);

      const resultUrl = canvas.toDataURL("image/png", quality / 100);
      return { success: true, imageUrl: resultUrl };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : i18n.t('toolDef.cropFailed'),
      };
    }
  },
};

// Annotate Tool
const annotateToolPlugin: CanvasToolPlugin = {
  type: "annotate",
  label: i18n.t('toolDef.annotate'),
  icon: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 14l3-1 8-8-2-2-8 8-1 3z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 4l2 2" strokeLinecap="round" />
    </svg>
  ),
  editorKind: "inline",
  fieldSchemas: [
    {
      key: "color",
      label: i18n.t('toolDef.color'),
      type: "color",
      defaultValue: "#ff4d4f",
    },
    {
      key: "lineWidthPercent",
      label: i18n.t('toolDef.lineWidth'),
      type: "number",
      defaultValue: 0.4,
      min: 0.1,
      max: 3,
      step: 0.1,
    },
    {
      key: "fontSizePercent",
      label: i18n.t('toolDef.fontSize'),
      type: "number",
      defaultValue: 10,
      min: 1,
      max: 30,
      step: 0.5,
    },
    {
      key: "annotations",
      label: i18n.t('toolDef.annotateData'),
      type: "text",
      defaultValue: "[]",
    },
  ] as ToolFieldSchema[],
  execute: async (params) => {
    // Annotation is handled by the frontend canvas
    // This is a placeholder for backend processing if needed
    return { success: true, imageUrl: params.imageUrl };
  },
};

// Split Storyboard Tool
const splitStoryboardToolPlugin: CanvasToolPlugin = {
  type: "split-storyboard",
  label: i18n.t('toolDef.storyboardSplit'),
  icon: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="2" width="12" height="12" rx="1" />
      <path d="M2 6h12M6 2v12" />
    </svg>
  ),
  editorKind: "panel",
  fieldSchemas: [
    {
      key: "rows",
      label: i18n.t('toolDef.rows'),
      type: "number",
      defaultValue: 2,
      min: 1,
      max: 6,
      step: 1,
    },
    {
      key: "cols",
      label: i18n.t('toolDef.cols'),
      type: "number",
      defaultValue: 3,
      min: 1,
      max: 6,
      step: 1,
    },
    {
      key: "gap",
      label: i18n.t('toolDef.gap'),
      type: "number",
      defaultValue: 4,
      min: 0,
      max: 20,
      step: 2,
    },
    {
      key: "backgroundColor",
      label: i18n.t('toolDef.bgColor'),
      type: "color",
      defaultValue: "#000000",
    },
  ] as ToolFieldSchema[],
  execute: async (params) => {
    const { imageUrl, fields } = params;
    const rows = fields.rows as number;
    const cols = fields.cols as number;
    const gap = fields.gap as number;
    const backgroundColor = fields.backgroundColor as string;

    try {
      const img = new Image();
      img.crossOrigin = "anonymous";

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = imageUrl;
      });

      const cellWidth = (img.width - gap * (cols + 1)) / cols;
      const cellHeight = (img.height - gap * (rows + 1)) / rows;

      const cells: string[] = [];

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const canvas = document.createElement("canvas");
          canvas.width = cellWidth;
          canvas.height = cellHeight;

          const ctx = canvas.getContext("2d");
          if (!ctx) continue;

          // Fill background
          ctx.fillStyle = backgroundColor;
          ctx.fillRect(0, 0, cellWidth, cellHeight);

          // Draw cell
          const sx = gap + col * (cellWidth + gap);
          const sy = gap + row * (cellHeight + gap);
          ctx.drawImage(img, sx, sy, cellWidth, cellHeight, 0, 0, cellWidth, cellHeight);

          cells.push(canvas.toDataURL("image/png"));
        }
      }

      return { success: true, imageUrls: cells };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : i18n.t('toolDef.splitFailed'),
      };
    }
  },
};

// Register all built-in tools
export function registerBuiltInTools(): void {
  registerTool(cropToolPlugin);
  registerTool(annotateToolPlugin);
  registerTool(splitStoryboardToolPlugin);
}

// Auto-register on import
registerBuiltInTools();
