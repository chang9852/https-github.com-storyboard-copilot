import type { CanvasToolPlugin } from "./types";
import type { NodeToolType } from "../domain/canvasNodes";

const toolRegistry = new Map<NodeToolType, CanvasToolPlugin>();

export function registerTool(tool: CanvasToolPlugin): void {
  toolRegistry.set(tool.type, tool);
}

export function getTool(type: NodeToolType): CanvasToolPlugin | undefined {
  return toolRegistry.get(type);
}

export function getAllTools(): CanvasToolPlugin[] {
  return Array.from(toolRegistry.values());
}

export function getToolTypes(): NodeToolType[] {
  return Array.from(toolRegistry.keys());
}
