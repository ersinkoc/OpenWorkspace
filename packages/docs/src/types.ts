/**
 * Type definitions for Google Docs API v1.
 * Maps Google Docs JSON responses to clean TypeScript interfaces.
 */

// ---------------------------------------------------------------------------
// Base URL
// ---------------------------------------------------------------------------

/**
 * Google Docs API v1 base URL.
 */
export const BASE_URL = 'https://docs.googleapis.com/v1';

// ---------------------------------------------------------------------------
// Core Document types
// ---------------------------------------------------------------------------

/**
 * Text styling properties.
 */
export type TextStyle = {
  /** Whether the text is bold. */
  readonly bold?: boolean;
  /** Whether the text is italic. */
  readonly italic?: boolean;
  /** Whether the text is underlined. */
  readonly underline?: boolean;
  /** Whether the text is struck through. */
  readonly strikethrough?: boolean;
  /** Whether the text is in small caps. */
  readonly smallCaps?: boolean;
  /** The font size in points. */
  readonly fontSize?: {
    readonly magnitude: number;
    readonly unit: 'PT';
  };
  /** The foreground color of the text. */
  readonly foregroundColor?: {
    readonly color?: {
      readonly rgbColor?: {
        readonly red?: number;
        readonly green?: number;
        readonly blue?: number;
      };
    };
  };
  /** Link associated with the text. */
  readonly link?: {
    readonly url?: string;
  };
  /** Font family name. */
  readonly weightedFontFamily?: {
    readonly fontFamily: string;
    readonly weight?: number;
  };
};

/**
 * A run of text with a single style.
 */
export type TextRun = {
  /** The text content. */
  readonly content: string;
  /** The text style applied to this run. */
  readonly textStyle?: TextStyle;
};

/**
 * A paragraph element (text run, inline object, etc.).
 */
export type ParagraphElement = {
  /** The zero-based start index of this element. */
  readonly startIndex: number;
  /** The zero-based end index (exclusive). */
  readonly endIndex: number;
  /** Text run content. */
  readonly textRun?: TextRun;
};

/**
 * Paragraph styling properties.
 */
export type ParagraphStyle = {
  /** The named style type (e.g., NORMAL_TEXT, HEADING_1, etc.). */
  readonly namedStyleType?: string;
  /** Text alignment. */
  readonly alignment?: 'START' | 'CENTER' | 'END' | 'JUSTIFIED';
  /** Line spacing as a percentage (e.g., 100 for single-spacing). */
  readonly lineSpacing?: number;
  /** Text direction. */
  readonly direction?: 'LEFT_TO_RIGHT' | 'RIGHT_TO_LEFT';
  /** Spacing before the paragraph. */
  readonly spaceAbove?: {
    readonly magnitude: number;
    readonly unit: 'PT';
  };
  /** Spacing after the paragraph. */
  readonly spaceBelow?: {
    readonly magnitude: number;
    readonly unit: 'PT';
  };
  /** Indentation settings. */
  readonly indentStart?: {
    readonly magnitude: number;
    readonly unit: 'PT';
  };
  readonly indentEnd?: {
    readonly magnitude: number;
    readonly unit: 'PT';
  };
  readonly indentFirstLine?: {
    readonly magnitude: number;
    readonly unit: 'PT';
  };
};

/**
 * A paragraph within the document.
 */
export type Paragraph = {
  /** The content elements of the paragraph. */
  readonly elements: readonly ParagraphElement[];
  /** The paragraph style. */
  readonly paragraphStyle?: ParagraphStyle;
};

/**
 * A table cell within a table.
 */
export type TableCell = {
  /** The content of the cell. */
  readonly content: readonly StructuralElement[];
  /** The zero-based start index of this cell. */
  readonly startIndex: number;
  /** The zero-based end index (exclusive). */
  readonly endIndex: number;
};

/**
 * A row within a table.
 */
export type TableRow = {
  /** The cells in the row. */
  readonly tableCells: readonly TableCell[];
  /** The zero-based start index of this row. */
  readonly startIndex: number;
  /** The zero-based end index (exclusive). */
  readonly endIndex: number;
};

/**
 * A table within the document.
 */
export type Table = {
  /** Number of rows in the table. */
  readonly rows: number;
  /** Number of columns in the table. */
  readonly columns: number;
  /** The rows of the table. */
  readonly tableRows: readonly TableRow[];
};

/**
 * A section break.
 */
export type SectionBreak = {
  /** Section style. */
  readonly sectionStyle?: {
    readonly columnSeparatorStyle?: string;
    readonly contentDirection?: 'LEFT_TO_RIGHT' | 'RIGHT_TO_LEFT';
  };
};

/**
 * A structural element of the document (paragraph, table, section break, etc.).
 */
export type StructuralElement = {
  /** The zero-based start index of this element. */
  readonly startIndex: number;
  /** The zero-based end index (exclusive). */
  readonly endIndex: number;
  /** Paragraph content. */
  readonly paragraph?: Paragraph;
  /** Section break. */
  readonly sectionBreak?: SectionBreak;
  /** Table content. */
  readonly table?: Table;
};

/**
 * The document body.
 */
export type Body = {
  /** The structural elements of the document body. */
  readonly content: readonly StructuralElement[];
};

/**
 * Document-level styling properties.
 */
export type DocumentStyle = {
  /** Background color of the document. */
  readonly background?: {
    readonly color?: {
      readonly rgbColor?: {
        readonly red?: number;
        readonly green?: number;
        readonly blue?: number;
      };
    };
  };
  /** Page size. */
  readonly pageSize?: {
    readonly height?: {
      readonly magnitude: number;
      readonly unit: 'PT';
    };
    readonly width?: {
      readonly magnitude: number;
      readonly unit: 'PT';
    };
  };
  /** Page margins. */
  readonly marginTop?: {
    readonly magnitude: number;
    readonly unit: 'PT';
  };
  readonly marginBottom?: {
    readonly magnitude: number;
    readonly unit: 'PT';
  };
  readonly marginLeft?: {
    readonly magnitude: number;
    readonly unit: 'PT';
  };
  readonly marginRight?: {
    readonly magnitude: number;
    readonly unit: 'PT';
  };
  /** Default header id. */
  readonly defaultHeaderId?: string;
  /** Default footer id. */
  readonly defaultFooterId?: string;
};

/**
 * A Google Docs document.
 */
export type Document = {
  /** The ID of the document. */
  readonly documentId: string;
  /** The title of the document. */
  readonly title: string;
  /** The body of the document. */
  readonly body: Body;
  /** Headers in the document, keyed by header ID. */
  readonly headers?: Readonly<Record<string, { readonly content: readonly StructuralElement[] }>>;
  /** Footers in the document, keyed by footer ID. */
  readonly footers?: Readonly<Record<string, { readonly content: readonly StructuralElement[] }>>;
  /** Footnotes in the document, keyed by footnote ID. */
  readonly footnotes?: Readonly<Record<string, { readonly content: readonly StructuralElement[] }>>;
  /** The revision ID of the document. */
  readonly revisionId?: string;
  /** Document-level styling. */
  readonly documentStyle?: DocumentStyle;
};

// ---------------------------------------------------------------------------
// Tabs types
// ---------------------------------------------------------------------------

/**
 * A tab within a document.
 */
export type Tab = {
  /** Properties of the tab. */
  readonly tabProperties: {
    /** The index of the tab. */
    readonly index: number;
    /** The title of the tab. */
    readonly title: string;
  };
  /** Child tabs nested under this tab. */
  readonly childTabs?: readonly Tab[];
};

/**
 * A document tab.
 */
export type DocumentTab = {
  /** The ID of the tab. */
  readonly tabId: string;
  /** Tab properties and content. */
  readonly tab: Tab;
};

/**
 * Response for listing document tabs.
 */
export type DocumentTabsResponse = {
  /** The list of tabs. */
  readonly tabs: readonly DocumentTab[];
};

// ---------------------------------------------------------------------------
// Batch update request types
// ---------------------------------------------------------------------------

/**
 * Request to insert text at a specific index.
 */
export type InsertTextRequest = {
  /** Insert text request. */
  readonly insertText: {
    /** The zero-based index to insert the text at. */
    readonly location: {
      readonly index: number;
    };
    /** The text to insert. */
    readonly text: string;
  };
};

/**
 * Request to delete a range of content.
 */
export type DeleteContentRangeRequest = {
  /** Delete content range request. */
  readonly deleteContentRange: {
    /** The range to delete. */
    readonly range: {
      /** The zero-based start index (inclusive). */
      readonly startIndex: number;
      /** The zero-based end index (exclusive). */
      readonly endIndex: number;
    };
  };
};

/**
 * Request to replace all occurrences of text.
 */
export type ReplaceAllTextRequest = {
  /** Replace all text request. */
  readonly replaceAllText: {
    /** The text to search for (can be a regex pattern). */
    readonly containsText: {
      readonly text: string;
      readonly matchCase?: boolean;
    };
    /** The replacement text. */
    readonly replaceText: string;
  };
};

/**
 * A request to update the document.
 */
export type Request = InsertTextRequest | DeleteContentRangeRequest | ReplaceAllTextRequest;

/**
 * Batch update request to modify a document.
 */
export type BatchUpdateRequest = {
  /** The requests to execute. */
  readonly requests: readonly Request[];
};

/**
 * Response from a batch update operation.
 */
export type BatchUpdateResponse = {
  /** The ID of the document that was updated. */
  readonly documentId: string;
  /** The updated revision ID of the document. */
  readonly revisionId?: string;
  /** The replies to the requests. */
  readonly replies?: readonly Record<string, unknown>[];
};

// ---------------------------------------------------------------------------
// Export format types
// ---------------------------------------------------------------------------

/**
 * Supported export formats for Google Docs.
 */
export type ExportFormat =
  | 'application/pdf'
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  | 'text/plain'
  | 'text/html';

// ---------------------------------------------------------------------------
// DocsApi facade type
// ---------------------------------------------------------------------------

/**
 * Unified Docs API surface that wraps all Google Docs operations.
 */
export type DocsApi = {
  // -- Document operations --------------------------------------------------

  /**
   * Gets a document by ID.
   */
  getDocument(documentId: string): Promise<Result<Document, WorkspaceError>>;

  /**
   * Creates a new document with the given title.
   */
  createDocument(title: string): Promise<Result<Document, WorkspaceError>>;

  /**
   * Copies an existing document to create a new one.
   */
  copyDocument(documentId: string, title?: string): Promise<Result<Document, WorkspaceError>>;

  /**
   * Gets all tabs in a document.
   */
  getDocumentTabs(documentId: string): Promise<Result<DocumentTabsResponse, WorkspaceError>>;

  // -- Content operations ---------------------------------------------------

  /**
   * Reads plain text from the document body.
   */
  readText(documentId: string): Promise<Result<string, WorkspaceError>>;

  /**
   * Sends a batch of update requests to modify the document.
   */
  batchUpdate(
    documentId: string,
    requests: readonly Request[],
  ): Promise<Result<BatchUpdateResponse, WorkspaceError>>;

  /**
   * Inserts text at a specific index in the document.
   */
  insertText(
    documentId: string,
    text: string,
    index: number,
  ): Promise<Result<BatchUpdateResponse, WorkspaceError>>;

  /**
   * Deletes content in a specific range.
   */
  deleteContent(
    documentId: string,
    startIndex: number,
    endIndex: number,
  ): Promise<Result<BatchUpdateResponse, WorkspaceError>>;

  /**
   * Replaces all occurrences of search text with replacement text.
   */
  replaceAllText(
    documentId: string,
    searchText: string,
    replaceText: string,
  ): Promise<Result<BatchUpdateResponse, WorkspaceError>>;

  // -- Export operations ----------------------------------------------------

  /**
   * Exports the document in the specified format.
   */
  exportDocument(documentId: string, mimeType: ExportFormat): Promise<Result<string, WorkspaceError>>;
};

// Re-export Result and WorkspaceError for convenience
import type { Result } from '@openworkspace/core';
import type { WorkspaceError } from '@openworkspace/core';
