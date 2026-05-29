import type { AnnotationItem, AnnotationContext } from './types';

export function drawAnnotations(
  ctx: CanvasRenderingContext2D,
  items: AnnotationItem[],
  context: AnnotationContext
): void {
  const { canvasWidth, canvasHeight } = context;

  for (const item of items) {
    ctx.save();
    ctx.strokeStyle = item.color;
    ctx.fillStyle = item.color;
    ctx.lineWidth = item.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (item.type) {
      case 'arrow':
        drawArrow(ctx, item, canvasWidth, canvasHeight);
        break;
      case 'rect':
        drawRect(ctx, item, canvasWidth, canvasHeight);
        break;
      case 'circle':
        drawCircle(ctx, item, canvasWidth, canvasHeight);
        break;
      case 'text':
        drawText(ctx, item, canvasWidth, canvasHeight);
        break;
      case 'freehand':
        drawFreehand(ctx, item, canvasWidth, canvasHeight);
        break;
    }

    ctx.restore();
  }
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  item: AnnotationItem,
  canvasWidth: number,
  canvasHeight: number
): void {
  const x1 = item.x1 * canvasWidth;
  const y1 = item.y1 * canvasHeight;
  const x2 = item.x2 * canvasWidth;
  const y2 = item.y2 * canvasHeight;

  const headLen = Math.max(10, item.lineWidth * 3);
  const angle = Math.atan2(y2 - y1, x2 - x1);

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - headLen * Math.cos(angle - Math.PI / 6),
    y2 - headLen * Math.sin(angle - Math.PI / 6)
  );
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - headLen * Math.cos(angle + Math.PI / 6),
    y2 - headLen * Math.sin(angle + Math.PI / 6)
  );
  ctx.stroke();
}

function drawRect(
  ctx: CanvasRenderingContext2D,
  item: AnnotationItem,
  canvasWidth: number,
  canvasHeight: number
): void {
  const x1 = item.x1 * canvasWidth;
  const y1 = item.y1 * canvasHeight;
  const x2 = item.x2 * canvasWidth;
  const y2 = item.y2 * canvasHeight;

  const width = x2 - x1;
  const height = y2 - y1;

  ctx.strokeRect(x1, y1, width, height);
}

function drawCircle(
  ctx: CanvasRenderingContext2D,
  item: AnnotationItem,
  canvasWidth: number,
  canvasHeight: number
): void {
  const x1 = item.x1 * canvasWidth;
  const y1 = item.y1 * canvasHeight;
  const x2 = item.x2 * canvasWidth;
  const y2 = item.y2 * canvasHeight;

  const centerX = (x1 + x2) / 2;
  const centerY = (y1 + y2) / 2;
  const radiusX = Math.abs(x2 - x1) / 2;
  const radiusY = Math.abs(y2 - y1) / 2;

  ctx.beginPath();
  ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function drawText(
  ctx: CanvasRenderingContext2D,
  item: AnnotationItem,
  canvasWidth: number,
  canvasHeight: number
): void {
  const x = item.x1 * canvasWidth;
  const y = item.y1 * canvasHeight;
  const fontSize = item.fontSize || 16;

  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.fillText(item.text || '', x, y);
}

function drawFreehand(
  ctx: CanvasRenderingContext2D,
  item: AnnotationItem,
  canvasWidth: number,
  canvasHeight: number
): void {
  if (!item.points || item.points.length < 2) return;

  ctx.beginPath();
  const firstPoint = item.points[0];
  ctx.moveTo(firstPoint.x * canvasWidth, firstPoint.y * canvasHeight);

  for (let i = 1; i < item.points.length; i++) {
    const point = item.points[i];
    ctx.lineTo(point.x * canvasWidth, point.y * canvasHeight);
  }

  ctx.stroke();
}
