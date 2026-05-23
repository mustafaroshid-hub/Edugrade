import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { DEFAULT_GRADE_SCALE } from '../utils/grading';
import Layout from '../components/Layout';

const EXAM_TYPES = ['Mid Term', 'Final', 'Unit Test', 'Trial', 'Pre-Test', 'Annual', 'Custom'];

export default function NewProject() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Basic info
  const [schoolName, setSchoolName]   = useState('');
  const [location,   setLocation]     = useState('');
  const [className,  setClassName]    = useState('');
  const [examType,   setExamType]     = useState('Final');
  const [examName,   setExamName]     = useState('');
  const [year,       setYear]         = useState(new Date().getFullYear().toString());

  // Subjects
  const [subjectCount, setSubjectCount] = useState('');
  const [subjects,     setSubjects]     = useState([]);
  const [showSubjNames, setShowSubjNames] = useState(false);
  const [defaultFullMarks, setDefaultFullMarks] = useState('100');

  // Marks config
  const [noCA,         setNoCA]         = useState(false);
  const [caWeight,     setCaWeight]     = useState('30');
  const [passThreshold,setPassThreshold]= useState('33');

  // Optional subject (4th optional)
  const [enableOptional, setEnableOptional] = useState(false);
  const [optionalName,   setOptionalName]   = useState('');
  const [optionalMarks,  setOptionalMarks]  = useState('100');

  // Custom GPA
  const [useCustomGPA, setUseCustomGPA] = useState(false);
  const [gradeScale,   setGradeScale]   = useState(
    DEFAULT_GRADE_SCALE.map(g => ({ ...g }))
  );

  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const [step,    setStep]    = useState(1); // 1=basic, 2=subjects, 3=grading

  const examWeight = 100 - Number(caWeight || 0);

  // Build subject array when count changes
  function handleSubjectCountChange(val) {
    setSubjectCount(val);
    const n = parseInt(val) || 0;
    setSubjects(Array.from({ length: n }, (_, i) => ({
      name: `Subject ${i + 1}`,
      fullMarks: defaultFullMarks,
    })));
  }

  function updateSubject(i, field, val) {
    setSubjects(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s));
  }

  function applyDefaultMarks() {
    setSubjects(prev => prev.map(s => ({ ...s, fullMarks: defaultFullMarks })));
  }

  function updateGradeRow(i, field, val) {
    setGradeScale(prev => prev.map((g, idx) => idx === i ? { ...g, [field]: field === 'grade' ? val : Number(val) } : g));
  }

  function addGradeRow() {
    setGradeScale(prev => [...prev, { minPercent: 0, grade: 'X', gpa: 0 }]);
  }

  function removeGradeRow(i) {
    setGradeScale(prev => prev.filter((_, idx) => idx !== i));
  }

  async function handleCreate() {
    if (!schoolName.trim()) { setError('School name is required'); return; }
    if (!className.trim())  { setError('Class / Grade is required'); return; }
    if (!examName.trim())   { setError('Exam name is required'); return; }
    if (!subjectCount || parseInt(subjectCount) < 1) { setError('Add at least 1 subject'); return; }

    setSaving(true); setError('');
    try {
      const finalSubjects = subjects.map(s => ({
        name: s.name.trim() || 'Unnamed',
        fullMarks: Number(s.fullMarks) || 100,
      }));
      if (enableOptional) {
        finalSubjects.push({ name: optionalName.trim() || 'Optional', fullMarks: Number(optionalMarks) || 100, optional: true });
      }

      const projectData = {
        teacherId:    currentUser.uid,
        schoolName:   schoolName.trim(),
        location:     location.trim(),
        className:    className.trim(),
        examType,
        examName:     examName.trim(),
        year,
        subjects:     finalSubjects,
        subjectCount: finalSubjects.filter(s => !s.optional).length,
        noCA,
        caWeight:     noCA ? 0 : Number(caWeight),
        examWeight:   noCA ? 100 : examWeight,
        passThreshold: Number(passThreshold),
        enableOptional,
        useCustomGPA,
        gradeScale:   useCustomGPA ? gradeScale.sort((a, b) => b.minPercent - a.minPercent) : DEFAULT_GRADE_SCALE,
        createdAt:    serverTimestamp(),
      };

      const ref = await addDoc(collection(db, 'projects'), projectData);
      navigate(`/project/${ref.id}/entry`);
    } catch (err) {
      setError('Failed to create project: ' + err.message);
    }
    setSaving(false);
  }

  const inputCls = "w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors text-sm";
  const labelCls = "block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5";

  return (
    <Layout>
      {/* Header */}
      <div className="mb-6">
        <button onClick={() => navigate('/')} className="text-gray-500 hover:text-white text-sm mb-3 flex items-center gap-1 transition-colors">
          ← Back
        </button>
        <p className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-1">New Project</p>
        <h1 className="text-2xl font-bold">Configure Exam</h1>
        <p className="text-gray-500 text-sm mt-1">Set up your grading project</p>
      </div>

      {/* Step indicator */}
      <div className="flex gap-2 mb-6">
        {['Basic Info', 'Subjects', 'Grading'].map((s, i) => (
          <button key={s} onClick={() => setStep(i + 1)}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${step === i + 1 ? 'bg-cyan-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
            {i + 1}. {s}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-950 border border-red-800 text-red-400 rounded-xl p-3 mb-4 text-sm">{error}</div>
      )}

      {/* ── STEP 1: Basic Info ── */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800 space-y-4">
            <h2 className="font-semibold text-gray-200 mb-1">School & Class</h2>
            <div>
              <label className={labelCls}>School / Institution Name</label>
              <input className={inputCls} placeholder="e.g. Al-Hera Academy" value={schoolName} onChange={e => setSchoolName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Location</label>
                <input className={inputCls} placeholder="e.g. Dhaka" value={location} onChange={e => setLocation(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Class / Grade</label>
                <input className={inputCls} placeholder="e.g. Class 8" value={className} onChange={e => setClassName(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800 space-y-4">
            <h2 className="font-semibold text-gray-200 mb-1">Exam Details</h2>
            <div>
              <label className={labelCls}>Exam Type</label>
              <div className="flex gap-2 flex-wrap">
                {EXAM_TYPES.map(t => (
                  <button key={t} onClick={() => setExamType(t)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${examType === t ? 'bg-cyan-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Exam / Project Name</label>
                <input className={inputCls} placeholder="e.g. Semester 1 Final" value={examName} onChange={e => setExamName(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Year</label>
                <input className={inputCls} placeholder="2025" value={year} onChange={e => setYear(e.target.value)} />
              </div>
            </div>
          </div>

          <button onClick={() => setStep(2)}
            className="w-full bg-cyan-500 hover:bg-cyan-400 text-white font-semibold py-3.5 rounded-xl transition-colors">
            Next: Configure Subjects →
          </button>
        </div>
      )}

      {/* ── STEP 2: Subjects ── */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800 space-y-4">
            <h2 className="font-semibold text-gray-200">Subjects Setup</h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Number of Subjects</label>
                <input className={inputCls} type="number" min="1" max="20" placeholder="e.g. 6"
                  value={subjectCount} onChange={e => handleSubjectCountChange(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Default Full Marks</label>
                <input className={inputCls} type="number" placeholder="100" value={defaultFullMarks}
                  onChange={e => setDefaultFullMarks(e.target.value)}
                  onBlur={applyDefaultMarks} />
              </div>
            </div>

            {/* Mark structure */}
            <div>
              <label className={labelCls}>Mark Structure</label>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setNoCA(false)}
                  className={`py-3 rounded-xl text-sm font-medium border transition-all ${!noCA ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-gray-800 border-gray-700 text-gray-400'}`}>
                  📝 CA + Exam
                </button>
                <button onClick={() => setNoCA(true)}
                  className={`py-3 rounded-xl text-sm font-medium border transition-all ${noCA ? 'bg-purple-500/20 border-purple-500 text-purple-400' : 'bg-gray-800 border-gray-700 text-gray-400'}`}>
                  📋 Exam Only
                </button>
              </div>
            </div>

            {!noCA && (
              <div>
                <label className={labelCls}>CA Weight %</label>
                <div className="flex items-center gap-3">
                  <input className={inputCls} type="number" min="1" max="99" value={caWeight}
                    onChange={e => setCaWeight(e.target.value)} />
                  <div className="text-sm text-gray-400 whitespace-nowrap">
                    Exam = <span className="text-cyan-400 font-semibold">{examWeight}%</span>
                  </div>
                </div>
                <div className="mt-2 h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full transition-all"
                    style={{ width: `${caWeight}%` }} />
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>CA {caWeight}%</span><span>Exam {examWeight}%</span>
                </div>
              </div>
            )}

            <div>
              <label className={labelCls}>Pass Threshold %</label>
              <input className={inputCls} type="number" min="1" max="100" placeholder="33" value={passThreshold}
                onChange={e => setPassThreshold(e.target.value)} />
              <p className="text-xs text-gray-600 mt-1">Minimum % in each subject to pass</p>
            </div>
          </div>

          {/* Subject names */}
          {subjects.length > 0 && (
            <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-200">Subject Names & Marks</h2>
                <button onClick={() => setShowSubjNames(!showSubjNames)}
                  className="text-xs text-cyan-400 hover:text-cyan-300">
                  {showSubjNames ? 'Hide' : 'Customize'}
                </button>
              </div>
              {showSubjNames && (
                <div className="space-y-2">
                  {subjects.map((s, i) => (
                    <div key={i} className="flex gap-2">
                      <input className={`${inputCls} flex-1`} placeholder={`Subject ${i + 1}`}
                        value={s.name} onChange={e => updateSubject(i, 'name', e.target.value)} />
                      <input className={`${inputCls} w-20`} type="number" placeholder="100"
                        value={s.fullMarks} onChange={e => updateSubject(i, 'fullMarks', e.target.value)} />
                    </div>
                  ))}
                </div>
              )}
              {!showSubjNames && (
                <p className="text-xs text-gray-500">{subjects.length} subjects configured · tap Customize to edit names & marks</p>
              )}
            </div>
          )}

          {/* Optional subject */}
          <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-200 text-sm">Optional (Extra) Subject</p>
                <p className="text-xs text-gray-500 mt-0.5">Best of main + optional counted</p>
              </div>
              <button onClick={() => setEnableOptional(!enableOptional)}
                className={`w-12 h-6 rounded-full transition-all ${enableOptional ? 'bg-cyan-500' : 'bg-gray-700'}`}>
                <div className={`w-5 h-5 bg-white rounded-full mx-0.5 transition-transform ${enableOptional ? 'translate-x-6' : ''}`} />
              </button>
            </div>
            {enableOptional && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <input className={inputCls} placeholder="Subject name" value={optionalName} onChange={e => setOptionalName(e.target.value)} />
                <input className={inputCls} type="number" placeholder="100" value={optionalMarks} onChange={e => setOptionalMarks(e.target.value)} />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setStep(1)} className="bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3.5 rounded-xl transition-colors">
              ← Back
            </button>
            <button onClick={() => setStep(3)} className="bg-cyan-500 hover:bg-cyan-400 text-white font-semibold py-3.5 rounded-xl transition-colors">
              Next: Grading →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Grading ── */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-gray-200">GPA / Grade Scale</h2>
                <p className="text-xs text-gray-500 mt-0.5">Default: Bangladesh standard</p>
              </div>
              <button onClick={() => setUseCustomGPA(!useCustomGPA)}
                className={`w-12 h-6 rounded-full transition-all ${useCustomGPA ? 'bg-purple-500' : 'bg-gray-700'}`}>
                <div className={`w-5 h-5 bg-white rounded-full mx-0.5 transition-transform ${useCustomGPA ? 'translate-x-6' : ''}`} />
              </button>
            </div>

            {/* Always show scale, editable if custom */}
            <div className="rounded-xl overflow-hidden border border-gray-800">
              <div className="grid grid-cols-3 bg-gray-800 px-3 py-2">
                <span className="text-xs font-semibold text-gray-400">MIN %</span>
                <span className="text-xs font-semibold text-gray-400 text-center">GRADE</span>
                <span className="text-xs font-semibold text-gray-400 text-right">GPA</span>
              </div>
              {gradeScale.sort((a, b) => b.minPercent - a.minPercent).map((row, i) => (
                <div key={i} className="grid grid-cols-3 px-3 py-2 border-t border-gray-800 items-center gap-2">
                  {useCustomGPA ? (
                    <>
                      <input className="bg-gray-800 rounded-lg px-2 py-1 text-sm text-white w-full focus:outline-none focus:ring-1 focus:ring-purple-500"
                        type="number" value={row.minPercent} onChange={e => updateGradeRow(i, 'minPercent', e.target.value)} />
                      <input className="bg-gray-800 rounded-lg px-2 py-1 text-sm text-white text-center w-full focus:outline-none focus:ring-1 focus:ring-purple-500"
                        value={row.grade} onChange={e => updateGradeRow(i, 'grade', e.target.value)} />
                      <div className="flex items-center gap-1">
                        <input className="bg-gray-800 rounded-lg px-2 py-1 text-sm text-white text-right w-full focus:outline-none focus:ring-1 focus:ring-purple-500"
                          type="number" step="0.01" value={row.gpa} onChange={e => updateGradeRow(i, 'gpa', e.target.value)} />
                        <button onClick={() => removeGradeRow(i)} className="text-red-500 hover:text-red-400 text-lg leading-none shrink-0">×</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="text-sm text-gray-300">≥ {row.minPercent}%</span>
                      <span className="text-sm font-bold text-center text-cyan-400">{row.grade}</span>
                      <span className="text-sm text-gray-300 text-right">{row.gpa.toFixed(2)}</span>
                    </>
                  )}
                </div>
              ))}
            </div>
            {useCustomGPA && (
              <button onClick={addGradeRow}
                className="mt-3 w-full bg-gray-800 hover:bg-gray-700 text-purple-400 text-sm py-2 rounded-xl transition-colors">
                + Add Grade Row
              </button>
            )}
          </div>

          {/* Summary card */}
          <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800 space-y-2">
            <h3 className="font-semibold text-gray-200 mb-3">Project Summary</h3>
            {[
              ['School', schoolName || '—'],
              ['Class', `${className} · ${examName}` || '—'],
              ['Subjects', subjects.length + (enableOptional ? ' + 1 optional' : '')],
              ['Marks', noCA ? 'Exam Only (100%)' : `CA ${caWeight}% + Exam ${examWeight}%`],
              ['Pass at', `${passThreshold}%`],
              ['GPA Scale', useCustomGPA ? 'Custom' : 'Bangladesh Standard'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm">
                <span className="text-gray-500">{k}</span>
                <span className="text-gray-200 font-medium">{v}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setStep(2)} className="bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3.5 rounded-xl transition-colors">
              ← Back
            </button>
            <button onClick={handleCreate} disabled={saving}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-cyan-900/40">
              {saving ? 'Creating…' : '🚀 Create Project'}
            </button>
          </div>
        </div>
      )}

      <div className="h-4" />
    </Layout>
  );
}
