// Default Bangladesh grading scale
export const DEFAULT_GRADE_SCALE = [
  { minPercent: 80, grade: 'A+', gpa: 5.00 },
  { minPercent: 70, grade: 'A',  gpa: 4.00 },
  { minPercent: 60, grade: 'A-', gpa: 3.50 },
  { minPercent: 50, grade: 'B',  gpa: 3.00 },
  { minPercent: 40, grade: 'C',  gpa: 2.00 },
  { minPercent: 33, grade: 'D',  gpa: 1.00 },
  { minPercent: 0,  grade: 'F',  gpa: 0.00 },
];

/** Return the grade entry for a given percentage */
export function getGradeInfo(percentage, gradeScale = DEFAULT_GRADE_SCALE) {
  const sorted = [...gradeScale].sort((a, b) => b.minPercent - a.minPercent);
  for (const entry of sorted) {
    if (percentage >= entry.minPercent) return entry;
  }
  return { grade: 'F', gpa: 0.00 };
}

/** Return a letter grade for a given GPA value */
export function getGradeFromGpa(gpa, gradeScale = DEFAULT_GRADE_SCALE) {
  const sorted = [...gradeScale].sort((a, b) => b.gpa - a.gpa);
  for (const entry of sorted) {
    if (gpa >= entry.gpa) return entry.grade;
  }
  return 'F';
}

/**
 * Calculate result for one subject.
 * marks = { ca, mcq, creative }   (strings or numbers)
 * subject = { name, fullMarks }
 * project = { caWeight, examWeight, noCA, passThreshold, gradeScale }
 */
export function calculateSubjectResult(marks, subject, project) {
  const { caWeight = 30, passThreshold = 33, gradeScale = DEFAULT_GRADE_SCALE, noCA = false } = project;
  const examWeight = 100 - caWeight;
  const fullMarks  = Number(subject.fullMarks) || 100;

  const caMax   = noCA ? 0 : Math.round((caWeight   / 100) * fullMarks);
  const examMax = Math.round((examWeight / 100) * fullMarks);

  const ca       = noCA ? 0 : Math.min(Number(marks?.ca  || 0), caMax);
  const mcq      = Number(marks?.mcq      || 0);
  const creative = Number(marks?.creative || 0);
  // clamp exam total so it never exceeds examMax
  const examTotal = Math.min(mcq + creative, examMax);

  const total      = parseFloat((ca + examTotal).toFixed(2));
  const percentage = fullMarks > 0 ? parseFloat(((total / fullMarks) * 100).toFixed(2)) : 0;

  const gradeInfo = getGradeInfo(percentage, gradeScale);
  const passed    = percentage >= Number(passThreshold || 33);

  return { ca, mcq, creative, examTotal, total, percentage, gpa: gradeInfo.gpa, grade: gradeInfo.grade, passed, caMax, examMax };
}

/**
 * Calculate overall student result from array of subject results.
 */
export function calculateStudentOverall(subjectResults, gradeScale = DEFAULT_GRADE_SCALE) {
  if (!subjectResults || subjectResults.length === 0) return { overallGpa: 0, overallGrade: 'F', passed: false };

  const allPassed  = subjectResults.every(r => r.passed);
  const avgGpa     = subjectResults.reduce((sum, r) => sum + (r.gpa || 0), 0) / subjectResults.length;
  const overallGpa = parseFloat(avgGpa.toFixed(2));

  // If any subject failed, overall grade = F
  const overallGrade = allPassed ? getGradeFromGpa(overallGpa, gradeScale) : 'F';

  return { overallGpa, overallGrade, passed: allPassed };
}

/** Grade colour for UI */
export function gradeColor(grade) {
  if (grade === 'A+') return 'text-emerald-400';
  if (grade === 'A')  return 'text-green-400';
  if (grade === 'A-') return 'text-lime-400';
  if (grade === 'B')  return 'text-cyan-400';
  if (grade === 'C')  return 'text-yellow-400';
  if (grade === 'D')  return 'text-orange-400';
  return 'text-red-400'; // F
}
