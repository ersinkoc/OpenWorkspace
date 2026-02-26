/**
 * Type definitions for Google Forms API v1.
 * Maps Google Forms JSON responses to clean TypeScript interfaces.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Google Forms API v1 base URL.
 */
export const BASE_URL = 'https://forms.googleapis.com/v1';

// ---------------------------------------------------------------------------
// Core Form types
// ---------------------------------------------------------------------------

/**
 * Information about a form, including title and description.
 */
export type Info = {
  /** Title of the form. */
  readonly title: string;
  /** Description of the form. */
  readonly description?: string;
  /** Document title (appears in Google Drive). */
  readonly documentTitle?: string;
};

/**
 * A single question item in a form.
 */
export type QuestionItem = {
  /** The question data. */
  readonly question: Question;
  /** Image to display for this question. */
  readonly image?: Image;
};

/**
 * A question group item (used for grids).
 */
export type QuestionGroupItem = {
  /** Questions in this group. */
  readonly questions: readonly Question[];
  /** Image for the group. */
  readonly image?: Image;
};

/**
 * A page break item.
 */
export type PageBreakItem = Record<string, never>;

/**
 * A text-only item (no question).
 */
export type TextItem = Record<string, never>;

/**
 * An image item (no question).
 */
export type ImageItem = {
  /** Image data. */
  readonly image?: Image;
};

/**
 * A video item (no question).
 */
export type VideoItem = {
  /** Video data. */
  readonly video?: Video;
};

/**
 * Image metadata.
 */
export type Image = {
  /** Content URI of the image. */
  readonly contentUri?: string;
  /** Alt text. */
  readonly altText?: string;
  /** Properties like alignment. */
  readonly properties?: ImageProperties;
};

/**
 * Image display properties.
 */
export type ImageProperties = {
  /** Alignment of the image. */
  readonly alignment?: 'LEFT' | 'CENTER' | 'RIGHT';
  /** Width in pixels. */
  readonly width?: number;
};

/**
 * Video metadata.
 */
export type Video = {
  /** YouTube video ID. */
  readonly youtubeUri?: string;
  /** Properties like width. */
  readonly properties?: VideoProperties;
};

/**
 * Video display properties.
 */
export type VideoProperties = {
  /** Width in pixels. */
  readonly width?: number;
};

/**
 * A single item in a form (question, page break, text, image, or video).
 */
export type Item = {
  /** Unique identifier for the item. */
  readonly itemId?: string;
  /** Title of the item (shown above the question). */
  readonly title?: string;
  /** Description of the item. */
  readonly description?: string;
  /** Question item data. */
  readonly questionItem?: QuestionItem;
  /** Question group item data (for grids). */
  readonly questionGroupItem?: QuestionGroupItem;
  /** Page break item data. */
  readonly pageBreakItem?: PageBreakItem;
  /** Text-only item data. */
  readonly textItem?: TextItem;
  /** Image item data. */
  readonly imageItem?: ImageItem;
  /** Video item data. */
  readonly videoItem?: VideoItem;
};

/**
 * Form settings (e.g., collect email, quiz mode).
 */
export type FormSettings = {
  /** Settings for quiz mode. */
  readonly quizSettings?: QuizSettings;
};

/**
 * Quiz-specific settings.
 */
export type QuizSettings = {
  /** Whether this is a quiz. */
  readonly isQuiz?: boolean;
};

/**
 * A complete form resource.
 */
export type Form = {
  /** Unique identifier for the form. */
  readonly formId: string;
  /** Form metadata (title, description). */
  readonly info: Info;
  /** Form settings. */
  readonly settings?: FormSettings;
  /** List of items in the form. */
  readonly items?: readonly Item[];
  /** Revision ID (used for versioning). */
  readonly revisionId?: string;
  /** URI for form responders. */
  readonly responderUri?: string;
  /** Linked Google Sheets ID for responses. */
  readonly linkedSheetId?: string;
};

// ---------------------------------------------------------------------------
// Question types
// ---------------------------------------------------------------------------

/**
 * Grading configuration for a question.
 */
export type Grading = {
  /** Points awarded for a correct answer. */
  readonly pointValue?: number;
  /** Correct answers (for auto-grading). */
  readonly correctAnswers?: CorrectAnswers;
  /** Feedback for correct answers. */
  readonly whenRight?: Feedback;
  /** Feedback for incorrect answers. */
  readonly whenWrong?: Feedback;
  /** General feedback. */
  readonly generalFeedback?: Feedback;
};

/**
 * Correct answers for auto-grading.
 */
export type CorrectAnswers = {
  /** List of correct answer values. */
  readonly answers?: readonly CorrectAnswer[];
};

/**
 * A single correct answer.
 */
export type CorrectAnswer = {
  /** The correct value. */
  readonly value?: string;
};

/**
 * Feedback to show after answering.
 */
export type Feedback = {
  /** Feedback text. */
  readonly text?: string;
  /** Links to show with the feedback. */
  readonly material?: readonly ExtraMaterial[];
};

/**
 * Extra material to show with feedback.
 */
export type ExtraMaterial = {
  /** Link data. */
  readonly link?: Link;
};

/**
 * A link.
 */
export type Link = {
  /** Display text. */
  readonly displayText?: string;
  /** Target URI. */
  readonly uri?: string;
};

/**
 * A question in the form.
 */
export type Question = {
  /** Unique identifier for the question. */
  readonly questionId?: string;
  /** Whether this question is required. */
  readonly required?: boolean;
  /** Grading configuration (for quizzes). */
  readonly grading?: Grading;
  /** Choice question (radio, checkbox, dropdown). */
  readonly choiceQuestion?: ChoiceQuestion;
  /** Text question (short or long answer). */
  readonly textQuestion?: TextQuestion;
  /** Scale question (linear scale). */
  readonly scaleQuestion?: ScaleQuestion;
  /** Date question. */
  readonly dateQuestion?: DateQuestion;
  /** Time question. */
  readonly timeQuestion?: TimeQuestion;
  /** File upload question. */
  readonly fileUploadQuestion?: FileUploadQuestion;
};

/**
 * A choice question (radio, checkbox, or dropdown).
 */
export type ChoiceQuestion = {
  /** Type of choice question. */
  readonly type: 'RADIO' | 'CHECKBOX' | 'DROP_DOWN';
  /** List of options. */
  readonly options: readonly Option[];
  /** Whether to shuffle the options. */
  readonly shuffle?: boolean;
};

/**
 * A single option in a choice question.
 */
export type Option = {
  /** Option text. */
  readonly value: string;
  /** Optional image for the option. */
  readonly image?: Image;
  /** Whether this is the "Other" option. */
  readonly isOther?: boolean;
  /** Navigation to another section (for branching). */
  readonly goToAction?: 'NEXT_SECTION' | 'RESTART_FORM' | 'SUBMIT_FORM';
  /** ID of the section to go to. */
  readonly goToSectionId?: string;
};

/**
 * A text question (short or long answer).
 */
export type TextQuestion = {
  /** Whether this is a paragraph question (long answer). */
  readonly paragraph?: boolean;
};

/**
 * A scale question (linear scale).
 */
export type ScaleQuestion = {
  /** Minimum value of the scale. */
  readonly low: number;
  /** Maximum value of the scale. */
  readonly high: number;
  /** Label for the low end. */
  readonly lowLabel?: string;
  /** Label for the high end. */
  readonly highLabel?: string;
};

/**
 * A date question.
 */
export type DateQuestion = {
  /** Whether to include the year. */
  readonly includeYear?: boolean;
  /** Whether to include the time. */
  readonly includeTime?: boolean;
};

/**
 * A time question.
 */
export type TimeQuestion = {
  /** Whether to ask for duration instead of time of day. */
  readonly duration?: boolean;
};

/**
 * A file upload question.
 */
export type FileUploadQuestion = {
  /** Folder ID where uploaded files are stored. */
  readonly folderId?: string;
  /** Allowed file types. */
  readonly types?: readonly string[];
  /** Maximum file size in bytes. */
  readonly maxFileSize?: string;
  /** Maximum number of files. */
  readonly maxFiles?: number;
};

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

/**
 * A single text answer.
 */
export type TextAnswer = {
  /** The text value. */
  readonly value: string;
};

/**
 * Text answers wrapper.
 */
export type TextAnswers = {
  /** List of text answers. */
  readonly answers: readonly TextAnswer[];
};

/**
 * File upload answers wrapper.
 */
export type FileUploadAnswers = {
  /** List of file IDs. */
  readonly answers?: readonly FileUploadAnswer[];
};

/**
 * A single file upload answer.
 */
export type FileUploadAnswer = {
  /** Google Drive file ID. */
  readonly fileId?: string;
  /** File name. */
  readonly fileName?: string;
  /** MIME type. */
  readonly mimeType?: string;
};

/**
 * Answer to a single question.
 */
export type Answer = {
  /** Question ID this answer belongs to. */
  readonly questionId: string;
  /** Text answers (for text, choice, scale, date, time questions). */
  readonly textAnswers?: TextAnswers;
  /** File upload answers. */
  readonly fileUploadAnswers?: FileUploadAnswers;
};

/**
 * A complete form response from a user.
 */
export type FormResponse = {
  /** Unique identifier for the response. */
  readonly responseId: string;
  /** Timestamp when the response was created (RFC 3339). */
  readonly createTime: string;
  /** Timestamp when last submitted (RFC 3339). */
  readonly lastSubmittedTime: string;
  /** Email address of the respondent (if collected). */
  readonly respondentEmail?: string;
  /** Map of questionId to Answer. */
  readonly answers: Readonly<Record<string, Answer>>;
};

/**
 * List of form responses with pagination.
 */
export type ListFormResponsesResponse = {
  /** List of responses. */
  readonly responses: readonly FormResponse[];
  /** Token for the next page. */
  readonly nextPageToken?: string;
  /** Total number of updated responses. */
  readonly totalUpdatedResponses?: number;
};

// ---------------------------------------------------------------------------
// Batch update types
// ---------------------------------------------------------------------------

/**
 * Location in the form (for inserting items).
 */
export type Location = {
  /** Index where the item should be inserted. */
  readonly index?: number;
};

/**
 * Request to create a new item.
 */
export type CreateItemRequest = {
  /** The item to create. */
  readonly item: Item;
  /** Location where the item should be inserted. */
  readonly location: Location;
};

/**
 * Request to delete an item.
 */
export type DeleteItemRequest = {
  /** Location of the item to delete. */
  readonly location: Location;
};

/**
 * Request to update form info.
 */
export type UpdateFormInfoRequest = {
  /** The new info. */
  readonly info: Info;
  /** Fields to update (comma-separated, e.g., "title,description"). */
  readonly updateMask: string;
};

/**
 * A single request in a batch update.
 */
export type Request = {
  /** Create item request. */
  readonly createItem?: CreateItemRequest;
  /** Delete item request. */
  readonly deleteItem?: DeleteItemRequest;
  /** Update form info request. */
  readonly updateFormInfo?: UpdateFormInfoRequest;
};

/**
 * Batch update request body.
 */
export type BatchUpdateFormRequest = {
  /** List of requests to execute. */
  readonly requests: readonly Request[];
  /** Whether to include form in response. */
  readonly includeFormInResponse?: boolean;
};

/**
 * Response from a batch update.
 */
export type BatchUpdateFormResponse = {
  /** The updated form (if includeFormInResponse was true). */
  readonly form?: Form;
  /** Write control for concurrent updates. */
  readonly writeControl?: WriteControl;
  /** Individual responses for each request. */
  readonly replies?: readonly Reply[];
};

/**
 * Write control for concurrent updates.
 */
export type WriteControl = {
  /** Required revision ID for the update. */
  readonly requiredRevisionId?: string;
  /** Target revision ID after the update. */
  readonly targetRevisionId?: string;
};

/**
 * Reply for a single request in a batch update.
 */
export type Reply = {
  /** Reply for a create item request. */
  readonly createItem?: CreateItemResponse;
};

/**
 * Response for a create item request.
 */
export type CreateItemResponse = {
  /** ID of the created item. */
  readonly itemId?: string;
  /** ID of the question (if the item is a question). */
  readonly questionId?: readonly string[];
};

// ---------------------------------------------------------------------------
// Facade type
// ---------------------------------------------------------------------------

/**
 * Unified Forms API surface.
 * Created via the {@link createFormsApi} factory function.
 */
export type FormsApi = {
  /**
   * Gets a form by its ID.
   */
  getForm(formId: string): Promise<Result<Form, WorkspaceError>>;

  /**
   * Creates a new form.
   */
  createForm(info: Info): Promise<Result<Form, WorkspaceError>>;

  /**
   * Batch updates a form.
   */
  batchUpdateForm(
    formId: string,
    requests: readonly Request[],
  ): Promise<Result<BatchUpdateFormResponse, WorkspaceError>>;

  /**
   * Adds a question to a form.
   */
  addQuestion(
    formId: string,
    item: Item,
    location?: Location,
  ): Promise<Result<BatchUpdateFormResponse, WorkspaceError>>;

  /**
   * Deletes an item from a form.
   */
  deleteItem(
    formId: string,
    index: number,
  ): Promise<Result<BatchUpdateFormResponse, WorkspaceError>>;

  /**
   * Lists responses for a form.
   */
  listResponses(
    formId: string,
    options?: ListResponsesOptions,
  ): Promise<Result<ListFormResponsesResponse, WorkspaceError>>;

  /**
   * Gets a single response.
   */
  getResponse(
    formId: string,
    responseId: string,
  ): Promise<Result<FormResponse, WorkspaceError>>;
};

/**
 * Options for listing form responses.
 */
export type ListResponsesOptions = {
  /** Maximum number of responses to return. */
  readonly pageSize?: number;
  /** Token for pagination. */
  readonly pageToken?: string;
  /** Filter string. */
  readonly filter?: string;
};

// Re-export Result and WorkspaceError from core for convenience
import type { Result, WorkspaceError } from '@openworkspace/core';
export type { Result, WorkspaceError };
