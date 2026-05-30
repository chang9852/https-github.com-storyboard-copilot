export type { AnnotationItem, AnnotationOptions, AnnotationToolType, RectAnnotation, EllipseAnnotation, ArrowAnnotation, PenAnnotation, TextAnnotation } from './types';
export { normalizeAnnotationRect, parseAnnotationItems, stringifyAnnotationItems, createAnnotationId } from './codec';
export { drawAnnotations } from './draw';