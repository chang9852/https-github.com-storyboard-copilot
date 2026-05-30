import type { ReactNode } from "react";
import type { NodeToolType } from "../domain/canvasNodes";

export type ToolOptionPrimitive = string | number | boolean;
export type ToolOptions = Record<string, ToolOptionPrimitive>;

export interface ToolFieldSchema {
  key: string;
  label: string;
  type: "number" | "select" | "boolean" | "color" | "text";
  defaultValue: unknown;
  options?: Array<{ value: string | number; label: string }>;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
}

export interface CanvasToolPlugin {
  type: NodeToolType;
  label: string;
  icon: ReactNode;
  editorKind: "modal" | "inline" | "panel";
  fieldSchemas: ToolFieldSchema[];
  execute: (params: ToolExecuteParams) => Promise<ToolExecuteResult>;
}

export interface ToolExecuteParams {
  imageUrl: string;
  fields: Record<string, unknown>;
  nodeId: string;
}

export interface ToolExecuteResult {
  success: boolean;
  imageUrl?: string;
  imageUrls?: string[];
  error?: string;
}
