import type { NodeTypes } from "@xyflow/react";
import { ImageNode } from "./ImageNode";
import { StoryboardGenNode } from "./StoryboardGenNode";
import { StoryboardNode } from "./StoryboardNode";
import { UploadNode } from "./UploadNode";
import { TextAnnotationNode } from "./TextAnnotationNode";
import { GroupNode } from "./GroupNode";
import { ImageEditNode } from "./ImageEditNode";
import { CANVAS_NODE_TYPES } from "../domain/canvasNodes";

export const nodeTypes: NodeTypes = {
  [CANVAS_NODE_TYPES.upload]: UploadNode,
  [CANVAS_NODE_TYPES.imageEdit]: ImageEditNode,
  [CANVAS_NODE_TYPES.exportImage]: ImageNode,
  [CANVAS_NODE_TYPES.textAnnotation]: TextAnnotationNode,
  [CANVAS_NODE_TYPES.group]: GroupNode,
  [CANVAS_NODE_TYPES.storyboardSplit]: StoryboardNode,
  [CANVAS_NODE_TYPES.storyboardGen]: StoryboardGenNode,
};
