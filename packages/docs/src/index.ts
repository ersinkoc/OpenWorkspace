/**
 * @openworkspace/docs
 * Google Docs API v1 service package for OpenWorkspace.
 * Zero-dependency -- uses HttpClient from @openworkspace/core.
 */

// Types
export type {
  Document,
  Body,
  StructuralElement,
  Paragraph,
  ParagraphElement,
  ParagraphStyle,
  TextRun,
  TextStyle,
  Table,
  TableRow,
  TableCell,
  SectionBreak,
  DocumentStyle,
  Tab,
  DocumentTab,
  DocumentTabsResponse,
  Request,
  InsertTextRequest,
  DeleteContentRangeRequest,
  ReplaceAllTextRequest,
  BatchUpdateRequest,
  BatchUpdateResponse,
  ExportFormat,
  DocsApi,
} from './types.js';

export { BASE_URL } from './types.js';

// Document operations
export { getDocument, createDocument, copyDocument, getDocumentTabs } from './documents.js';

// Content operations
export { readText, batchUpdate, insertText, deleteContent, replaceAllText } from './content.js';

// Export operations
export { exportDocument } from './export.js';

// Plugin & facade
export { createDocsApi, docs } from './plugin.js';
