import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';

export default function Dashboard() {
  const { currentUser, userData, isAdmin, logout } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const navigate = useNavigate();

  useEffect(() => { fetchProjects(); }, [currentUser]);

  async function fetchProjects() {
    try {
      const q    = query(collection(db, 'projects'), where('teacherId', '==', currentUser.uid), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch { /* index building — retry without orderBy */ 
      const q2   = query(collection(db, 'projects'), where('teacherId', '==', currentUser.uid));
      const snap = await getDocs(q2);
      setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }
    setLoading(false);
  }

  async function handleDelete(projectId) {
    if (!window.confirm('Delete this project? All student data will be lost.')) return;
    await deleteDoc(doc(db, 'projects', projectId));
    setProjects(p => p.filter(x => x.id !== projectId));
  }

  return (
    <Layout>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-wider mb-0.5 ${isAdmin ? 'text-yellow-400' : 'text-cyan-400'}`}>
            {isAdmin ? '⚡ Admin Account' : '👋 Welcome back'}
          </p>
          <h1 className="text-2xl font-bold">{userData?.name || 'Teacher'}</h1>
          <p className="text-gray-500 text-sm">{userData?.email}</p>
        </div>
        <button
          onClick={logout}
          className="text-xs text-gray-400 hover:text-white border border-gray-700 rounded-xl px-3 py-2 mt-1 transition-colors"
        >
          Logout
        </button>
      </div>

      {/* Projects header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-200">My Projects</h2>
        <button
          onClick={() => navigate('/project/new')}
          className="bg-cyan-500 hover:bg-cyan-400 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
        >
          + New
        </button>
      </div>

      {/* Projects list */}
      {loading ? (
        <div className="text-center text-gray-500 py-16">Loading…</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16 bg-gray-900 rounded-2xl border border-gray-800">
          <div className="text-5xl mb-3">📋</div>
          <p className="text-gray-400 mb-1">No projects yet</p>
          <p className="text-gray-600 text-sm mb-5">Create your first exam project</p>
          <button
            onClick={() => navigate('/project/new')}
            className="bg-cyan-500 hover:bg-cyan-400 text-white px-6 py-2.5 rounded-xl font-medium transition-colors"
          >
            Create Project
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map(p => (
            <div key={p.id} className="bg-gray-900 rounded-2xl p-4 border border-gray-800 hover:border-gray-700 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{p.examName}</h3>
                  <p className="text-gray-400 text-sm">{p.schoolName} · {p.className}</p>
                  {p.location && <p className="text-gray-600 text-xs mt-0.5">{p.location}</p>}
                </div>
                <div className="flex items-center gap-2 ml-2 shrink-0">
                  <span className="bg-cyan-950 text-cyan-400 text-xs px-2 py-1 rounded-lg whitespace-nowrap">
                    {p.subjectCount} Subj
                  </span>
                  <button onClick={() => handleDelete(p.id)} className="text-gray-600 hover:text-red-400 transition-colors text-lg leading-none">
                    ×
                  </button>
                </div>
              </div>

              {/* Info badges */}
              <div className="flex gap-2 flex-wrap mb-3">
                {p.noCA
                  ? <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded-lg">Exam Only (100%)</span>
                  : <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded-lg">CA {p.caWeight}% + Exam {p.examWeight}%</span>
                }
                <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded-lg">Pass ≥{p.passThreshold}%</span>
                {p.useCustomGPA && <span className="text-xs bg-purple-950 text-purple-400 px-2 py-1 rounded-lg">Custom GPA</span>}
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => navigate(`/project/${p.id}/entry`)}
                  className="bg-gray-800 hover:bg-gray-700 text-sm py-2 rounded-xl transition-colors text-center">
                  ✏️ Entry
                </button>
                <button onClick={() => navigate(`/project/${p.id}/stats`)}
                  className="bg-gray-800 hover:bg-gray-700 text-sm py-2 rounded-xl transition-colors text-center">
                  📊 Stats
                </button>
                <button onClick={() => navigate(`/project/${p.id}/merit`)}
                  className="bg-gray-800 hover:bg-gray-700 text-sm py-2 rounded-xl transition-colors text-center">
                  🏆 Merit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="h-4" />
    </Layout>
  );
}
