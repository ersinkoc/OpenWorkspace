/**
 * @openworkspace/slides
 * Google Slides API v1 service package for OpenWorkspace.
 * Zero-dependency -- uses HttpClient from @openworkspace/core.
 */

// Types
export type {
  Presentation,
  Page,
  PageElement,
  Shape,
  Image,
  Video,
  Table,
  TextContent,
  TextElement,
  TextRun,
  TextStyle,
  ParagraphMarker,
  SlideProperties,
  Size,
  Dimension,
  AffineTransform,
  Color,
  RgbColor,
  Link,
  TableCellLocation,
  CreateSlideRequest,
  InsertTextRequest,
  ReplaceAllTextRequest,
  DeleteObjectRequest,
  UpdateShapePropertiesRequest,
  UpdateTextStyleRequest,
  Request,
  BatchUpdateRequest,
  BatchUpdateResponse,
  Response,
  ExportFormat,
  SlidesApi,
} from './types.js';

export { BASE_URL } from './types.js';

// Presentation operations
export { getPresentation, createPresentation, getSlide } from './presentations.js';

// Slide operations
export { batchUpdate, addSlide, deleteSlide, replaceAllText, updateSpeakerNotes } from './slide-ops.js';

// Export operations
export { exportPresentation } from './export.js';

// Plugin & facade
export { slides, slidesPlugin } from './plugin.js';
