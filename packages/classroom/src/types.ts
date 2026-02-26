/**
 * Type definitions for Google Classroom API v1.
 * Maps Google Classroom JSON responses to clean TypeScript interfaces.
 */

// ---------------------------------------------------------------------------
// Base URL
// ---------------------------------------------------------------------------

/**
 * Google Classroom API v1 base URL.
 */
export const BASE_URL = 'https://classroom.googleapis.com/v1';

// ---------------------------------------------------------------------------
// Core types
// ---------------------------------------------------------------------------

/**
 * User profile information.
 */
export type UserProfile = {
  /** Identifier of the user. */
  readonly id: string;
  /** Name of the user. */
  readonly name: Name;
  /** Email address of the user. */
  readonly emailAddress: string;
  /** URL of the user's profile photo. */
  readonly photoUrl?: string;
};

/**
 * Name of a user.
 */
export type Name = {
  /** Given name of the user. */
  readonly givenName: string;
  /** Family name of the user. */
  readonly familyName: string;
  /** Full name of the user. */
  readonly fullName: string;
};

/**
 * A course in Classroom.
 */
export type Course = {
  /** Identifier of the course assigned by Classroom. */
  readonly id: string;
  /** Name of the course. */
  readonly name: string;
  /** Section of the course. */
  readonly section?: string;
  /** Heading for the description. */
  readonly descriptionHeading?: string;
  /** Description of the course. */
  readonly description?: string;
  /** Room location. */
  readonly room?: string;
  /** Identifier of the owner of the course. */
  readonly ownerId: string;
  /** Creation time of the course (RFC 3339). */
  readonly creationTime: string;
  /** Last update time of the course (RFC 3339). */
  readonly updateTime: string;
  /** Enrollment code for the course. */
  readonly enrollmentCode?: string;
  /** State of the course. */
  readonly courseState: 'ACTIVE' | 'ARCHIVED' | 'PROVISIONED' | 'DECLINED' | 'SUSPENDED';
  /** Absolute link to this course in the Classroom web UI. */
  readonly alternateLink: string;
  /** Email address of a Google group containing all teachers of the course. */
  readonly teacherGroupEmail?: string;
  /** Email address of a Google group containing all members of the course. */
  readonly courseGroupEmail?: string;
  /** Calendar id for the course. */
  readonly calendarId?: string;
};

/**
 * Course work (assignment, question, etc.).
 */
export type CourseWork = {
  /** Identifier of the course. */
  readonly courseId: string;
  /** Classroom-assigned identifier of this course work. */
  readonly id: string;
  /** Title of this course work. */
  readonly title: string;
  /** Description of this course work. */
  readonly description?: string;
  /** Materials attached to this course work. */
  readonly materials?: readonly Material[];
  /** State of this course work. */
  readonly state: 'PUBLISHED' | 'DRAFT' | 'DELETED';
  /** Absolute link to this course work in the Classroom web UI. */
  readonly alternateLink: string;
  /** Creation time of this course work (RFC 3339). */
  readonly creationTime: string;
  /** Last update time of this course work (RFC 3339). */
  readonly updateTime: string;
  /** Due date of this course work. */
  readonly dueDate?: { readonly year: number; readonly month: number; readonly day: number };
  /** Due time of this course work. */
  readonly dueTime?: { readonly hours: number; readonly minutes: number };
  /** Scheduled time for this course work to become published (RFC 3339). */
  readonly scheduledTime?: string;
  /** Maximum grade for this course work. */
  readonly maxPoints?: number;
  /** Type of this course work. */
  readonly workType: 'ASSIGNMENT' | 'SHORT_ANSWER_QUESTION' | 'MULTIPLE_CHOICE_QUESTION';
  /** Setting to determine when students are allowed to modify submissions. */
  readonly submissionModificationMode?: 'MODIFIABLE_UNTIL_TURNED_IN' | 'MODIFIABLE';
};

/**
 * Material attached to course work or announcements.
 */
export type Material = {
  /** Google Drive file material. */
  readonly driveFile?: {
    readonly id: string;
    readonly title: string;
    readonly alternateLink: string;
    readonly thumbnailUrl?: string;
  };
  /** YouTube video material. */
  readonly youtubeVideo?: {
    readonly id: string;
    readonly title: string;
    readonly alternateLink: string;
    readonly thumbnailUrl?: string;
  };
  /** Link material. */
  readonly link?: {
    readonly url: string;
    readonly title?: string;
    readonly thumbnailUrl?: string;
  };
  /** Google Forms material. */
  readonly form?: {
    readonly formUrl: string;
    readonly responseUrl: string;
    readonly title: string;
    readonly thumbnailUrl?: string;
  };
};

/**
 * Student submission for course work.
 */
export type StudentSubmission = {
  /** Identifier of the course. */
  readonly courseId: string;
  /** Identifier of the course work. */
  readonly courseWorkId: string;
  /** Classroom-assigned identifier of this submission. */
  readonly id: string;
  /** Identifier of the student who owns this submission. */
  readonly userId: string;
  /** Creation time of this submission (RFC 3339). */
  readonly creationTime: string;
  /** Last update time of this submission (RFC 3339). */
  readonly updateTime: string;
  /** State of this submission. */
  readonly state: 'NEW' | 'CREATED' | 'TURNED_IN' | 'RETURNED' | 'RECLAIMED_BY_STUDENT';
  /** Whether this submission is late. */
  readonly late?: boolean;
  /** Draft grade (can be set before returning). */
  readonly draftGrade?: number;
  /** Assigned grade (set when returning). */
  readonly assignedGrade?: number;
  /** Absolute link to this submission in the Classroom web UI. */
  readonly alternateLink: string;
  /** Type of course work. */
  readonly courseWorkType: 'ASSIGNMENT' | 'SHORT_ANSWER_QUESTION' | 'MULTIPLE_CHOICE_QUESTION';
  /** Assignment submission details. */
  readonly assignmentSubmission?: {
    readonly attachments?: readonly {
      readonly driveFile?: {
        readonly id: string;
        readonly title: string;
        readonly alternateLink: string;
        readonly thumbnailUrl?: string;
      };
      readonly youTubeVideo?: {
        readonly id: string;
        readonly title: string;
        readonly alternateLink: string;
        readonly thumbnailUrl?: string;
      };
      readonly link?: {
        readonly url: string;
        readonly title?: string;
        readonly thumbnailUrl?: string;
      };
    }[];
  };
  /** Short answer submission details. */
  readonly shortAnswerSubmission?: {
    readonly answer: string;
  };
  /** Multiple choice submission details. */
  readonly multipleChoiceSubmission?: {
    readonly answer: string;
  };
};

/**
 * A student enrolled in a course.
 */
export type Student = {
  /** Identifier of the course. */
  readonly courseId: string;
  /** Identifier of the user. */
  readonly userId: string;
  /** User profile for the student. */
  readonly profile: UserProfile;
};

/**
 * A teacher of a course.
 */
export type Teacher = {
  /** Identifier of the course. */
  readonly courseId: string;
  /** Identifier of the user. */
  readonly userId: string;
  /** User profile for the teacher. */
  readonly profile: UserProfile;
};

/**
 * An announcement in a course.
 */
export type Announcement = {
  /** Identifier of the course. */
  readonly courseId: string;
  /** Classroom-assigned identifier of this announcement. */
  readonly id: string;
  /** Text of the announcement. */
  readonly text: string;
  /** State of this announcement. */
  readonly state: 'PUBLISHED' | 'DRAFT' | 'DELETED';
  /** Creation time of this announcement (RFC 3339). */
  readonly creationTime: string;
  /** Last update time of this announcement (RFC 3339). */
  readonly updateTime: string;
  /** Absolute link to this announcement in the Classroom web UI. */
  readonly alternateLink: string;
  /** Identifier of the user who created the announcement. */
  readonly creatorUserId: string;
  /** Materials attached to this announcement. */
  readonly materials?: readonly Material[];
};

/**
 * A guardian of a student.
 */
export type Guardian = {
  /** Identifier of the student. */
  readonly studentId: string;
  /** Identifier of the guardian. */
  readonly guardianId: string;
  /** Email address to which the invitation was sent. */
  readonly invitedEmailAddress: string;
  /** User profile of the guardian. */
  readonly guardianProfile?: UserProfile;
};

// ---------------------------------------------------------------------------
// List response types
// ---------------------------------------------------------------------------

/**
 * Response from listing courses.
 */
export type ListCoursesResponse = {
  /** Courses that matched the list request. */
  readonly courses?: readonly Course[];
  /** Token for fetching the next page of results. */
  readonly nextPageToken?: string;
};

/**
 * Response from listing course work.
 */
export type ListCourseWorkResponse = {
  /** Course work items that matched the list request. */
  readonly courseWork?: readonly CourseWork[];
  /** Token for fetching the next page of results. */
  readonly nextPageToken?: string;
};

/**
 * Response from listing student submissions.
 */
export type ListStudentSubmissionsResponse = {
  /** Student submissions that matched the list request. */
  readonly studentSubmissions?: readonly StudentSubmission[];
  /** Token for fetching the next page of results. */
  readonly nextPageToken?: string;
};

/**
 * Response from listing students.
 */
export type ListStudentsResponse = {
  /** Students that matched the list request. */
  readonly students?: readonly Student[];
  /** Token for fetching the next page of results. */
  readonly nextPageToken?: string;
};

/**
 * Response from listing teachers.
 */
export type ListTeachersResponse = {
  /** Teachers that matched the list request. */
  readonly teachers?: readonly Teacher[];
  /** Token for fetching the next page of results. */
  readonly nextPageToken?: string;
};

/**
 * Response from listing announcements.
 */
export type ListAnnouncementsResponse = {
  /** Announcements that matched the list request. */
  readonly announcements?: readonly Announcement[];
  /** Token for fetching the next page of results. */
  readonly nextPageToken?: string;
};

/**
 * Response from listing guardians.
 */
export type ListGuardiansResponse = {
  /** Guardians that matched the list request. */
  readonly guardians?: readonly Guardian[];
  /** Token for fetching the next page of results. */
  readonly nextPageToken?: string;
};

// ---------------------------------------------------------------------------
// ClassroomApi facade type
// ---------------------------------------------------------------------------

/**
 * Unified Classroom API surface that wraps all Google Classroom operations.
 */
export type ClassroomApi = {
  // -- Courses --------------------------------------------------------------
  listCourses(options?: {
    readonly studentId?: string;
    readonly teacherId?: string;
    readonly pageSize?: number;
    readonly pageToken?: string;
  }): Promise<import('@openworkspace/core').Result<ListCoursesResponse, import('@openworkspace/core').WorkspaceError>>;

  getCourse(courseId: string): Promise<import('@openworkspace/core').Result<Course, import('@openworkspace/core').WorkspaceError>>;

  createCourse(course: {
    readonly name: string;
    readonly section?: string;
    readonly descriptionHeading?: string;
    readonly description?: string;
    readonly room?: string;
    readonly ownerId: string;
  }): Promise<import('@openworkspace/core').Result<Course, import('@openworkspace/core').WorkspaceError>>;

  updateCourse(
    courseId: string,
    course: {
      readonly name?: string;
      readonly section?: string;
      readonly descriptionHeading?: string;
      readonly description?: string;
      readonly room?: string;
    },
  ): Promise<import('@openworkspace/core').Result<Course, import('@openworkspace/core').WorkspaceError>>;

  deleteCourse(courseId: string): Promise<import('@openworkspace/core').Result<void, import('@openworkspace/core').WorkspaceError>>;

  archiveCourse(courseId: string): Promise<import('@openworkspace/core').Result<Course, import('@openworkspace/core').WorkspaceError>>;

  // -- Roster ---------------------------------------------------------------
  listStudents(
    courseId: string,
    options?: { readonly pageSize?: number; readonly pageToken?: string },
  ): Promise<import('@openworkspace/core').Result<ListStudentsResponse, import('@openworkspace/core').WorkspaceError>>;

  listTeachers(
    courseId: string,
    options?: { readonly pageSize?: number; readonly pageToken?: string },
  ): Promise<import('@openworkspace/core').Result<ListTeachersResponse, import('@openworkspace/core').WorkspaceError>>;

  addStudent(courseId: string, enrollmentCode: string): Promise<import('@openworkspace/core').Result<Student, import('@openworkspace/core').WorkspaceError>>;

  addTeacher(courseId: string, userId: string): Promise<import('@openworkspace/core').Result<Teacher, import('@openworkspace/core').WorkspaceError>>;

  removeStudent(courseId: string, userId: string): Promise<import('@openworkspace/core').Result<void, import('@openworkspace/core').WorkspaceError>>;

  removeTeacher(courseId: string, userId: string): Promise<import('@openworkspace/core').Result<void, import('@openworkspace/core').WorkspaceError>>;

  // -- Course work ----------------------------------------------------------
  listCourseWork(
    courseId: string,
    options?: { readonly pageSize?: number; readonly pageToken?: string },
  ): Promise<import('@openworkspace/core').Result<ListCourseWorkResponse, import('@openworkspace/core').WorkspaceError>>;

  getCourseWork(
    courseId: string,
    courseWorkId: string,
  ): Promise<import('@openworkspace/core').Result<CourseWork, import('@openworkspace/core').WorkspaceError>>;

  createCourseWork(
    courseId: string,
    courseWork: {
      readonly title: string;
      readonly description?: string;
      readonly materials?: readonly Material[];
      readonly workType: 'ASSIGNMENT' | 'SHORT_ANSWER_QUESTION' | 'MULTIPLE_CHOICE_QUESTION';
      readonly maxPoints?: number;
      readonly dueDate?: { readonly year: number; readonly month: number; readonly day: number };
      readonly dueTime?: { readonly hours: number; readonly minutes: number };
    },
  ): Promise<import('@openworkspace/core').Result<CourseWork, import('@openworkspace/core').WorkspaceError>>;

  updateCourseWork(
    courseId: string,
    courseWorkId: string,
    courseWork: {
      readonly title?: string;
      readonly description?: string;
      readonly maxPoints?: number;
      readonly dueDate?: { readonly year: number; readonly month: number; readonly day: number };
      readonly dueTime?: { readonly hours: number; readonly minutes: number };
    },
  ): Promise<import('@openworkspace/core').Result<CourseWork, import('@openworkspace/core').WorkspaceError>>;

  deleteCourseWork(
    courseId: string,
    courseWorkId: string,
  ): Promise<import('@openworkspace/core').Result<void, import('@openworkspace/core').WorkspaceError>>;

  // -- Submissions ----------------------------------------------------------
  listSubmissions(
    courseId: string,
    courseWorkId: string,
    options?: { readonly pageSize?: number; readonly pageToken?: string },
  ): Promise<import('@openworkspace/core').Result<ListStudentSubmissionsResponse, import('@openworkspace/core').WorkspaceError>>;

  getSubmission(
    courseId: string,
    courseWorkId: string,
    submissionId: string,
  ): Promise<import('@openworkspace/core').Result<StudentSubmission, import('@openworkspace/core').WorkspaceError>>;

  gradeSubmission(
    courseId: string,
    courseWorkId: string,
    submissionId: string,
    grade: number,
  ): Promise<import('@openworkspace/core').Result<StudentSubmission, import('@openworkspace/core').WorkspaceError>>;

  returnSubmission(
    courseId: string,
    courseWorkId: string,
    submissionId: string,
  ): Promise<import('@openworkspace/core').Result<StudentSubmission, import('@openworkspace/core').WorkspaceError>>;

  // -- Announcements --------------------------------------------------------
  listAnnouncements(
    courseId: string,
    options?: { readonly pageSize?: number; readonly pageToken?: string },
  ): Promise<import('@openworkspace/core').Result<ListAnnouncementsResponse, import('@openworkspace/core').WorkspaceError>>;

  createAnnouncement(
    courseId: string,
    text: string,
  ): Promise<import('@openworkspace/core').Result<Announcement, import('@openworkspace/core').WorkspaceError>>;

  deleteAnnouncement(
    courseId: string,
    announcementId: string,
  ): Promise<import('@openworkspace/core').Result<void, import('@openworkspace/core').WorkspaceError>>;

  // -- Guardians ------------------------------------------------------------
  listGuardians(
    studentId: string,
    options?: { readonly pageSize?: number; readonly pageToken?: string },
  ): Promise<import('@openworkspace/core').Result<ListGuardiansResponse, import('@openworkspace/core').WorkspaceError>>;

  inviteGuardian(
    studentId: string,
    email: string,
  ): Promise<import('@openworkspace/core').Result<Guardian, import('@openworkspace/core').WorkspaceError>>;
};
