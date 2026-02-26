/**
 * Tests for @openworkspace/classroom.
 * Uses mock HttpClient to verify all operations without network access.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { HttpClient, HttpResponse, Result } from '@openworkspace/core';
import { ok, err, NetworkError } from '@openworkspace/core';
import { classroom, classroomPlugin } from './plugin.js';
import { listCourses, getCourse, createCourse, updateCourse, deleteCourse, archiveCourse } from './courses.js';
import { listStudents, listTeachers, addStudent, addTeacher, removeStudent, removeTeacher } from './roster.js';
import { listCourseWork, getCourseWork, createCourseWork, updateCourseWork, deleteCourseWork } from './coursework.js';
import { listSubmissions, getSubmission, gradeSubmission, returnSubmission } from './submissions.js';
import { listAnnouncements, createAnnouncement, deleteAnnouncement } from './announcements.js';
import { listGuardians, inviteGuardian } from './guardians.js';
import type {
  Course,
  CourseWork,
  StudentSubmission,
  Student,
  Teacher,
  Announcement,
  Guardian,
  ListCoursesResponse,
  ListCourseWorkResponse,
  ListStudentSubmissionsResponse,
  ListStudentsResponse,
  ListTeachersResponse,
  ListAnnouncementsResponse,
  ListGuardiansResponse,
} from './types.js';

// ---------------------------------------------------------------------------
// Mock HttpClient factory
// ---------------------------------------------------------------------------

type MockHttpClient = HttpClient & {
  _getHandler: ReturnType<typeof vi.fn>;
  _postHandler: ReturnType<typeof vi.fn>;
  _patchHandler: ReturnType<typeof vi.fn>;
  _putHandler: ReturnType<typeof vi.fn>;
  _deleteHandler: ReturnType<typeof vi.fn>;
};

function mockResponse<T>(data: T, status = 200): Result<HttpResponse<T>, NetworkError> {
  return ok({
    status,
    statusText: 'OK',
    headers: { 'content-type': 'application/json' },
    data,
  });
}

function mockError(message: string, status = 500): Result<never, NetworkError> {
  return err(new NetworkError(message, { status }, status));
}

function createMockHttp(): MockHttpClient {
  const getHandler = vi.fn();
  const postHandler = vi.fn();
  const patchHandler = vi.fn();
  const putHandler = vi.fn();
  const deleteHandler = vi.fn();

  return {
    request: vi.fn(),
    get: getHandler,
    post: postHandler,
    put: putHandler,
    patch: patchHandler,
    delete: deleteHandler,
    interceptors: { request: [], response: [], error: [] },
    _getHandler: getHandler,
    _postHandler: postHandler,
    _patchHandler: patchHandler,
    _putHandler: putHandler,
    _deleteHandler: deleteHandler,
  };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const COURSE_FIXTURE: Course = {
  id: 'course-123',
  name: 'Math 101',
  section: 'Section A',
  ownerId: 'teacher-1',
  creationTime: '2025-01-01T00:00:00Z',
  updateTime: '2025-01-01T00:00:00Z',
  courseState: 'ACTIVE',
  alternateLink: 'https://classroom.google.com/c/course-123',
};

const COURSE_LIST_FIXTURE: ListCoursesResponse = {
  courses: [COURSE_FIXTURE],
  nextPageToken: 'next-token',
};

const COURSE_WORK_FIXTURE: CourseWork = {
  courseId: 'course-123',
  id: 'work-456',
  title: 'Homework 1',
  description: 'Complete exercises 1-10',
  state: 'PUBLISHED',
  alternateLink: 'https://classroom.google.com/c/course-123/a/work-456',
  creationTime: '2025-01-02T00:00:00Z',
  updateTime: '2025-01-02T00:00:00Z',
  workType: 'ASSIGNMENT',
  maxPoints: 100,
};

const COURSE_WORK_LIST_FIXTURE: ListCourseWorkResponse = {
  courseWork: [COURSE_WORK_FIXTURE],
};

const SUBMISSION_FIXTURE: StudentSubmission = {
  courseId: 'course-123',
  courseWorkId: 'work-456',
  id: 'sub-789',
  userId: 'student-1',
  creationTime: '2025-01-03T00:00:00Z',
  updateTime: '2025-01-03T00:00:00Z',
  state: 'TURNED_IN',
  alternateLink: 'https://classroom.google.com/c/course-123/a/work-456/submissions/sub-789',
  courseWorkType: 'ASSIGNMENT',
  assignedGrade: 95,
};

const SUBMISSION_LIST_FIXTURE: ListStudentSubmissionsResponse = {
  studentSubmissions: [SUBMISSION_FIXTURE],
};

const STUDENT_FIXTURE: Student = {
  courseId: 'course-123',
  userId: 'student-1',
  profile: {
    id: 'student-1',
    name: {
      givenName: 'Alice',
      familyName: 'Smith',
      fullName: 'Alice Smith',
    },
    emailAddress: 'alice@example.com',
  },
};

const STUDENT_LIST_FIXTURE: ListStudentsResponse = {
  students: [STUDENT_FIXTURE],
};

const TEACHER_FIXTURE: Teacher = {
  courseId: 'course-123',
  userId: 'teacher-1',
  profile: {
    id: 'teacher-1',
    name: {
      givenName: 'Bob',
      familyName: 'Johnson',
      fullName: 'Bob Johnson',
    },
    emailAddress: 'bob@example.com',
  },
};

const TEACHER_LIST_FIXTURE: ListTeachersResponse = {
  teachers: [TEACHER_FIXTURE],
};

const ANNOUNCEMENT_FIXTURE: Announcement = {
  courseId: 'course-123',
  id: 'ann-101',
  text: 'Class is cancelled tomorrow',
  state: 'PUBLISHED',
  creationTime: '2025-01-04T00:00:00Z',
  updateTime: '2025-01-04T00:00:00Z',
  alternateLink: 'https://classroom.google.com/c/course-123/p/ann-101',
  creatorUserId: 'teacher-1',
};

const ANNOUNCEMENT_LIST_FIXTURE: ListAnnouncementsResponse = {
  announcements: [ANNOUNCEMENT_FIXTURE],
};

const GUARDIAN_FIXTURE: Guardian = {
  studentId: 'student-1',
  guardianId: 'guardian-1',
  invitedEmailAddress: 'parent@example.com',
};

const GUARDIAN_LIST_FIXTURE: ListGuardiansResponse = {
  guardians: [GUARDIAN_FIXTURE],
};

// ---------------------------------------------------------------------------
// Tests: Plugin creation
// ---------------------------------------------------------------------------

describe('classroom()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('creates a ClassroomApi with all expected methods', () => {
    const api = classroom(http);

    expect(typeof api.listCourses).toBe('function');
    expect(typeof api.getCourse).toBe('function');
    expect(typeof api.createCourse).toBe('function');
    expect(typeof api.updateCourse).toBe('function');
    expect(typeof api.deleteCourse).toBe('function');
    expect(typeof api.archiveCourse).toBe('function');
    expect(typeof api.listStudents).toBe('function');
    expect(typeof api.listTeachers).toBe('function');
    expect(typeof api.addStudent).toBe('function');
    expect(typeof api.addTeacher).toBe('function');
    expect(typeof api.removeStudent).toBe('function');
    expect(typeof api.removeTeacher).toBe('function');
    expect(typeof api.listCourseWork).toBe('function');
    expect(typeof api.getCourseWork).toBe('function');
    expect(typeof api.createCourseWork).toBe('function');
    expect(typeof api.updateCourseWork).toBe('function');
    expect(typeof api.deleteCourseWork).toBe('function');
    expect(typeof api.listSubmissions).toBe('function');
    expect(typeof api.getSubmission).toBe('function');
    expect(typeof api.gradeSubmission).toBe('function');
    expect(typeof api.returnSubmission).toBe('function');
    expect(typeof api.listAnnouncements).toBe('function');
    expect(typeof api.createAnnouncement).toBe('function');
    expect(typeof api.deleteAnnouncement).toBe('function');
    expect(typeof api.listGuardians).toBe('function');
    expect(typeof api.inviteGuardian).toBe('function');
  });
});

describe('classroomPlugin()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('creates a plugin with the correct name and version', () => {
    const plugin = classroomPlugin(http);

    expect(plugin.name).toBe('classroom');
    expect(plugin.version).toBe('0.1.0');
    expect(typeof plugin.setup).toBe('function');
    expect(typeof plugin.teardown).toBe('function');
  });

  it('stores ClassroomApi in metadata on setup', () => {
    const plugin = classroomPlugin(http);
    const metadata = new Map<string, unknown>();
    const ctx = {
      events: {} as never,
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } as never,
      metadata,
      registerCommand: vi.fn(),
      registerTool: vi.fn(),
    };

    plugin.setup(ctx);

    expect(metadata.has('classroom')).toBe(true);
    const api = metadata.get('classroom') as ReturnType<typeof classroom>;
    expect(typeof api.listCourses).toBe('function');
  });

  it('removes ClassroomApi from metadata on teardown', () => {
    const plugin = classroomPlugin(http);
    const metadata = new Map<string, unknown>();
    const ctx = {
      events: {} as never,
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } as never,
      metadata,
      registerCommand: vi.fn(),
      registerTool: vi.fn(),
    };

    plugin.setup(ctx);
    expect(metadata.has('classroom')).toBe(true);

    plugin.teardown!(ctx);
    expect(metadata.has('classroom')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tests: Course operations
// ---------------------------------------------------------------------------

describe('listCourses()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('returns a list of courses on success', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(COURSE_LIST_FIXTURE));

    const result = await listCourses(http, { teacherId: 'me' });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.courses).toHaveLength(1);
      const first = result.value.courses?.[0];
      expect(first?.name).toBe('Math 101');
    }

    expect(http._getHandler).toHaveBeenCalledOnce();
    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/courses');
    expect(url).toContain('teacherId=me');
  });

  it('returns error on network failure', async () => {
    http._getHandler.mockResolvedValueOnce(mockError('Connection refused'));

    const result = await listCourses(http);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('Connection refused');
    }
  });
});

describe('getCourse()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('returns a single course on success', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(COURSE_FIXTURE));

    const result = await getCourse(http, 'course-123');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe('course-123');
      expect(result.value.name).toBe('Math 101');
    }

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/courses/course-123');
  });
});

describe('createCourse()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('creates a course and returns it', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(COURSE_FIXTURE));

    const result = await createCourse(http, {
      name: 'Math 101',
      ownerId: 'me',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe('course-123');
    }

    expect(http._postHandler).toHaveBeenCalledOnce();
    const config = http._postHandler.mock.calls[0]?.[1] as { body: Record<string, unknown> };
    expect(config.body).toMatchObject({
      name: 'Math 101',
      ownerId: 'me',
    });
  });
});

describe('updateCourse()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('patches a course and returns the updated version', async () => {
    const updatedCourse = { ...COURSE_FIXTURE, name: 'Math 102' };
    http._patchHandler.mockResolvedValueOnce(mockResponse(updatedCourse));

    const result = await updateCourse(http, 'course-123', {
      name: 'Math 102',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe('Math 102');
    }

    expect(http._patchHandler).toHaveBeenCalledOnce();
  });
});

describe('deleteCourse()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('deletes a course successfully', async () => {
    http._deleteHandler.mockResolvedValueOnce(mockResponse(null, 204));

    const result = await deleteCourse(http, 'course-123');

    expect(result.ok).toBe(true);
    expect(http._deleteHandler).toHaveBeenCalledOnce();
  });
});

describe('archiveCourse()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('archives a course by setting state to ARCHIVED', async () => {
    const archivedCourse = { ...COURSE_FIXTURE, courseState: 'ARCHIVED' as const };
    http._patchHandler.mockResolvedValueOnce(mockResponse(archivedCourse));

    const result = await archiveCourse(http, 'course-123');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.courseState).toBe('ARCHIVED');
    }

    const url = http._patchHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('updateMask=courseState');
  });
});

// ---------------------------------------------------------------------------
// Tests: Roster operations
// ---------------------------------------------------------------------------

describe('listStudents()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('returns a list of students on success', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(STUDENT_LIST_FIXTURE));

    const result = await listStudents(http, 'course-123');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.students).toHaveLength(1);
      const student = result.value.students?.[0];
      expect(student?.profile.name.fullName).toBe('Alice Smith');
    }
  });
});

describe('listTeachers()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('returns a list of teachers on success', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(TEACHER_LIST_FIXTURE));

    const result = await listTeachers(http, 'course-123');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.teachers).toHaveLength(1);
      const teacher = result.value.teachers?.[0];
      expect(teacher?.profile.name.fullName).toBe('Bob Johnson');
    }
  });
});

describe('addStudent()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('adds a student using enrollment code', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(STUDENT_FIXTURE));

    const result = await addStudent(http, 'course-123', 'enroll-code');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.userId).toBe('student-1');
    }

    const url = http._postHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('enrollmentCode=enroll-code');
  });
});

describe('addTeacher()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('adds a teacher to a course', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(TEACHER_FIXTURE));

    const result = await addTeacher(http, 'course-123', 'teacher-1');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.userId).toBe('teacher-1');
    }
  });
});

describe('removeStudent()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('removes a student from a course', async () => {
    http._deleteHandler.mockResolvedValueOnce(mockResponse(null, 204));

    const result = await removeStudent(http, 'course-123', 'student-1');

    expect(result.ok).toBe(true);
  });
});

describe('removeTeacher()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('removes a teacher from a course', async () => {
    http._deleteHandler.mockResolvedValueOnce(mockResponse(null, 204));

    const result = await removeTeacher(http, 'course-123', 'teacher-1');

    expect(result.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tests: Course work operations
// ---------------------------------------------------------------------------

describe('listCourseWork()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('returns a list of course work on success', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(COURSE_WORK_LIST_FIXTURE));

    const result = await listCourseWork(http, 'course-123');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.courseWork).toHaveLength(1);
      const work = result.value.courseWork?.[0];
      expect(work?.title).toBe('Homework 1');
    }
  });
});

describe('getCourseWork()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('returns a single course work item on success', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(COURSE_WORK_FIXTURE));

    const result = await getCourseWork(http, 'course-123', 'work-456');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe('work-456');
      expect(result.value.title).toBe('Homework 1');
    }
  });
});

describe('createCourseWork()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('creates course work and returns it', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(COURSE_WORK_FIXTURE));

    const result = await createCourseWork(http, 'course-123', {
      title: 'Homework 1',
      workType: 'ASSIGNMENT',
      maxPoints: 100,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe('work-456');
    }
  });
});

describe('updateCourseWork()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('updates course work and returns the updated version', async () => {
    const updatedWork = { ...COURSE_WORK_FIXTURE, title: 'Homework 1 (Updated)' };
    http._patchHandler.mockResolvedValueOnce(mockResponse(updatedWork));

    const result = await updateCourseWork(http, 'course-123', 'work-456', {
      title: 'Homework 1 (Updated)',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.title).toBe('Homework 1 (Updated)');
    }
  });
});

describe('deleteCourseWork()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('deletes course work successfully', async () => {
    http._deleteHandler.mockResolvedValueOnce(mockResponse(null, 204));

    const result = await deleteCourseWork(http, 'course-123', 'work-456');

    expect(result.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tests: Submission operations
// ---------------------------------------------------------------------------

describe('listSubmissions()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('returns a list of submissions on success', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(SUBMISSION_LIST_FIXTURE));

    const result = await listSubmissions(http, 'course-123', 'work-456');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.studentSubmissions).toHaveLength(1);
      const submission = result.value.studentSubmissions?.[0];
      expect(submission?.state).toBe('TURNED_IN');
    }
  });
});

describe('getSubmission()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('returns a single submission on success', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(SUBMISSION_FIXTURE));

    const result = await getSubmission(http, 'course-123', 'work-456', 'sub-789');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe('sub-789');
      expect(result.value.assignedGrade).toBe(95);
    }
  });
});

describe('gradeSubmission()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('grades a submission and returns the updated version', async () => {
    const gradedSubmission = { ...SUBMISSION_FIXTURE, assignedGrade: 98 };
    http._patchHandler.mockResolvedValueOnce(mockResponse(gradedSubmission));

    const result = await gradeSubmission(http, 'course-123', 'work-456', 'sub-789', 98);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.assignedGrade).toBe(98);
    }

    const url = http._patchHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('updateMask=assignedGrade');
  });
});

describe('returnSubmission()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('returns a submission to the student', async () => {
    const returnedSubmission = { ...SUBMISSION_FIXTURE, state: 'RETURNED' as const };
    http._postHandler.mockResolvedValueOnce(mockResponse(returnedSubmission));

    const result = await returnSubmission(http, 'course-123', 'work-456', 'sub-789');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.state).toBe('RETURNED');
    }

    const url = http._postHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain(':return');
  });
});

// ---------------------------------------------------------------------------
// Tests: Announcement operations
// ---------------------------------------------------------------------------

describe('listAnnouncements()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('returns a list of announcements on success', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(ANNOUNCEMENT_LIST_FIXTURE));

    const result = await listAnnouncements(http, 'course-123');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.announcements).toHaveLength(1);
      const announcement = result.value.announcements?.[0];
      expect(announcement?.text).toBe('Class is cancelled tomorrow');
    }
  });
});

describe('createAnnouncement()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('creates an announcement and returns it', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(ANNOUNCEMENT_FIXTURE));

    const result = await createAnnouncement(http, 'course-123', 'Class is cancelled tomorrow');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe('ann-101');
      expect(result.value.text).toBe('Class is cancelled tomorrow');
    }
  });
});

describe('deleteAnnouncement()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('deletes an announcement successfully', async () => {
    http._deleteHandler.mockResolvedValueOnce(mockResponse(null, 204));

    const result = await deleteAnnouncement(http, 'course-123', 'ann-101');

    expect(result.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tests: Guardian operations
// ---------------------------------------------------------------------------

describe('listGuardians()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('returns a list of guardians on success', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(GUARDIAN_LIST_FIXTURE));

    const result = await listGuardians(http, 'me');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.guardians).toHaveLength(1);
      const guardian = result.value.guardians?.[0];
      expect(guardian?.invitedEmailAddress).toBe('parent@example.com');
    }
  });
});

describe('inviteGuardian()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('invites a guardian and returns the invitation', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(GUARDIAN_FIXTURE));

    const result = await inviteGuardian(http, 'me', 'parent@example.com');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.invitedEmailAddress).toBe('parent@example.com');
    }

    const url = http._postHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/userProfiles/me/guardianInvitations');
  });
});

// ---------------------------------------------------------------------------
// Tests: ClassroomApi facade (via plugin)
// ---------------------------------------------------------------------------

describe('ClassroomApi facade', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('delegates listCourses through the facade', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(COURSE_LIST_FIXTURE));

    const api = classroom(http);
    const result = await api.listCourses({ teacherId: 'me' });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.courses).toHaveLength(1);
    }
  });

  it('delegates createCourseWork through the facade', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(COURSE_WORK_FIXTURE));

    const api = classroom(http);
    const result = await api.createCourseWork('course-123', {
      title: 'Homework 1',
      workType: 'ASSIGNMENT',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe('work-456');
    }
  });

  it('delegates gradeSubmission through the facade', async () => {
    const gradedSubmission = { ...SUBMISSION_FIXTURE, assignedGrade: 100 };
    http._patchHandler.mockResolvedValueOnce(mockResponse(gradedSubmission));

    const api = classroom(http);
    const result = await api.gradeSubmission('course-123', 'work-456', 'sub-789', 100);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.assignedGrade).toBe(100);
    }
  });

  it('delegates inviteGuardian through the facade', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(GUARDIAN_FIXTURE));

    const api = classroom(http);
    const result = await api.inviteGuardian('me', 'parent@example.com');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.invitedEmailAddress).toBe('parent@example.com');
    }
  });
});

// ---------------------------------------------------------------------------
// Tests: URL encoding
// ---------------------------------------------------------------------------

describe('URL encoding', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('encodes special characters in courseId', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(COURSE_FIXTURE));

    await getCourse(http, 'course/with/slashes');

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/courses/course%2Fwith%2Fslashes');
  });

  it('encodes special characters in courseWorkId', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(COURSE_WORK_FIXTURE));

    await getCourseWork(http, 'course-123', 'work@special');

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/courseWork/work%40special');
  });
});
