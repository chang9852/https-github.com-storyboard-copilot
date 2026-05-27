import type { NodeTypes } from "@xyflow/react";
import { ImageNode } from "./ImageNode";
import { TextNode } from "./TextNode";
import { StoryboardGenNode } from "./StoryboardGenNode";
import { StoryboardSplitNode } from "./StoryboardSplitNode";
import { UploadNode } from "./UploadNode";
import { TextAnnotationNode } from "./TextAnnotationNode";
import { GroupNode } from "./GroupNode";
import { ImageEditNode } from "./ImageEditNode";

export const nodeTypes: NodeTypes = {
  // Legacy node types (for backward compatibility)
  imageNode: ImageNode,
  textNode: TextNode,
  storyboardGenNode: StoryboardGenNode,
  storyboardNode: StoryboardSplitNode,

  // New node types (from domain registry)
  upload: UploadNode,
  imageEdit: ImageEditNode,
  exportImage: ImageNode,
  textAnnotation: TextAnnotationNode,
  group: GroupNode,
  storyboardSplit: StoryboardSplitNode,
  storyboardGen: StoryboardGenNode,
};
