import {
  NODE_TOOL_TYPES,
  type NodeToolType,
  type StoryboardFrameItem,
} from '../domain/canvasNodes';
import {
  canvasToDataUrl,
  detectAspectRatio,
  loadImageElement,
  parseAspectRatio,
  persistImageLocally,
} from './imageData';
import { cropImageSource, readStoryboardImageMetadata } from '@/commands/image';
import type {
  IdGenerator,
  ImageSplitGateway,
  ToolProcessor,
  ToolProcessorResult,
} from './ports';
import { drawAnnotations, parseAnnotationItems } from '../tools/annotation';

export class CanvasToolProcessor implements ToolProcessor {
  constructor(
    private readonly splitGateway: ImageSplitGateway,
    private readonly idGenerator: IdGenerator
  ) {}

  async process(
    toolType: NodeToolType,
    sourceImageUrl: string,
    options: Record<string, unknown>
  ): Promise<ToolProcessorResult> {
    if (toolType === NODE_TOOL_TYPES.splitStoryboard) {
      const metadata = await this.readStoryboardMetadata(sourceImageUrl);
      return await this.splitStoryboard(
        sourceImageUrl,
        Number(options.rows ?? metadata?.gridRows ?? 3),
        Number(options.cols ?? metadata?.gridCols ?? 3),
        Number(options.lineThicknessPercent),
        Number(options.lineThickness ?? 0),
        metadata?.frameNotes
      );
    }

    switch (toolType) {
      case NODE_TOOL_TYPES.crop:
        return {
          outputImageUrl: await this.cropImage(sourceImageUrl, options),
        };
      case NODE_TOOL_TYPES.annotate:
        return {
          outputImageUrl: await this.annotateImage(
            await persistImageLocally(sourceImageUrl),
            options
          ),
        };
      default:
        throw new Error('Unsupported tool type');
    }
  }

  private async cropImage(sourceImage: string, options: Record<string, unknown>): Promise<string> {
    try {
      return await cropImageSource({
        source: sourceImage,
        aspectRatio: String(options.aspectRatio ?? '1:1'),
        cropX: Number(options.cropX),
        cropY: Number(options.cropY),
        cropWidth: Number(options.cropWidth),
        cropHeight: Number(options.cropHeight),
      });
    } catch {
      // Fallback to local canvas implementation
    }

    const aspectRatio = String(options.aspectRatio ?? '1:1');
    const targetRatio = parseAspectRatio(aspectRatio);
    const image = await loadImageElement(sourceImage);

    const cropX = Number(options.cropX);
    const cropY = Number(options.cropY);
    const cropWidthOption = Number(options.cropWidth);
    const cropHeightOption = Number(options.cropHeight);

    const hasManualCropArea =
      Number.isFinite(cropX) &&
      Number.isFinite(cropY) &&
      Number.isFinite(cropWidthOption) &&
      Number.isFinite(cropHeightOption) &&
      cropWidthOption > 0 &&
      cropHeightOption > 0;

    let cropWidth = image.naturalWidth;
    let cropHeight = image.naturalHeight;
    let offsetX = 0;
    let offsetY = 0;

    if (hasManualCropArea) {
      offsetX = Math.min(image.naturalWidth - 1, Math.max(0, Math.floor(cropX)));
      offsetY = Math.min(image.naturalHeight - 1, Math.max(0, Math.floor(cropY)));
      cropWidth = Math.max(1, Math.min(Math.floor(cropWidthOption), image.naturalWidth - offsetX));
      cropHeight = Math.max(1, Math.min(Math.floor(cropHeightOption), image.naturalHeight - offsetY));
    } else if (aspectRatio === 'free') {
      offsetX = 0;
      offsetY = 0;
      cropWidth = image.naturalWidth;
      cropHeight = image.naturalHeight;
    } else {
      const sourceRatio = image.naturalWidth / image.naturalHeight;
      if (sourceRatio > targetRatio) {
        cropWidth = image.naturalHeight * targetRatio;
      } else {
        cropHeight = image.naturalWidth / targetRatio;
      }
      offsetX = (image.naturalWidth - cropWidth) / 2;
      offsetY = (image.naturalHeight - cropHeight) / 2;
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(cropWidth));
    canvas.height = Math.max(1, Math.floor(cropHeight));

    const context = canvas.getContext('2d');
    if (!context) throw new Error('Cannot initialize canvas');

    context.drawImage(
      image,
      offsetX,
      offsetY,
      cropWidth,
      cropHeight,
      0,
      0,
      canvas.width,
      canvas.height
    );

    return canvasToDataUrl(canvas);
  }

  private async annotateImage(
    sourceImage: string,
    options: Record<string, unknown>
  ): Promise<string> {
    const image = await loadImageElement(sourceImage);
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    const context = canvas.getContext('2d');
    if (!context) throw new Error('Cannot initialize canvas');

    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const annotationsRaw = options.annotations;
    const items = parseAnnotationItems(annotationsRaw);
    if (items.length > 0) {
      drawAnnotations(context, items);
    }

    return canvasToDataUrl(canvas);
  }

  private async splitStoryboard(
    sourceImage: string,
    rows: number,
    cols: number,
    lineThicknessPercent: number,
    lineThicknessPxFallback: number,
    frameNotes?: string[]
  ): Promise<ToolProcessorResult> {
    const normalizedRows = Number.isFinite(rows) ? rows : 3;
    const normalizedCols = Number.isFinite(cols) ? cols : 3;
    const normalizedLineThicknessPercent = Number.isFinite(lineThicknessPercent)
      ? lineThicknessPercent
      : NaN;
    const normalizedLineThicknessPxFallback = Number.isFinite(lineThicknessPxFallback)
      ? lineThicknessPxFallback
      : 0;

    const safeRows = Math.max(1, Math.floor(normalizedRows));
    const safeCols = Math.max(1, Math.floor(normalizedCols));
    const safeLineThickness = await this.resolveSplitLineThicknessPx(
      sourceImage,
      safeRows,
      safeCols,
      normalizedLineThicknessPercent,
      normalizedLineThicknessPxFallback
    );

    if (safeRows <= 0 || safeCols <= 0) {
      throw new Error('Rows and cols must be greater than 0');
    }

    let outputs: string[];
    try {
      outputs = await this.splitGateway.split(
        sourceImage,
        safeRows,
        safeCols,
        safeLineThickness
      );
    } catch {
      outputs = await this.localSplit(sourceImage, safeRows, safeCols, safeLineThickness);
    }

    const persistedFrameImages = await Promise.all(
      outputs.map(async (imageUrl) => await persistImageLocally(imageUrl))
    );

    let frameAspectRatio: string | undefined;
    const firstFrameImage = persistedFrameImages[0];
    if (firstFrameImage) {
      try {
        frameAspectRatio = await detectAspectRatio(firstFrameImage);
      } catch {
        frameAspectRatio = undefined;
      }
    }

    const resolvedFrameAspectRatio = frameAspectRatio ?? `${safeCols}:${safeRows}`;
    const frames: StoryboardFrameItem[] = persistedFrameImages.map((imageUrl, index) => ({
      id: this.idGenerator.next(),
      imageUrl,
      previewImageUrl: imageUrl,
      aspectRatio: resolvedFrameAspectRatio,
      note: typeof frameNotes?.[index] === 'string' ? frameNotes[index].trim() : '',
      order: index,
    }));

    return {
      storyboardFrames: frames,
      rows: safeRows,
      cols: safeCols,
      frameAspectRatio: resolvedFrameAspectRatio,
    };
  }

  private resolveMaxAllowedLineThickness(
    imageWidth: number,
    imageHeight: number,
    rows: number,
    cols: number
  ): number {
    const maxLineByWidth = cols > 1 ? Math.floor((imageWidth - cols) / (cols - 1)) : Number.MAX_SAFE_INTEGER;
    const maxLineByHeight = rows > 1 ? Math.floor((imageHeight - rows) / (rows - 1)) : Number.MAX_SAFE_INTEGER;
    return Math.max(0, Math.min(maxLineByWidth, maxLineByHeight));
  }

  private async resolveSplitLineThicknessPx(
    sourceImage: string,
    rows: number,
    cols: number,
    lineThicknessPercent: number,
    lineThicknessPxFallback: number
  ): Promise<number> {
    if (!Number.isFinite(lineThicknessPercent)) {
      return Math.max(0, Math.floor(lineThicknessPxFallback));
    }

    const normalizedPercent = Math.max(0, lineThicknessPercent);
    if (normalizedPercent <= 0) return 0;

    const image = await loadImageElement(sourceImage);
    const imageWidth = Math.max(1, image.naturalWidth);
    const imageHeight = Math.max(1, image.naturalHeight);
    const basis = Math.max(1, Math.min(imageWidth, imageHeight));
    const rawPixelThickness = Math.max(1, Math.round((basis * normalizedPercent) / 100));
    const maxAllowedThickness = this.resolveMaxAllowedLineThickness(imageWidth, imageHeight, rows, cols);
    return Math.max(0, Math.min(rawPixelThickness, maxAllowedThickness));
  }

  private async readStoryboardMetadata(
    sourceImage: string
  ): Promise<{ gridRows: number; gridCols: number; frameNotes: string[] } | null> {
    try {
      const metadata = await readStoryboardImageMetadata(sourceImage);
      if (!metadata) return null;
      return {
        gridRows: metadata.gridRows,
        gridCols: metadata.gridCols,
        frameNotes: Array.isArray(metadata.frameNotes) ? metadata.frameNotes : [],
      };
    } catch {
      return null;
    }
  }

  private splitIntoSegments(totalSize: number, segmentCount: number): number[] {
    const baseSize = Math.floor(totalSize / segmentCount);
    const remainder = totalSize % segmentCount;
    return Array.from(
      { length: segmentCount },
      (_item, index) => baseSize + (index < remainder ? 1 : 0)
    );
  }

  private async localSplit(
    sourceImage: string,
    rows: number,
    cols: number,
    lineThickness: number
  ): Promise<string[]> {
    const image = await loadImageElement(sourceImage);

    const maxAllowedLine = this.resolveMaxAllowedLineThickness(
      image.naturalWidth,
      image.naturalHeight,
      rows,
      cols
    );
    const resolvedLineThickness = Math.min(Math.max(0, lineThickness), maxAllowedLine);

    const usableWidth = image.naturalWidth - (cols - 1) * resolvedLineThickness;
    const usableHeight = image.naturalHeight - (rows - 1) * resolvedLineThickness;

    if (usableWidth < cols || usableHeight < rows) {
      throw new Error('Line too thick to split');
    }

    const columnWidths = this.splitIntoSegments(usableWidth, cols);
    const rowHeights = this.splitIntoSegments(usableHeight, rows);

    const results: string[] = [];

    const yOffsets: number[] = [];
    let yCursor = 0;
    for (let row = 0; row < rows; row += 1) {
      yOffsets.push(yCursor);
      yCursor += rowHeights[row];
      if (row < rows - 1) yCursor += resolvedLineThickness;
    }

    const xOffsets: number[] = [];
    let xCursor = 0;
    for (let col = 0; col < cols; col += 1) {
      xOffsets.push(xCursor);
      xCursor += columnWidths[col];
      if (col < cols - 1) xCursor += resolvedLineThickness;
    }

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const targetWidth = columnWidths[col];
        const targetHeight = rowHeights[row];

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const context = canvas.getContext('2d');
        if (!context) throw new Error('Cannot initialize canvas');

        context.drawImage(
          image,
          xOffsets[col],
          yOffsets[row],
          targetWidth,
          targetHeight,
          0,
          0,
          targetWidth,
          targetHeight
        );
        results.push(canvasToDataUrl(canvas));
      }
    }

    return results;
  }
}
