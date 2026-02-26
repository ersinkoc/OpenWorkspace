/**
 * Operation-level tests for @openworkspace/classroom.
 * Covers courses, roster, coursework, submissions, announcements, and guardians modules.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { HttpClient, HttpResponse, Result } from '@openworkspace/core';
import { ok, err, NetworkError } from '@openworkspace/core';

import { listCourses, getCourse, createCourse, updateCourse, deleteCourse, archiveCourse } from './courses.js';
import { listStudents, addStudent, removeStudent, listTeachers, addTeacher, removeTeacher } from './roster.js';
import { listCourseWork, getCourseWork, createCourseWork, updateCourseWork, deleteCourseWork } from './coursework.js';
import { listSubmissions, getSubmission, gradeSubmission, returnSubmission } from './submissions.js';
import { listAnnouncements, createAnnouncement, deleteAnnouncement } from './announcements.js';
import { listGuardians, inviteGuardian } from './guardians.js';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function createMockHttp(): HttpClient {
  const methods = ['request', 'get', 'post', 'put', 'patch', 'delete'] as const;
  const mock = { interceptors: { request: [], response: [], error: [] } } as unknown as HttpClient;
  for (const method of methods) {
    (mock as Record<string, unknown>)[method] = vi.fn();
  }
  return mock;
}

function mockOk<T>(data: T): Result<HttpResponse<T>, NetworkError> {
  return ok({ status: 200, statusText: 'OK', headers: {}, data });
}

function mockErr(message: string, statusCode?: number): Result<never, NetworkError> {
  return err(new NetworkError(message, { url: 'test' }, statusCode));
}

// ---------------------------------------------------------------------------
// courses.ts
// ---------------------------------------------------------------------------

describe('courses operations', () => {
  let http: HttpClient;
  beforeEach(() => { http = createMockHttp(); });

  describe('listCourses', () => {
    it('should GET courses', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ courses: [{ id: 'c1', name: 'Math 101' }] }));
      const result = await listCourses(http);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.courses?.[0]?.name).toBe('Math 101');
      expect(vi.mocked(http.get).mock.calls[0]?.[0]).toContain('/courses');
    });

    it('should include query params in URL', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ courses: [] }));
      await listCourses(http, { pageSize: 10, pageToken: 'next' });
      const url = vi.mocked(http.get).mock.calls[0]?.[0] as string;
      expect(url).toContain('pageSize=10');
      expect(url).toContain('pageToken=next');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await listCourses(http);
      expect(result.ok).toBe(false);
    });
  });

  describe('getCourse', () => {
    it('should GET a course by id', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ id: 'c1', name: 'Math 101' }));
      const result = await getCourse(http, 'c1');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.id).toBe('c1');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 404));
      const result = await getCourse(http, 'x');
      expect(result.ok).toBe(false);
    });
  });

  describe('createCourse', () => {
    it('should POST new course', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ id: 'c2', name: 'Science' }));
      const result = await createCourse(http, { name: 'Science', ownerId: 'me' });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.name).toBe('Science');
    });

    it('should propagate error', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await createCourse(http, { name: 'X', ownerId: 'me' });
      expect(result.ok).toBe(false);
    });
  });

  describe('updateCourse', () => {
    it('should PATCH course', async () => {
      vi.mocked(http.patch).mockResolvedValueOnce(mockOk({ id: 'c1', name: 'Math 102' }));
      const result = await updateCourse(http, 'c1', { name: 'Math 102' });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.name).toBe('Math 102');
    });

    it('should propagate error', async () => {
      vi.mocked(http.patch).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await updateCourse(http, 'x', { name: 'Y' });
      expect(result.ok).toBe(false);
    });
  });

  describe('deleteCourse', () => {
    it('should DELETE course', async () => {
      vi.mocked(http.delete).mockResolvedValueOnce(mockOk(undefined));
      const result = await deleteCourse(http, 'c1');
      expect(result.ok).toBe(true);
    });

    it('should propagate error', async () => {
      vi.mocked(http.delete).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await deleteCourse(http, 'x');
      expect(result.ok).toBe(false);
    });
  });

  describe('archiveCourse', () => {
    it('should PATCH with courseState ARCHIVED', async () => {
      vi.mocked(http.patch).mockResolvedValueOnce(mockOk({ id: 'c1', courseState: 'ARCHIVED' }));
      const result = await archiveCourse(http, 'c1');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.courseState).toBe('ARCHIVED');
      const url = vi.mocked(http.patch).mock.calls[0]?.[0] as string;
      expect(url).toContain('updateMask=courseState');
      expect(vi.mocked(http.patch).mock.calls[0]?.[1]?.body).toEqual({ courseState: 'ARCHIVED' });
    });

    it('should propagate error', async () => {
      vi.mocked(http.patch).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await archiveCourse(http, 'x');
      expect(result.ok).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// roster.ts
// ---------------------------------------------------------------------------

describe('roster operations', () => {
  let http: HttpClient;
  beforeEach(() => { http = createMockHttp(); });

  describe('listStudents', () => {
    it('should GET students in a course', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ students: [{ userId: 's1' }] }));
      const result = await listStudents(http, 'c1');
      expect(result.ok).toBe(true);
      expect(vi.mocked(http.get).mock.calls[0]?.[0]).toContain('/courses/c1/students');
    });

    it('should include query params', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ students: [] }));
      await listStudents(http, 'c1', { pageSize: 10, pageToken: 'tok' });
      const url = vi.mocked(http.get).mock.calls[0]?.[0] as string;
      expect(url).toContain('pageSize=10');
      expect(url).toContain('pageToken=tok');
    });

    it('should wrap non-WorkspaceError', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(err(new Error('raw') as unknown as NetworkError));
      const result = await listStudents(http, 'c1');
      expect(result.ok).toBe(false);
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await listStudents(http, 'x');
      expect(result.ok).toBe(false);
    });
  });

  describe('addStudent', () => {
    it('should POST with enrollment code', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ userId: 's1' }));
      const result = await addStudent(http, 'c1', 'abc123');
      expect(result.ok).toBe(true);
      const url = vi.mocked(http.post).mock.calls[0]?.[0] as string;
      expect(url).toContain('enrollmentCode=abc123');
      expect(vi.mocked(http.post).mock.calls[0]?.[1]?.body).toEqual({ userId: 'me' });
    });

    it('should propagate error', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await addStudent(http, 'x', 'code');
      expect(result.ok).toBe(false);
    });
  });

  describe('removeStudent', () => {
    it('should DELETE student', async () => {
      vi.mocked(http.delete).mockResolvedValueOnce(mockOk(undefined));
      const result = await removeStudent(http, 'c1', 's1');
      expect(result.ok).toBe(true);
      expect(vi.mocked(http.delete).mock.calls[0]?.[0]).toContain('/courses/c1/students/s1');
    });

    it('should propagate error', async () => {
      vi.mocked(http.delete).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await removeStudent(http, 'x', 'y');
      expect(result.ok).toBe(false);
    });
  });

  describe('listTeachers', () => {
    it('should GET teachers in a course', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ teachers: [{ userId: 't1' }] }));
      const result = await listTeachers(http, 'c1');
      expect(result.ok).toBe(true);
      expect(vi.mocked(http.get).mock.calls[0]?.[0]).toContain('/courses/c1/teachers');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await listTeachers(http, 'x');
      expect(result.ok).toBe(false);
    });
  });

  describe('addTeacher', () => {
    it('should POST teacher', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ userId: 't1' }));
      const result = await addTeacher(http, 'c1', 't1');
      expect(result.ok).toBe(true);
      expect(vi.mocked(http.post).mock.calls[0]?.[1]?.body).toEqual({ userId: 't1' });
    });

    it('should propagate error', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await addTeacher(http, 'x', 'y');
      expect(result.ok).toBe(false);
    });
  });

  describe('removeTeacher', () => {
    it('should DELETE teacher', async () => {
      vi.mocked(http.delete).mockResolvedValueOnce(mockOk(undefined));
      const result = await removeTeacher(http, 'c1', 't1');
      expect(result.ok).toBe(true);
      expect(vi.mocked(http.delete).mock.calls[0]?.[0]).toContain('/courses/c1/teachers/t1');
    });

    it('should propagate error', async () => {
      vi.mocked(http.delete).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await removeTeacher(http, 'x', 'y');
      expect(result.ok).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// coursework.ts
// ---------------------------------------------------------------------------

describe('coursework operations', () => {
  let http: HttpClient;
  beforeEach(() => { http = createMockHttp(); });

  describe('listCourseWork', () => {
    it('should GET course work', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ courseWork: [{ id: 'w1', title: 'HW1' }] }));
      const result = await listCourseWork(http, 'c1');
      expect(result.ok).toBe(true);
      expect(vi.mocked(http.get).mock.calls[0]?.[0]).toContain('/courses/c1/courseWork');
    });

    it('should include query params', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ courseWork: [] }));
      await listCourseWork(http, 'c1', { pageSize: 5, pageToken: 'tok' });
      const url = vi.mocked(http.get).mock.calls[0]?.[0] as string;
      expect(url).toContain('pageSize=5');
      expect(url).toContain('pageToken=tok');
    });

    it('should wrap non-WorkspaceError', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(err(new Error('raw') as unknown as NetworkError));
      const result = await listCourseWork(http, 'c1');
      expect(result.ok).toBe(false);
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await listCourseWork(http, 'x');
      expect(result.ok).toBe(false);
    });
  });

  describe('getCourseWork', () => {
    it('should GET course work by id', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ id: 'w1', title: 'HW1' }));
      const result = await getCourseWork(http, 'c1', 'w1');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.title).toBe('HW1');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 404));
      const result = await getCourseWork(http, 'x', 'y');
      expect(result.ok).toBe(false);
    });
  });

  describe('createCourseWork', () => {
    it('should POST new course work', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ id: 'w2', title: 'HW2' }));
      const result = await createCourseWork(http, 'c1', { title: 'HW2', workType: 'ASSIGNMENT' });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.title).toBe('HW2');
    });

    it('should propagate error', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await createCourseWork(http, 'x', { title: 'X', workType: 'ASSIGNMENT' });
      expect(result.ok).toBe(false);
    });
  });

  describe('updateCourseWork', () => {
    it('should PATCH course work', async () => {
      vi.mocked(http.patch).mockResolvedValueOnce(mockOk({ id: 'w1', title: 'Updated' }));
      const result = await updateCourseWork(http, 'c1', 'w1', { title: 'Updated' });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.title).toBe('Updated');
    });

    it('should propagate error', async () => {
      vi.mocked(http.patch).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await updateCourseWork(http, 'x', 'y', { title: 'Z' });
      expect(result.ok).toBe(false);
    });
  });

  describe('deleteCourseWork', () => {
    it('should DELETE course work', async () => {
      vi.mocked(http.delete).mockResolvedValueOnce(mockOk(undefined));
      const result = await deleteCourseWork(http, 'c1', 'w1');
      expect(result.ok).toBe(true);
    });

    it('should propagate error', async () => {
      vi.mocked(http.delete).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await deleteCourseWork(http, 'x', 'y');
      expect(result.ok).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// submissions.ts
// ---------------------------------------------------------------------------

describe('submissions operations', () => {
  let http: HttpClient;
  beforeEach(() => { http = createMockHttp(); });

  describe('listSubmissions', () => {
    it('should GET submissions', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ studentSubmissions: [{ id: 'sub1' }] }));
      const result = await listSubmissions(http, 'c1', 'w1');
      expect(result.ok).toBe(true);
      expect(vi.mocked(http.get).mock.calls[0]?.[0]).toContain('/studentSubmissions');
    });

    it('should include query params', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ studentSubmissions: [] }));
      await listSubmissions(http, 'c1', 'w1', { pageSize: 10, pageToken: 'tok' });
      const url = vi.mocked(http.get).mock.calls[0]?.[0] as string;
      expect(url).toContain('pageSize=10');
      expect(url).toContain('pageToken=tok');
    });

    it('should wrap non-WorkspaceError', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(err(new Error('raw') as unknown as NetworkError));
      const result = await listSubmissions(http, 'c1', 'w1');
      expect(result.ok).toBe(false);
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await listSubmissions(http, 'x', 'y');
      expect(result.ok).toBe(false);
    });
  });

  describe('getSubmission', () => {
    it('should GET a submission by id', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ id: 'sub1', state: 'TURNED_IN' }));
      const result = await getSubmission(http, 'c1', 'w1', 'sub1');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.state).toBe('TURNED_IN');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 404));
      const result = await getSubmission(http, 'x', 'y', 'z');
      expect(result.ok).toBe(false);
    });
  });

  describe('gradeSubmission', () => {
    it('should PATCH with assigned grade', async () => {
      vi.mocked(http.patch).mockResolvedValueOnce(mockOk({ id: 'sub1', assignedGrade: 95 }));
      const result = await gradeSubmission(http, 'c1', 'w1', 'sub1', 95);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.assignedGrade).toBe(95);
      const url = vi.mocked(http.patch).mock.calls[0]?.[0] as string;
      expect(url).toContain('updateMask=assignedGrade');
      expect(vi.mocked(http.patch).mock.calls[0]?.[1]?.body).toEqual({ assignedGrade: 95 });
    });

    it('should propagate error', async () => {
      vi.mocked(http.patch).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await gradeSubmission(http, 'x', 'y', 'z', 0);
      expect(result.ok).toBe(false);
    });
  });

  describe('returnSubmission', () => {
    it('should POST to return endpoint', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ id: 'sub1', state: 'RETURNED' }));
      const result = await returnSubmission(http, 'c1', 'w1', 'sub1');
      expect(result.ok).toBe(true);
      const url = vi.mocked(http.post).mock.calls[0]?.[0] as string;
      expect(url).toContain(':return');
    });

    it('should propagate error', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await returnSubmission(http, 'x', 'y', 'z');
      expect(result.ok).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// announcements.ts
// ---------------------------------------------------------------------------

describe('announcements operations', () => {
  let http: HttpClient;
  beforeEach(() => { http = createMockHttp(); });

  describe('listAnnouncements', () => {
    it('should GET announcements', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ announcements: [{ id: 'a1', text: 'Hello' }] }));
      const result = await listAnnouncements(http, 'c1');
      expect(result.ok).toBe(true);
      expect(vi.mocked(http.get).mock.calls[0]?.[0]).toContain('/announcements');
    });

    it('should include query params', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ announcements: [] }));
      await listAnnouncements(http, 'c1', { pageSize: 5, pageToken: 'tok' });
      const url = vi.mocked(http.get).mock.calls[0]?.[0] as string;
      expect(url).toContain('pageSize=5');
      expect(url).toContain('pageToken=tok');
    });

    it('should wrap non-WorkspaceError', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(err(new Error('raw') as unknown as NetworkError));
      const result = await listAnnouncements(http, 'c1');
      expect(result.ok).toBe(false);
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await listAnnouncements(http, 'x');
      expect(result.ok).toBe(false);
    });
  });

  describe('createAnnouncement', () => {
    it('should POST new announcement', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ id: 'a2', text: 'Class cancelled' }));
      const result = await createAnnouncement(http, 'c1', 'Class cancelled');
      expect(result.ok).toBe(true);
      expect(vi.mocked(http.post).mock.calls[0]?.[1]?.body).toEqual({ text: 'Class cancelled' });
    });

    it('should propagate error', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await createAnnouncement(http, 'x', 'msg');
      expect(result.ok).toBe(false);
    });
  });

  describe('deleteAnnouncement', () => {
    it('should DELETE announcement', async () => {
      vi.mocked(http.delete).mockResolvedValueOnce(mockOk(undefined));
      const result = await deleteAnnouncement(http, 'c1', 'a1');
      expect(result.ok).toBe(true);
      expect(vi.mocked(http.delete).mock.calls[0]?.[0]).toContain('/announcements/a1');
    });

    it('should propagate error', async () => {
      vi.mocked(http.delete).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await deleteAnnouncement(http, 'x', 'y');
      expect(result.ok).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// guardians.ts
// ---------------------------------------------------------------------------

describe('guardians operations', () => {
  let http: HttpClient;
  beforeEach(() => { http = createMockHttp(); });

  describe('listGuardians', () => {
    it('should GET guardians for a student', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ guardians: [{ invitedEmailAddress: 'parent@example.com' }] }));
      const result = await listGuardians(http, 'me');
      expect(result.ok).toBe(true);
      expect(vi.mocked(http.get).mock.calls[0]?.[0]).toContain('/userProfiles/me/guardians');
    });

    it('should include query params', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ guardians: [] }));
      await listGuardians(http, 'me', { pageSize: 5, pageToken: 'tok' });
      const url = vi.mocked(http.get).mock.calls[0]?.[0] as string;
      expect(url).toContain('pageSize=5');
      expect(url).toContain('pageToken=tok');
    });

    it('should wrap non-WorkspaceError', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(err(new Error('raw') as unknown as NetworkError));
      const result = await listGuardians(http, 'me');
      expect(result.ok).toBe(false);
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await listGuardians(http, 'x');
      expect(result.ok).toBe(false);
    });
  });

  describe('inviteGuardian', () => {
    it('should POST guardian invitation', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ invitedEmailAddress: 'parent@example.com' }));
      const result = await inviteGuardian(http, 'me', 'parent@example.com');
      expect(result.ok).toBe(true);
      expect(vi.mocked(http.post).mock.calls[0]?.[0]).toContain('/guardianInvitations');
      expect(vi.mocked(http.post).mock.calls[0]?.[1]?.body).toEqual({ invitedEmailAddress: 'parent@example.com' });
    });

    it('should propagate error', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await inviteGuardian(http, 'x', 'email@example.com');
      expect(result.ok).toBe(false);
    });
  });
});
