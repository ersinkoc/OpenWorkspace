/**
 * @openworkspace/classroom
 * Google Classroom API v1 service package for OpenWorkspace.
 * Zero-dependency -- uses HttpClient from @openworkspace/core.
 */

// Types
export type {
  Course,
  CourseWork,
  StudentSubmission,
  Student,
  Teacher,
  Announcement,
  Guardian,
  UserProfile,
  Name,
  Material,
  ListCoursesResponse,
  ListCourseWorkResponse,
  ListStudentSubmissionsResponse,
  ListStudentsResponse,
  ListTeachersResponse,
  ListAnnouncementsResponse,
  ListGuardiansResponse,
  ClassroomApi,
} from './types.js';

export { BASE_URL } from './types.js';

// Course operations
export {
  listCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  archiveCourse,
} from './courses.js';

// Roster operations
export {
  listStudents,
  listTeachers,
  addStudent,
  addTeacher,
  removeStudent,
  removeTeacher,
} from './roster.js';

// Course work operations
export {
  listCourseWork,
  getCourseWork,
  createCourseWork,
  updateCourseWork,
  deleteCourseWork,
} from './coursework.js';

// Submission operations
export {
  listSubmissions,
  getSubmission,
  gradeSubmission,
  returnSubmission,
} from './submissions.js';

// Announcement operations
export {
  listAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
} from './announcements.js';

// Guardian operations
export {
  listGuardians,
  inviteGuardian,
} from './guardians.js';

// Plugin & facade
export { classroom, classroomPlugin } from './plugin.js';
