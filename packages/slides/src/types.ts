/**
 * Type definitions for Google Slides API v1.
 * Maps Google Slides JSON responses to clean TypeScript interfaces.
 */

import type { Result, WorkspaceError } from '@openworkspace/core';

// ---------------------------------------------------------------------------
// Core API constants
// ---------------------------------------------------------------------------

/**
 * Google Slides API v1 base URL.
 */
export const BASE_URL = 'https://slides.googleapis.com/v1';

// ---------------------------------------------------------------------------
// Dimension and Size types
// ---------------------------------------------------------------------------

/**
 * A magnitude in a single direction (width or height).
 */
export type Dimension = {
  /** The magnitude value. */
  readonly magnitude: number;
  /** The units for magnitude (EMU = English Metric Units, PT = Points). */
  readonly unit: 'EMU' | 'PT';
};

/**
 * A size with width and height dimensions.
 */
export type Size = {
  /** The width of the object. */
  readonly width: Dimension;
  /** The height of the object. */
  readonly height: Dimension;
};

/**
 * A location of a single table cell within a table.
 */
export type TableCellLocation = {
  /** The 0-based row index. */
  readonly rowIndex: number;
  /** The 0-based column index. */
  readonly columnIndex: number;
};

// ---------------------------------------------------------------------------
// Transform and positioning types
// ---------------------------------------------------------------------------

/**
 * Affine transform applied to a page element.
 */
export type AffineTransform = {
  /** The X coordinate scaling element. */
  readonly scaleX?: number;
  /** The Y coordinate scaling element. */
  readonly scaleY?: number;
  /** The X coordinate shearing element. */
  readonly shearX?: number;
  /** The Y coordinate shearing element. */
  readonly shearY?: number;
  /** The X coordinate translation element (in EMUs). */
  readonly translateX?: number;
  /** The Y coordinate translation element (in EMUs). */
  readonly translateY?: number;
  /** The units for translate elements. */
  readonly unit?: 'EMU' | 'PT';
};

// ---------------------------------------------------------------------------
// Text content types
// ---------------------------------------------------------------------------

/**
 * RGB color value.
 */
export type RgbColor = {
  /** Red component (0-1). */
  readonly red: number;
  /** Green component (0-1). */
  readonly green: number;
  /** Blue component (0-1). */
  readonly blue: number;
};

/**
 * Color that can apply to text or shapes.
 */
export type Color = {
  /** RGB color. */
  readonly rgbColor?: RgbColor;
};

/**
 * A hyperlink.
 */
export type Link = {
  /** URL target of the link. */
  readonly url?: string;
  /** ID of the linked slide. */
  readonly slideIndex?: number;
  /** ID of a specific page element to link to. */
  readonly pageObjectId?: string;
  /** ID of the specific slide to link to. */
  readonly relativeLink?: 'NEXT_SLIDE' | 'PREVIOUS_SLIDE' | 'FIRST_SLIDE' | 'LAST_SLIDE';
};

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
  /** The font family of the text (e.g. "Arial"). */
  readonly fontFamily?: string;
  /** The font size of the text. */
  readonly fontSize?: Dimension;
  /** The foreground color of the text. */
  readonly foregroundColor?: Color;
  /** The background color of the text. */
  readonly backgroundColor?: Color;
  /** The hyperlink destination of the text. */
  readonly link?: Link;
  /** The text's vertical offset from baseline. */
  readonly baselineOffset?: 'BASELINE_OFFSET_UNSPECIFIED' | 'NONE' | 'SUPERSCRIPT' | 'SUBSCRIPT';
  /** Whether or not the text is in small capital letters. */
  readonly smallCaps?: boolean;
  /** The font weight (100-900). */
  readonly weightedFontFamily?: {
    readonly fontFamily: string;
    readonly weight: number;
  };
};

/**
 * A TextRun represents a segment of text with consistent styling.
 */
export type TextRun = {
  /** The text content. */
  readonly content: string;
  /** The styling applied to this run. */
  readonly style?: TextStyle;
};

/**
 * Marker for a paragraph within text.
 */
export type ParagraphMarker = {
  /** The paragraph's style. */
  readonly style?: {
    readonly lineSpacing?: number;
    readonly alignment?: 'ALIGNMENT_UNSPECIFIED' | 'START' | 'CENTER' | 'END' | 'JUSTIFIED';
    readonly indentStart?: Dimension;
    readonly indentEnd?: Dimension;
    readonly spaceAbove?: Dimension;
    readonly spaceBelow?: Dimension;
    readonly indentFirstLine?: Dimension;
    readonly direction?: 'TEXT_DIRECTION_UNSPECIFIED' | 'LEFT_TO_RIGHT' | 'RIGHT_TO_LEFT';
  };
  readonly bullet?: {
    readonly listId?: string;
    readonly nestingLevel?: number;
    readonly glyph?: string;
    readonly bulletStyle?: TextStyle;
  };
};

/**
 * A TextElement is either a TextRun or a ParagraphMarker.
 */
export type TextElement = {
  /** Start index of this text element (inclusive). */
  readonly startIndex?: number;
  /** End index of this text element (exclusive). */
  readonly endIndex?: number;
  /** A text run. */
  readonly textRun?: TextRun;
  /** A paragraph marker. */
  readonly paragraphMarker?: ParagraphMarker;
};

/**
 * TextContent contains the text and formatting for a shape or table cell.
 */
export type TextContent = {
  /** The text elements in the text content. */
  readonly textElements?: readonly TextElement[];
};

// ---------------------------------------------------------------------------
// Shape types
// ---------------------------------------------------------------------------

/**
 * A Shape element on a slide.
 */
export type Shape = {
  /** The type of the shape. */
  readonly shapeType?:
    | 'TYPE_UNSPECIFIED'
    | 'TEXT_BOX'
    | 'RECTANGLE'
    | 'ROUND_RECTANGLE'
    | 'ELLIPSE'
    | 'CLOUD'
    | 'CUSTOM'
    | 'BENT_ARROW'
    | 'BENT_UP_ARROW'
    | 'BEVEL'
    | 'BLOCK_ARC'
    | 'BRACE_PAIR'
    | 'BRACKET_PAIR'
    | 'CAN'
    | 'CHEVRON'
    | 'CHORD'
    | 'CLOUD_CALLOUT'
    | 'CORNER'
    | 'CUBE'
    | 'CURVED_DOWN_ARROW'
    | 'CURVED_LEFT_ARROW'
    | 'CURVED_RIGHT_ARROW'
    | 'CURVED_UP_ARROW'
    | 'DECAGON'
    | 'DIAGONAL_STRIPE'
    | 'DIAMOND'
    | 'DODECAGON'
    | 'DONUT'
    | 'DOUBLE_WAVE'
    | 'DOWN_ARROW'
    | 'DOWN_ARROW_CALLOUT'
    | 'FOLDED_CORNER'
    | 'FRAME'
    | 'HALF_FRAME'
    | 'HEART'
    | 'HEPTAGON'
    | 'HEXAGON'
    | 'HOME_PLATE'
    | 'HORIZONTAL_SCROLL'
    | 'IRREGULAR_SEAL_1'
    | 'IRREGULAR_SEAL_2'
    | 'LEFT_ARROW'
    | 'LEFT_ARROW_CALLOUT'
    | 'LEFT_BRACE'
    | 'LEFT_BRACKET'
    | 'LEFT_RIGHT_ARROW'
    | 'LEFT_RIGHT_ARROW_CALLOUT'
    | 'LEFT_RIGHT_UP_ARROW'
    | 'LEFT_UP_ARROW'
    | 'LIGHTNING_BOLT'
    | 'MATH_DIVIDE'
    | 'MATH_EQUAL'
    | 'MATH_MINUS'
    | 'MATH_MULTIPLY'
    | 'MATH_NOT_EQUAL'
    | 'MATH_PLUS'
    | 'MOON'
    | 'NO_SMOKING'
    | 'NOTCHED_RIGHT_ARROW'
    | 'OCTAGON'
    | 'PARALLELOGRAM'
    | 'PENTAGON'
    | 'PIE'
    | 'PLAQUE'
    | 'PLUS'
    | 'QUAD_ARROW'
    | 'QUAD_ARROW_CALLOUT'
    | 'RIBBON'
    | 'RIBBON_2'
    | 'RIGHT_ARROW'
    | 'RIGHT_ARROW_CALLOUT'
    | 'RIGHT_BRACE'
    | 'RIGHT_BRACKET'
    | 'RIGHT_TRIANGLE'
    | 'ROUND_1_RECTANGLE'
    | 'ROUND_2_DIAGONAL_RECTANGLE'
    | 'ROUND_2_SAME_RECTANGLE'
    | 'SMILEY_FACE'
    | 'SNIP_1_RECTANGLE'
    | 'SNIP_2_DIAGONAL_RECTANGLE'
    | 'SNIP_2_SAME_RECTANGLE'
    | 'SNIP_ROUND_RECTANGLE'
    | 'STAR_10'
    | 'STAR_12'
    | 'STAR_16'
    | 'STAR_24'
    | 'STAR_32'
    | 'STAR_4'
    | 'STAR_5'
    | 'STAR_6'
    | 'STAR_7'
    | 'STAR_8'
    | 'STARBURST'
    | 'STRIPED_RIGHT_ARROW'
    | 'SUN'
    | 'TRAPEZOID'
    | 'TRIANGLE'
    | 'UP_ARROW'
    | 'UP_ARROW_CALLOUT'
    | 'UP_DOWN_ARROW'
    | 'UTURN_ARROW'
    | 'VERTICAL_SCROLL'
    | 'WAVE'
    | 'WEDGE_ELLIPSE_CALLOUT'
    | 'WEDGE_RECTANGLE_CALLOUT'
    | 'WEDGE_ROUND_RECTANGLE_CALLOUT'
    | 'FLOW_CHART_ALTERNATE_PROCESS'
    | 'FLOW_CHART_COLLATE'
    | 'FLOW_CHART_CONNECTOR'
    | 'FLOW_CHART_DECISION'
    | 'FLOW_CHART_DELAY'
    | 'FLOW_CHART_DISPLAY'
    | 'FLOW_CHART_DOCUMENT'
    | 'FLOW_CHART_EXTRACT'
    | 'FLOW_CHART_INPUT_OUTPUT'
    | 'FLOW_CHART_INTERNAL_STORAGE'
    | 'FLOW_CHART_MAGNETIC_DISK'
    | 'FLOW_CHART_MAGNETIC_DRUM'
    | 'FLOW_CHART_MAGNETIC_TAPE'
    | 'FLOW_CHART_MANUAL_INPUT'
    | 'FLOW_CHART_MANUAL_OPERATION'
    | 'FLOW_CHART_MERGE'
    | 'FLOW_CHART_MULTIDOCUMENT'
    | 'FLOW_CHART_OFFLINE_STORAGE'
    | 'FLOW_CHART_OFFPAGE_CONNECTOR'
    | 'FLOW_CHART_ONLINE_STORAGE'
    | 'FLOW_CHART_OR'
    | 'FLOW_CHART_PREDEFINED_PROCESS'
    | 'FLOW_CHART_PREPARATION'
    | 'FLOW_CHART_PROCESS'
    | 'FLOW_CHART_PUNCHED_CARD'
    | 'FLOW_CHART_PUNCHED_TAPE'
    | 'FLOW_CHART_SORT'
    | 'FLOW_CHART_SUMMING_JUNCTION'
    | 'FLOW_CHART_TERMINATOR'
    | 'ARROW_EAST'
    | 'ARROW_NORTH_EAST'
    | 'ARROW_NORTH'
    | 'SPEECH'
    | 'CALLOUT_1'
    | 'CALLOUT_2'
    | 'CALLOUT_3';
  /** The text content of the shape. */
  readonly text?: TextContent;
  /** Properties of the shape. */
  readonly shapeProperties?: {
    readonly shapeBackgroundFill?: {
      readonly solidFill?: {
        readonly color?: Color;
        readonly alpha?: number;
      };
    };
    readonly outline?: {
      readonly outlineFill?: {
        readonly solidFill?: {
          readonly color?: Color;
          readonly alpha?: number;
        };
      };
      readonly weight?: Dimension;
      readonly dashStyle?:
        | 'DASH_STYLE_UNSPECIFIED'
        | 'SOLID'
        | 'DOT'
        | 'DASH'
        | 'DASH_DOT'
        | 'LONG_DASH'
        | 'LONG_DASH_DOT';
    };
    readonly link?: Link;
  };
};

// ---------------------------------------------------------------------------
// Image, Video, and Table types
// ---------------------------------------------------------------------------

/**
 * An Image element on a slide.
 */
export type Image = {
  /** The content URL of the image. */
  readonly contentUrl?: string;
  /** Properties of the image. */
  readonly imageProperties?: {
    readonly cropProperties?: {
      readonly leftOffset?: number;
      readonly rightOffset?: number;
      readonly topOffset?: number;
      readonly bottomOffset?: number;
    };
    readonly transparency?: number;
    readonly brightness?: number;
    readonly contrast?: number;
    readonly recolor?: {
      readonly recolorStops?: readonly {
        readonly color?: Color;
        readonly alpha?: number;
        readonly position?: number;
      }[];
    };
    readonly outline?: {
      readonly outlineFill?: {
        readonly solidFill?: {
          readonly color?: Color;
          readonly alpha?: number;
        };
      };
      readonly weight?: Dimension;
      readonly dashStyle?: string;
    };
    readonly shadow?: {
      readonly type?: string;
      readonly transform?: AffineTransform;
      readonly alignment?: string;
      readonly color?: Color;
      readonly alpha?: number;
      readonly blurRadius?: Dimension;
      readonly rotateWithShape?: boolean;
    };
    readonly link?: Link;
  };
};

/**
 * A Video element on a slide.
 */
export type Video = {
  /** The video source URL. */
  readonly url?: string;
  /** The video source (YouTube, etc.). */
  readonly source?: 'SOURCE_UNSPECIFIED' | 'YOUTUBE' | 'DRIVE';
  /** The video's ID in the source system. */
  readonly id?: string;
  /** Properties of the video. */
  readonly videoProperties?: {
    readonly outline?: {
      readonly outlineFill?: {
        readonly solidFill?: {
          readonly color?: Color;
          readonly alpha?: number;
        };
      };
      readonly weight?: Dimension;
      readonly dashStyle?: string;
    };
  };
};

/**
 * A Table element on a slide.
 */
export type Table = {
  /** Number of rows in the table. */
  readonly rows?: number;
  /** Number of columns in the table. */
  readonly columns?: number;
  /** Properties of rows in the table. */
  readonly tableRows?: readonly {
    readonly rowHeight?: Dimension;
    readonly tableCells?: readonly {
      readonly location?: TableCellLocation;
      readonly rowSpan?: number;
      readonly columnSpan?: number;
      readonly text?: TextContent;
      readonly tableCellProperties?: {
        readonly tableCellBackgroundFill?: {
          readonly solidFill?: {
            readonly color?: Color;
            readonly alpha?: number;
          };
        };
        readonly contentAlignment?:
          | 'CONTENT_ALIGNMENT_UNSPECIFIED'
          | 'CONTENT_ALIGNMENT_UNSUPPORTED'
          | 'TOP'
          | 'MIDDLE'
          | 'BOTTOM';
      };
    }[];
  }[];
  /** Properties of columns in the table. */
  readonly tableColumns?: readonly {
    readonly columnWidth?: Dimension;
  }[];
};

// ---------------------------------------------------------------------------
// Page element types
// ---------------------------------------------------------------------------

/**
 * A visual element on a slide (shape, image, video, table, etc.).
 */
export type PageElement = {
  /** The object ID of this page element. */
  readonly objectId: string;
  /** The size of the element. */
  readonly size?: Size;
  /** The transform of the element. */
  readonly transform?: AffineTransform;
  /** A shape element. */
  readonly shape?: Shape;
  /** An image element. */
  readonly image?: Image;
  /** A video element. */
  readonly video?: Video;
  /** A table element. */
  readonly table?: Table;
  /** A line element. */
  readonly line?: {
    readonly lineProperties?: {
      readonly lineFill?: {
        readonly solidFill?: {
          readonly color?: Color;
          readonly alpha?: number;
        };
      };
      readonly weight?: Dimension;
      readonly dashStyle?: string;
      readonly startArrow?: 'ARROW_STYLE_UNSPECIFIED' | 'NONE' | 'STEALTH_ARROW' | 'FILL_ARROW' | 'FILL_CIRCLE' | 'FILL_SQUARE' | 'FILL_DIAMOND' | 'OPEN_ARROW' | 'OPEN_CIRCLE' | 'OPEN_SQUARE' | 'OPEN_DIAMOND';
      readonly endArrow?: 'ARROW_STYLE_UNSPECIFIED' | 'NONE' | 'STEALTH_ARROW' | 'FILL_ARROW' | 'FILL_CIRCLE' | 'FILL_SQUARE' | 'FILL_DIAMOND' | 'OPEN_ARROW' | 'OPEN_CIRCLE' | 'OPEN_SQUARE' | 'OPEN_DIAMOND';
      readonly link?: Link;
    };
    readonly lineType?: 'TYPE_UNSPECIFIED' | 'STRAIGHT_CONNECTOR_1' | 'BENT_CONNECTOR_2' | 'BENT_CONNECTOR_3' | 'BENT_CONNECTOR_4' | 'BENT_CONNECTOR_5' | 'CURVED_CONNECTOR_2' | 'CURVED_CONNECTOR_3' | 'CURVED_CONNECTOR_4' | 'CURVED_CONNECTOR_5' | 'STRAIGHT_LINE';
    readonly lineCategory?: 'LINE_CATEGORY_UNSPECIFIED' | 'STRAIGHT' | 'BENT' | 'CURVED';
  };
  /** A word art element. */
  readonly wordArt?: {
    readonly renderedText?: string;
  };
  /** A speaker spotlight element. */
  readonly speakerSpotlight?: {
    readonly speakerSpotlightProperties?: {
      readonly outline?: {
        readonly outlineFill?: {
          readonly solidFill?: {
            readonly color?: Color;
            readonly alpha?: number;
          };
        };
        readonly weight?: Dimension;
        readonly dashStyle?: string;
      };
      readonly shadow?: {
        readonly type?: string;
        readonly transform?: AffineTransform;
        readonly alignment?: string;
        readonly color?: Color;
        readonly alpha?: number;
        readonly blurRadius?: Dimension;
        readonly rotateWithShape?: boolean;
      };
    };
  };
};

// ---------------------------------------------------------------------------
// Slide and page types
// ---------------------------------------------------------------------------

/**
 * Properties specific to a slide.
 */
export type SlideProperties = {
  /** The object ID of the layout that this slide is based on. */
  readonly layoutObjectId?: string;
  /** The object ID of the master that this slide is based on. */
  readonly masterObjectId?: string;
  /** The notes page that this slide is associated with. */
  readonly notesPage?: {
    readonly objectId?: string;
    readonly pageElements?: readonly PageElement[];
    readonly notesProperties?: {
      readonly speakerNotesObjectId?: string;
    };
  };
};

/**
 * A page (slide, layout, or master) in a presentation.
 */
export type Page = {
  /** The object ID of this page. */
  readonly objectId: string;
  /** The type of the page. */
  readonly pageType?: 'SLIDE' | 'MASTER' | 'LAYOUT' | 'NOTES' | 'NOTES_MASTER';
  /** The page elements rendered on the page. */
  readonly pageElements?: readonly PageElement[];
  /** The properties of the slide page. */
  readonly slideProperties?: SlideProperties;
  /** The properties of the layout page. */
  readonly layoutProperties?: {
    readonly masterObjectId?: string;
    readonly name?: string;
    readonly displayName?: string;
  };
  /** The properties of the master page. */
  readonly masterProperties?: {
    readonly displayName?: string;
  };
  /** The properties of the notes page. */
  readonly notesProperties?: {
    readonly speakerNotesObjectId?: string;
  };
};

// ---------------------------------------------------------------------------
// Presentation type
// ---------------------------------------------------------------------------

/**
 * A Google Slides presentation.
 */
export type Presentation = {
  /** The ID of the presentation. */
  readonly presentationId: string;
  /** The title of the presentation. */
  readonly title: string;
  /** The slides in the presentation (does not include masters/layouts). */
  readonly slides?: readonly Page[];
  /** The master slides in the presentation. */
  readonly masters?: readonly Page[];
  /** The layouts in the presentation. */
  readonly layouts?: readonly Page[];
  /** The size of pages in the presentation. */
  readonly pageSize?: Size;
  /** The locale of the presentation (BCP 47 language tag, e.g. "en-US"). */
  readonly locale?: string;
  /** The revision ID of the presentation. */
  readonly revisionId?: string;
};

// ---------------------------------------------------------------------------
// Request types for batchUpdate
// ---------------------------------------------------------------------------

/**
 * Creates a new slide in the presentation.
 */
export type CreateSlideRequest = {
  /** Object ID for the new slide (optional, auto-generated if not provided). */
  readonly objectId?: string;
  /** The index where the slide should be inserted (0-based). */
  readonly insertionIndex?: number;
  /** The layout reference for the new slide. */
  readonly slideLayoutReference?: {
    readonly layoutId?: string;
    readonly predefinedLayout?:
      | 'PREDEFINED_LAYOUT_UNSPECIFIED'
      | 'BLANK'
      | 'CAPTION_ONLY'
      | 'TITLE'
      | 'TITLE_AND_BODY'
      | 'TITLE_AND_TWO_COLUMNS'
      | 'TITLE_ONLY'
      | 'SECTION_HEADER'
      | 'SECTION_TITLE_AND_DESCRIPTION'
      | 'ONE_COLUMN_TEXT'
      | 'MAIN_POINT'
      | 'BIG_NUMBER';
  };
  /** Optional list of object IDs for elements to be duplicated. */
  readonly placeholderIdMappings?: readonly {
    readonly layoutPlaceholder?: {
      readonly type?: string;
      readonly index?: number;
    };
    readonly layoutPlaceholderObjectId?: string;
    readonly objectId?: string;
  }[];
};

/**
 * Inserts text into a shape or table cell.
 */
export type InsertTextRequest = {
  /** The object ID of the shape or table cell. */
  readonly objectId: string;
  /** The text to insert. */
  readonly text: string;
  /** The index where text should be inserted (0 = beginning). */
  readonly insertionIndex?: number;
  /** Optional cell location if inserting into a table cell. */
  readonly cellLocation?: TableCellLocation;
};

/**
 * Replaces all instances of text matching a find string with a replace string.
 */
export type ReplaceAllTextRequest = {
  /** The text to search for. */
  readonly containsText: {
    readonly text: string;
    readonly matchCase?: boolean;
  };
  /** The text to replace it with. */
  readonly replaceText: string;
  /** If specified, restricts the replace to specific page object IDs. */
  readonly pageObjectIds?: readonly string[];
};

/**
 * Deletes an object from the presentation.
 */
export type DeleteObjectRequest = {
  /** The object ID of the element to delete. */
  readonly objectId: string;
};

/**
 * Updates the properties of a Shape.
 */
export type UpdateShapePropertiesRequest = {
  /** The object ID of the shape. */
  readonly objectId: string;
  /** The shape properties to update. */
  readonly shapeProperties?: {
    readonly shapeBackgroundFill?: {
      readonly solidFill?: {
        readonly color?: Color;
        readonly alpha?: number;
      };
    };
    readonly outline?: {
      readonly outlineFill?: {
        readonly solidFill?: {
          readonly color?: Color;
          readonly alpha?: number;
        };
      };
      readonly weight?: Dimension;
      readonly dashStyle?: string;
    };
    readonly link?: Link;
  };
  /** The fields that should be updated (e.g. "shapeBackgroundFill.solidFill.color"). */
  readonly fields?: string;
};

/**
 * Updates text style on a range of text.
 */
export type UpdateTextStyleRequest = {
  /** The object ID of the shape or table cell containing the text. */
  readonly objectId: string;
  /** The text range to style. */
  readonly textRange?: {
    readonly type?: 'FIXED_RANGE' | 'FROM_START_INDEX' | 'ALL';
    readonly startIndex?: number;
    readonly endIndex?: number;
  };
  /** The style to apply. */
  readonly style?: TextStyle;
  /** The fields to update (e.g. "bold", "fontSize"). */
  readonly fields?: string;
  /** Optional cell location if updating text in a table cell. */
  readonly cellLocation?: TableCellLocation;
};

/**
 * A single request in a batch update.
 */
export type Request =
  | { readonly createSlide: CreateSlideRequest }
  | { readonly insertText: InsertTextRequest }
  | { readonly replaceAllText: ReplaceAllTextRequest }
  | { readonly deleteObject: DeleteObjectRequest }
  | { readonly updateShapeProperties: UpdateShapePropertiesRequest }
  | { readonly updateTextStyle: UpdateTextStyleRequest };

/**
 * Request body for presentations.batchUpdate.
 */
export type BatchUpdateRequest = {
  /** The list of requests to execute. */
  readonly requests: readonly Request[];
};

/**
 * Response from a single request in a batch.
 */
export type Response = {
  /** Response for createSlide. */
  readonly createSlide?: {
    readonly objectId: string;
  };
  /** Response for replaceAllText. */
  readonly replaceAllText?: {
    readonly occurrencesChanged: number;
  };
};

/**
 * Response body from presentations.batchUpdate.
 */
export type BatchUpdateResponse = {
  /** The presentation ID. */
  readonly presentationId: string;
  /** The replies to the requests (in the same order as the requests). */
  readonly replies?: readonly Response[];
  /** The updated etag of the presentation. */
  readonly writeControl?: {
    readonly requiredRevisionId?: string;
  };
};

// ---------------------------------------------------------------------------
// Export types
// ---------------------------------------------------------------------------

/**
 * Supported export formats for presentations.
 */
export type ExportFormat =
  | 'application/pdf'
  | 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

// ---------------------------------------------------------------------------
// SlidesApi facade type
// ---------------------------------------------------------------------------

/**
 * Unified Slides API surface that wraps all Google Slides operations.
 */
export type SlidesApi = {
  // Presentation operations
  getPresentation(presentationId: string): Promise<Result<Presentation, WorkspaceError>>;
  createPresentation(title: string): Promise<Result<Presentation, WorkspaceError>>;
  getSlide(presentationId: string, slideId: string): Promise<Result<Page, WorkspaceError>>;

  // Slide operations
  batchUpdate(
    presentationId: string,
    requests: readonly Request[],
  ): Promise<Result<BatchUpdateResponse, WorkspaceError>>;
  addSlide(
    presentationId: string,
    layoutId?: string,
    insertionIndex?: number,
  ): Promise<Result<string, WorkspaceError>>;
  deleteSlide(presentationId: string, slideId: string): Promise<Result<void, WorkspaceError>>;
  replaceAllText(
    presentationId: string,
    searchText: string,
    replaceText: string,
  ): Promise<Result<number, WorkspaceError>>;
  updateSpeakerNotes(
    presentationId: string,
    slideId: string,
    notes: string,
  ): Promise<Result<void, WorkspaceError>>;

  // Export operations
  exportPresentation(
    presentationId: string,
    mimeType: ExportFormat,
  ): Promise<Result<Blob, WorkspaceError>>;
};
