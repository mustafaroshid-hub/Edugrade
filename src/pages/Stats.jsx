import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { gradeColor } from '../utils/grading';
import Layout from '../components/Layout';

const GRADE_ORDER = ['A+', 'A', 'A-', 'B', 'C', 'D', 'F'];

export default function Stats() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project,  setProject]  = useState(null);
  const [students, setStudents] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [viewList, setViewList] = useState(null); // { grade, students }

  useEffect(() => { fetchAll(); }, [projectId]);

  async function fetchAll() {
    try {
      const proj = await getDoc(doc(db, 'projects', projectId));
      if (!proj.exists()) { navigate('/'); return; }
      setProject({ id: proj.id, ...proj.data() });
      const snap = await getDocs(collection(db, 'projects', projectId, 'students'));
      setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch {}
    setLoading(false);
  }

  if (loading) return <Layout projectId={projectId}><div className="text-center text-gray-500 py-20">Loading…</div></Layout>;
  if (!project) return null;

  const total   = students.length;
  const passed  = students.filter(s => s.passed);
  const failed  = students.filter(s => !s.passed);
  const passRate = total > 0 ? ((passed.length / total) * 100).toFixed(1) : 0;
  const avgGpa   = total > 0 ? (students.reduce((s, st) => s + (st.overallGpa || 0), 0) / total).toFixed(2) : '0.00';
  const highestGpa = total > 0 ? Math.max(...students.map(s => s.overallGpa || 0)).toFixed(2) : '0.00';
  const lowestGpa  = total > 0 ? Math.min(...students.map(s => s.overallGpa || 0)).toFixed(2) : '0.00';

  // Grade distribution
  const gradeDist = {};
  students.forEach(s => {
    const g = s.overallGrade || 'F';
    gradeDist[g] = (gradeDist[g] || 0) + 1;
  });
  const maxGradeCount = Math.max(1, ...Object.values(gradeDist));

  // Subject-wise pass rate
  const subjects = project.subjects || [];
  const subjStats = subjects.map((subj, i) => {
    const results  = students.map(s => s.subjectResults?.[i]).filter(Boolean);
    const subjPass = results.filter(r => r.passed).length;
    const avgPct   = results.length > 0 ? (results.reduce((s, r) => s + (r.percentage || 0), 0) / results.length).toFixed(1) : 0;
    return { name: subj.name, total: results.length, passed: subjPass, avgPct };
  });

  return (
    <Layout projectId={projectId}>
      <div className="mb-5">
        <button onClick={() => navigate('/')} className="text-gray-500 hover:text-white text-sm mb-2 transition-colors">← Home</button>
        <p className="text-xs text-cyan-400 font-semibold uppercase tracking-wider mb-0.5">Analytics</p>
        <h1 className="text-xl font-bold">{project.examName}</h1>
        <p className="text-gray-500 text-sm">{project.schoolName} · {project.className}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {[
          { label: 'Total Students', value: total, color: 'text-white' },
          { label: 'Pass Rate', value: `${passRate}%`, color: 'text-green-400' },
          { label: 'Average GPA', value: avgGpa, color: 'text-cyan-400' },
          { label: 'Highest GPA', value: highestGpa, color: 'text-yellow-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Pass / Fail */}
      <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800 mb-4">
        <h2 className="font-semibold text-gray-200 mb-3">Pass / Fail Overview</h2>
        <div className="h-3 bg-gray-800 rounded-full overflow-hidden mb-2">
          <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all"
            style={{ width: `${passRate}%` }} />
        </div>
        <div className="flex justify-between">
          <button onClick={() => setViewList({ label: 'Passed Students', list: passed })}
            className="flex items-center gap-2 group">
            <span className="w-2.5 h-2.5 bg-green-500 rounded-full" />
            <span className="text-sm text-gray-300 group-hover:text-green-400 transition-colors">
              {passed.length} Passed ({passRate}%)
            </span>
          </button>
          <button onClick={() => setViewList({ label: 'Failed Students', list: failed })}
            className="flex items-center gap-2 group">
            <span className="text-sm text-gray-300 group-hover:text-red-400 transition-colors">
              {failed.length} Failed
            </span>
            <span className="w-2.5 h-2.5 bg-red-500 rounded-full" />
          </button>
        </div>
      </div>

      {/* Grade Distribution */}
      <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800 mb-4">
        <h2 className="font-semibold text-gray-200 mb-4">Grade Distribution</h2>
        <div className="space-y-2.5">
          {GRADE_ORDER.map(grade => {
            const count = gradeDist[grade] || 0;
            const pct   = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
            const bar   = maxGradeCount > 0 ? (count / maxGradeCount) * 100 : 0;
            const studentsWithGrade = students.filter(s => s.overallGrade === grade);
            return (
              <div key={grade}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold w-5 ${gradeColor(grade)}`}>{grade}</span>
                    <span className="text-xs text-gray-500">{count} students</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{pct}%</span>
                    {count > 0 && (
                      <button onClick={() => setViewList({ label: `Grade ${grade} Students`, list: studentsWithGrade })}
                        className="text-xs bg-gray-800 hover:bg-gray-700 px-2 py-0.5 rounded-lg text-gray-400 transition-colors">
                        View
                      </button>
                    )}
                  </div>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${gradeBarColor(grade)}`} style={{ width: `${bar}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Subject-wise stats */}
      {subjStats.length > 0 && (
        <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800 mb-4">
          <h2 className="font-semibold text-gray-200 mb-4">Subject Performance</h2>
          <div className="space-y-3">
            {subjStats.map((s, i) => (
              <div key={i} className="bg-gray-800 rounded-xl p-3">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-sm font-medium text-gray-200">{s.name}</span>
                  <span className="text-xs text-gray-400">Avg {s.avgPct}%</span>
                </div>
                <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden mb-1">
                  <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${s.avgPct}%` }} />
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{s.passed}/{s.total} passed</span>
                  <span className={s.total > 0 ? (s.passed / s.total >= 0.5 ? 'text-green-400' : 'text-red-400') : ''}>
                    {s.total > 0 ? ((s.passed / s.total) * 100).toFixed(0) : 0}% pass rate
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Extra stats */}
      <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800 mb-4">
        <h2 className="font-semibold text-gray-200 mb-3">GPA Range</h2>
        <div className="grid grid-cols-3 gap-3 text-center">
          {[['Highest', highestGpa, 'text-yellow-400'], ['Average', avgGpa, 'text-cyan-400'], ['Lowest', lowestGpa, 'text-red-400']].map(([l, v, c]) => (
            <div key={l} className="bg-gray-800 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1">{l}</p>
              <p className={`text-xl font-bold ${c}`}>{v}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Student list modal */}
      {viewList && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm px-4 pb-4"
          onClick={() => setViewList(null)}>
          <div className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-lg max-h-[60vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-gray-900 px-4 py-3 border-b border-gray-800 flex items-center justify-between">
              <h3 className="font-semibold">{viewList.label} ({viewList.list.length})</h3>
              <button onClick={() => setViewList(null)} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
            </div>
            {viewList.list.length === 0
              ? <p className="text-center text-gray-500 py-8 text-sm">No students</p>
              : viewList.list.sort((a, b) => a.rollNo - b.rollNo).map(s => (
                <div key={s.id} className="flex items-center justify-between px-4 py-3 border-b border-gray-800 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-6 text-right">{s.rollNo}</span>
                    <span className="text-sm font-medium">{s.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${gradeColor(s.overallGrade)}`}>{s.overallGrade}</span>
                    <span className="text-xs text-gray-500">GPA {s.overallGpa?.toFixed(2)}</span>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      )}

      <div className="h-4" />
    </Layout>
  );
}

function gradeBarColor(grade) {
  if (grade === 'A+') return 'bg-emerald-500';
  if (grade === 'A')  return 'bg-green-500';
  if (grade === 'A-') return 'bg-lime-500';
  if (grade === 'B')  return 'bg-cyan-500';
  if (grade === 'C')  return 'bg-yellow-500';
  if (grade === 'D')  return 'bg-orange-500';
  return 'bg-red-500';
}
