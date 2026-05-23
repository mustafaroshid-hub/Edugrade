import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, addDoc, updateDoc, deleteDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { calculateSubjectResult, calculateStudentOverall, gradeColor } from '../utils/grading';
import Layout from '../components/Layout';

export default function Entry() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [project,  setProject]  = useState(null);
  const [students, setStudents] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [search,   setSearch]   = useState('');
  const [editingId, setEditingId] = useState(null);

  // Form state
  const [formName,   setFormName]   = useState('');
  const [formRoll,   setFormRoll]   = useState('');
  const [formMarks,  setFormMarks]  = useState({}); // { subjIdx: { ca, mcq, creative } }
  const [formError,  setFormError]  = useState('');

  useEffect(() => { fetchAll(); }, [projectId]);

  async function fetchAll() {
    try {
      const projSnap = await getDoc(doc(db, 'projects', projectId));
      if (!projSnap.exists()) { navigate('/'); return; }
      const proj = { id: projSnap.id, ...projSnap.data() };
      setProject(proj);

      const studSnap = await getDocs(query(collection(db, 'projects', projectId, 'students'), orderBy('rollNo')));
      setStudents(studSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch {
      const projSnap = await getDoc(doc(db, 'projects', projectId));
      if (projSnap.exists()) {
        const proj = { id: projSnap.id, ...projSnap.data() };
        setProject(proj);
        const studSnap = await getDocs(collection(db, 'projects', projectId, 'students'));
        setStudents(studSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.rollNo - b.rollNo));
      }
    }
    setLoading(false);
  }

  function initForm(student = null) {
    if (student) {
      setFormName(student.name);
      setFormRoll(String(student.rollNo));
      setFormMarks(student.marks || {});
      setEditingId(student.id);
    } else {
      setFormName(''); setFormRoll(''); setFormMarks({}); setEditingId(null);
    }
    setFormError('');
  }

  function updateMark(subjIdx, field, val) {
    setFormMarks(prev => ({
      ...prev,
      [subjIdx]: { ...(prev[subjIdx] || {}), [field]: val },
    }));
  }

  function getSubjectMaxes(subj) {
    const fm = Number(subj.fullMarks) || 100;
    if (project.noCA) return { caMax: 0, mcqMax: fm, creativeMax: 0, totalExamMax: fm };
    const caMax = Math.round((project.caWeight / 100) * fm);
    const examMax = Math.round((project.examWeight / 100) * fm);
    return { caMax, mcqMax: examMax, creativeMax: examMax, totalExamMax: examMax };
  }

  async function handleSave() {
    if (!formName.trim()) { setFormError('Student name required'); return; }
    if (!formRoll)        { setFormError('Roll number required'); return; }

    // Calculate results
    const subjects = project.subjects || [];
    const subjectResults = subjects.map((subj, i) => calculateSubjectResult(formMarks[i] || {}, subj, project));
    const overall = calculateStudentOverall(subjectResults, project.gradeScale);

    const payload = {
      name:    formName.trim(),
      rollNo:  Number(formRoll),
      marks:   formMarks,
      subjectResults,
      ...overall,
      updatedAt: serverTimestamp(),
    };

    setSaving(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, 'projects', projectId, 'students', editingId), payload);
      } else {
        payload.createdAt = serverTimestamp();
        await addDoc(collection(db, 'projects', projectId, 'students'), payload);
      }
      initForm(null);
      fetchAll();
    } catch (err) { setFormError(err.message); }
    setSaving(false);
  }

  async function handleDelete(studentId) {
    if (!window.confirm('Remove this student?')) return;
    await deleteDoc(doc(db, 'projects', projectId, 'students', studentId));
    setStudents(p => p.filter(s => s.id !== studentId));
    if (editingId === studentId) initForm(null);
  }

  const filtered = students.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    String(s.rollNo).includes(search)
  );

  if (loading) return <Layout projectId={projectId}><div className="text-center text-gray-500 py-20">Loading…</div></Layout>;
  if (!project) return null;

  const subjects = project.subjects || [];
  const inputCls = "bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 transition-colors text-sm w-full";

  return (
    <Layout projectId={projectId}>
      {/* Header */}
      <div className="mb-5">
        <button onClick={() => navigate('/')} className="text-gray-500 hover:text-white text-sm mb-2 transition-colors">← Home</button>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-cyan-400 font-semibold uppercase tracking-wider mb-0.5">Entry</p>
            <h1 className="text-xl font-bold leading-tight">{project.examName}</h1>
            <p className="text-gray-500 text-sm">{project.schoolName} · {project.className}</p>
          </div>
          <span className="bg-gray-800 text-gray-400 text-xs px-2.5 py-1 rounded-xl mt-1">{students.length} students</span>
        </div>
      </div>

      {/* Add / Edit Form */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-200">{editingId ? '✏️ Edit Student' : '+ Add Student'}</h2>
          {editingId && (
            <button onClick={() => initForm(null)} className="text-xs text-gray-500 hover:text-white border border-gray-700 rounded-xl px-3 py-1.5 transition-colors">
              Cancel
            </button>
          )}
        </div>

        {formError && <div className="bg-red-950 border border-red-800 text-red-400 rounded-xl p-3 mb-3 text-sm">{formError}</div>}

        <div className="grid grid-cols-2 gap-3 mb-4">
          <input className={inputCls} placeholder="Student Name" value={formName} onChange={e => setFormName(e.target.value)} />
          <input className={inputCls} type="number" placeholder="Roll No." value={formRoll} onChange={e => setFormRoll(e.target.value)} />
        </div>

        {/* Subjects */}
        <div className="space-y-3">
          {subjects.map((subj, i) => {
            const { caMax, totalExamMax } = getSubjectMaxes(subj);
            const marks = formMarks[i] || {};
            const result = calculateSubjectResult(marks, subj, project);
            return (
              <div key={i} className="bg-gray-800 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-sm font-semibold text-gray-200">{subj.name}</span>
                    {subj.optional && <span className="ml-2 text-xs text-purple-400 bg-purple-950 px-1.5 py-0.5 rounded-lg">Optional</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">/{subj.fullMarks}</span>
                    <span className={`text-sm font-bold ${gradeColor(result.grade)}`}>{result.grade}</span>
                    <span className="text-xs font-semibold text-gray-300">{result.total.toFixed(1)}</span>
                  </div>
                </div>
                <div className={`grid gap-2 ${project.noCA ? 'grid-cols-1' : 'grid-cols-3'}`}>
                  {!project.noCA && (
                    <div>
                      <p className="text-[10px] text-purple-400 font-semibold mb-1">CA /{caMax}</p>
                      <input className={inputCls} type="number" min="0" max={caMax} placeholder="0"
                        value={marks.ca || ''} onChange={e => updateMark(i, 'ca', e.target.value)} />
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] text-cyan-400 font-semibold mb-1">
                      MCQ/Oral /{project.noCA ? subj.fullMarks : Math.round(totalExamMax * 0.4)}
                    </p>
                    <input className={inputCls} type="number" min="0" placeholder="0"
                      value={marks.mcq || ''} onChange={e => updateMark(i, 'mcq', e.target.value)} />
                  </div>
                  {!project.noCA && (
                    <div>
                      <p className="text-[10px] text-orange-400 font-semibold mb-1">
                        Creative /{Math.round(totalExamMax * 0.6)}
                      </p>
                      <input className={inputCls} type="number" min="0" placeholder="0"
                        value={marks.creative || ''} onChange={e => updateMark(i, 'creative', e.target.value)} />
                    </div>
                  )}
                  {project.noCA && (
                    <div>
                      <p className="text-[10px] text-orange-400 font-semibold mb-1">Written /{subj.fullMarks}</p>
                      <input className={inputCls} type="number" min="0" placeholder="0"
                        value={marks.creative || ''} onChange={e => updateMark(i, 'creative', e.target.value)} />
                    </div>
                  )}
                </div>
                {/* Live result bar */}
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${result.passed ? 'bg-green-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.min(result.percentage, 100)}%` }} />
                  </div>
                  <span className={`text-xs font-medium ${result.passed ? 'text-green-400' : 'text-red-400'}`}>
                    {result.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <button onClick={handleSave} disabled={saving}
          className="w-full mt-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-cyan-900/30">
          {saving ? 'Saving…' : editingId ? '✓ Update Student' : '+ Add Student'}
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">🔍</span>
        <input className={`${inputCls} pl-9`} placeholder="Search by name or roll no." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Student list */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
          <h3 className="font-semibold text-gray-200">All Students ({filtered.length})</h3>
        </div>
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-gray-500 text-sm">No students yet. Add one above.</div>
        ) : (
          <div className="divide-y divide-gray-800">
            {filtered.map(student => {
              const isEditing = editingId === student.id;
              return (
                <div key={student.id} className={`px-4 py-3 flex items-center justify-between transition-colors ${isEditing ? 'bg-cyan-950/30' : 'hover:bg-gray-800/50'}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-300">
                      {student.rollNo}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-gray-100">{student.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs font-bold ${gradeColor(student.overallGrade)}`}>{student.overallGrade}</span>
                        <span className="text-xs text-gray-500">GPA {student.overallGpa?.toFixed(2)}</span>
                        <span className={`text-xs font-medium ${student.passed ? 'text-green-400' : 'text-red-400'}`}>
                          {student.passed ? 'PASS' : 'FAIL'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => initForm(student)} className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-xl transition-colors">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(student.id)} className="text-xs bg-red-950 hover:bg-red-900 text-red-400 px-3 py-1.5 rounded-xl transition-colors">
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="h-4" />
    </Layout>
  );
}
