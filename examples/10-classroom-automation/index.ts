/**
 * Example: Classroom Automation
 * List courses, fetch submissions, and grade them programmatically.
 */
import { createHttpClient, createAuthEngine, createFileTokenStore } from '@openworkspace/core';
import {
  listCourses,
  listCourseWork,
  listSubmissions,
  gradeSubmission,
  returnSubmission,
} from '@openworkspace/classroom';

async function main() {
  const tokenStore = createFileTokenStore();
  const auth = createAuthEngine({ tokenStore });
  const http = createHttpClient({
    defaultHeaders: { Authorization: `Bearer ${await auth.getAccessToken()}` },
  });

  // Step 1: List active courses
  const coursesResult = await listCourses(http, { courseStates: ['ACTIVE'] });
  if (!coursesResult.ok) {
    console.error('Failed to list courses:', coursesResult.error.message);
    return;
  }

  const courses = coursesResult.value.courses ?? [];
  console.log(`Active courses: ${courses.length}`);

  if (courses.length === 0) return;

  const courseId = courses[0].id;
  console.log(`\nUsing course: ${courses[0].name}`);

  // Step 2: List assignments for the first course
  const workResult = await listCourseWork(http, courseId);
  if (!workResult.ok) {
    console.error('Failed to list assignments:', workResult.error.message);
    return;
  }

  const assignments = workResult.value.courseWork ?? [];
  console.log(`Assignments: ${assignments.length}`);

  if (assignments.length === 0) return;

  const assignmentId = assignments[0].id;
  console.log(`\nGrading: ${assignments[0].title}`);

  // Step 3: Fetch and grade submissions
  const subsResult = await listSubmissions(http, courseId, assignmentId);
  if (!subsResult.ok) {
    console.error('Failed to list submissions:', subsResult.error.message);
    return;
  }

  const submissions = subsResult.value.studentSubmissions ?? [];
  console.log(`Submissions to grade: ${submissions.length}`);

  for (const sub of submissions) {
    if (sub.state === 'TURNED_IN') {
      // Assign a grade
      const gradeResult = await gradeSubmission(http, courseId, assignmentId, sub.id, {
        assignedGrade: 95,
        draftGrade: 95,
      });

      if (gradeResult.ok) {
        console.log(`  Graded ${sub.userId}: 95/100`);

        // Return the graded submission to the student
        await returnSubmission(http, courseId, assignmentId, sub.id);
      }
    }
  }

  console.log('\nGrading complete.');
}

main().catch(console.error);
