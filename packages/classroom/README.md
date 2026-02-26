# @openworkspace/classroom

> Google Classroom API client for OpenWorkspace -- courses, coursework, roster, submissions.

Part of the [OpenWorkspace](https://github.com/ersinkoc/openworkspace) monorepo.

## Install

```bash
npm install @openworkspace/classroom @openworkspace/core
```

## Usage

```typescript
import { createHttpClient } from '@openworkspace/core';
import { listCourses, listStudents, createCourseWork, gradeSubmission } from '@openworkspace/classroom';

const http = createHttpClient({ auth: { accessToken: 'token' } });

// List courses
const result = await listCourses(http);
if (result.ok) {
  for (const course of result.value.courses ?? []) {
    console.log(course.name, course.courseState);
  }
}

// List students in a course
const students = await listStudents(http, 'courseId');

// Create an assignment
await createCourseWork(http, 'courseId', {
  title: 'Homework 1',
  workType: 'ASSIGNMENT',
  maxPoints: 100,
});

// Grade a submission
await gradeSubmission(http, 'courseId', 'courseWorkId', 'submissionId', { assignedGrade: 95 });
```

## API

All functions take an `HttpClient` as the first parameter and return `Result<T, E>`.

### Courses

- `listCourses(http)` -- List all courses
- `getCourse(http, id)` -- Get a course
- `createCourse(http, course)` -- Create a course
- `updateCourse(http, id, course)` -- Update a course
- `deleteCourse(http, id)` -- Delete a course
- `archiveCourse(http, id)` -- Archive a course

### Roster

- `listStudents(http, courseId)` -- List students
- `listTeachers(http, courseId)` -- List teachers
- `addStudent(http, courseId, email)` -- Add a student
- `addTeacher(http, courseId, email)` -- Add a teacher
- `removeStudent(http, courseId, userId)` -- Remove a student
- `removeTeacher(http, courseId, userId)` -- Remove a teacher

### Coursework & Submissions

- `listCourseWork(http, courseId)` -- List assignments
- `getCourseWork(http, courseId, id)` -- Get an assignment
- `createCourseWork(http, courseId, work)` -- Create an assignment
- `updateCourseWork(http, courseId, id, work)` -- Update an assignment
- `deleteCourseWork(http, courseId, id)` -- Delete an assignment
- `listSubmissions(http, courseId, workId)` -- List submissions
- `getSubmission(http, courseId, workId, id)` -- Get a submission
- `gradeSubmission(http, courseId, workId, id, grade)` -- Grade a submission
- `returnSubmission(http, courseId, workId, id)` -- Return a submission

### Announcements & Guardians

- `listAnnouncements(http, courseId)` -- List announcements
- `createAnnouncement(http, courseId, announcement)` -- Create an announcement
- `deleteAnnouncement(http, courseId, id)` -- Delete an announcement
- `listGuardians(http, studentId)` -- List guardians
- `inviteGuardian(http, studentId, email)` -- Invite a guardian

## License

[MIT](../../LICENSE)
