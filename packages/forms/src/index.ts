/**
 * @openworkspace/forms
 * Google Forms API v1 service package for OpenWorkspace.
 * Zero-dependency -- uses HttpClient from @openworkspace/core.
 */

// Types
export type {
  Form,
  Info,
  Item,
  QuestionItem,
  QuestionGroupItem,
  PageBreakItem,
  TextItem,
  ImageItem,
  VideoItem,
  Image,
  ImageProperties,
  Video,
  VideoProperties,
  Question,
  ChoiceQuestion,
  Option,
  TextQuestion,
  ScaleQuestion,
  DateQuestion,
  TimeQuestion,
  FileUploadQuestion,
  Grading,
  CorrectAnswers,
  CorrectAnswer,
  Feedback,
  ExtraMaterial,
  Link,
  FormSettings,
  QuizSettings,
  FormResponse,
  Answer,
  TextAnswers,
  TextAnswer,
  FileUploadAnswers,
  FileUploadAnswer,
  ListFormResponsesResponse,
  ListResponsesOptions,
  BatchUpdateFormRequest,
  BatchUpdateFormResponse,
  Request,
  CreateItemRequest,
  DeleteItemRequest,
  UpdateFormInfoRequest,
  Location,
  WriteControl,
  Reply,
  CreateItemResponse,
  FormsApi,
} from './types.js';

export { BASE_URL } from './types.js';

// Form operations
export {
  getForm,
  createForm,
  batchUpdateForm,
  addQuestion,
  deleteItem,
} from './form-ops.js';

// Response operations
export { listResponses, getResponse } from './responses.js';

// Plugin & facade
export { createFormsApi, formsPlugin } from './plugin.js';
