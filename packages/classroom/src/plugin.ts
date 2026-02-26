/**
 * Classroom service plugin for OpenWorkspace.
 * Wraps all classroom operations into a single ClassroomApi facade
 * and exposes a `classroom()` factory function.
 */

import type { HttpClient, Plugin, PluginContext } from '@openworkspace/core';
import type { ClassroomApi } from './types.js';
import { listCourses, getCourse, createCourse, updateCourse, deleteCourse, archiveCourse } from './courses.js';
import { listStudents, listTeachers, addStudent, addTeacher, removeStudent, removeTeacher } from './roster.js';
import { listCourseWork, getCourseWork, createCourseWork, updateCourseWork, deleteCourseWork } from './coursework.js';
import { listSubmissions, getSubmission, gradeSubmission, returnSubmission } from './submissions.js';
import { listAnnouncements, createAnnouncement, deleteAnnouncement } from './announcements.js';
import { listGuardians, inviteGuardian } from './guardians.js';

// ---------------------------------------------------------------------------
// ClassroomApi facade
// ---------------------------------------------------------------------------

/**
 * Creates a {@link ClassroomApi} instance bound to the given HTTP client.
 *
 * @param http - An authenticated HTTP client (typically with OAuth2 token interceptor).
 * @returns A ClassroomApi facade exposing all classroom operations.
 *
 * @example
 * ```ts
 * import { createHttpClient } from '@openworkspace/core';
 * import { classroom } from '@openworkspace/classroom';
 *
 * const http = createHttpClient();
 * const classroomApi = classroom(http);
 *
 * const courses = await classroomApi.listCourses({ teacherId: 'me' });
 * ```
 */
export function classroom(http: HttpClient): ClassroomApi {
  return {
    // Courses
    listCourses: (options) => listCourses(http, options),
    getCourse: (courseId) => getCourse(http, courseId),
    createCourse: (course) => createCourse(http, course),
    updateCourse: (courseId, course) => updateCourse(http, courseId, course),
    deleteCourse: (courseId) => deleteCourse(http, courseId),
    archiveCourse: (courseId) => archiveCourse(http, courseId),

    // Roster
    listStudents: (courseId, options) => listStudents(http, courseId, options),
    listTeachers: (courseId, options) => listTeachers(http, courseId, options),
    addStudent: (courseId, enrollmentCode) => addStudent(http, courseId, enrollmentCode),
    addTeacher: (courseId, userId) => addTeacher(http, courseId, userId),
    removeStudent: (courseId, userId) => removeStudent(http, courseId, userId),
    removeTeacher: (courseId, userId) => removeTeacher(http, courseId, userId),

    // Course work
    listCourseWork: (courseId, options) => listCourseWork(http, courseId, options),
    getCourseWork: (courseId, courseWorkId) => getCourseWork(http, courseId, courseWorkId),
    createCourseWork: (courseId, courseWork) => createCourseWork(http, courseId, courseWork),
    updateCourseWork: (courseId, courseWorkId, courseWork) => updateCourseWork(http, courseId, courseWorkId, courseWork),
    deleteCourseWork: (courseId, courseWorkId) => deleteCourseWork(http, courseId, courseWorkId),

    // Submissions
    listSubmissions: (courseId, courseWorkId, options) => listSubmissions(http, courseId, courseWorkId, options),
    getSubmission: (courseId, courseWorkId, submissionId) => getSubmission(http, courseId, courseWorkId, submissionId),
    gradeSubmission: (courseId, courseWorkId, submissionId, grade) => gradeSubmission(http, courseId, courseWorkId, submissionId, grade),
    returnSubmission: (courseId, courseWorkId, submissionId) => returnSubmission(http, courseId, courseWorkId, submissionId),

    // Announcements
    listAnnouncements: (courseId, options) => listAnnouncements(http, courseId, options),
    createAnnouncement: (courseId, text) => createAnnouncement(http, courseId, text),
    deleteAnnouncement: (courseId, announcementId) => deleteAnnouncement(http, courseId, announcementId),

    // Guardians
    listGuardians: (studentId, options) => listGuardians(http, studentId, options),
    inviteGuardian: (studentId, email) => inviteGuardian(http, studentId, email),
  };
}

// ---------------------------------------------------------------------------
// Kernel Plugin
// ---------------------------------------------------------------------------

/**
 * Plugin name used for kernel registration.
 */
const PLUGIN_NAME = 'classroom';

/**
 * Creates a Classroom kernel plugin.
 * The plugin stores the ClassroomApi instance in the kernel metadata so that
 * other plugins or CLI commands can retrieve it.
 *
 * @param http - An authenticated HTTP client.
 * @returns A Plugin that registers the classroom service with the kernel.
 *
 * @example
 * ```ts
 * import { createKernel, createHttpClient } from '@openworkspace/core';
 * import { classroomPlugin } from '@openworkspace/classroom';
 *
 * const kernel = createKernel();
 * const http = createHttpClient();
 * await kernel.use(classroomPlugin(http));
 * await kernel.init();
 * ```
 */
export function classroomPlugin(http: HttpClient): Plugin {
  const api = classroom(http);

  return {
    name: PLUGIN_NAME,
    version: '0.1.0',

    setup(ctx: PluginContext): void {
      ctx.metadata.set(PLUGIN_NAME, api);
      ctx.logger.debug('Classroom plugin initialized');
    },

    teardown(ctx: PluginContext): void {
      ctx.metadata.delete(PLUGIN_NAME);
      ctx.logger.debug('Classroom plugin torn down');
    },
  };
}
