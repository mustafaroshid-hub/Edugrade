import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, where, getCountFromServer } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';

export default function Admin() {
  const { isAdmin, currentUser } = useAuth();
  const navigate = useNavigate();
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState('users'); // 'users' | 'notifications'
  const [search,  setSearch]  = useState('');
  const [actionId, setActionId] = useState(null);

  useEffect(() => { if (!isAdmin) navigate('/'); else fetchUsers(); }, [isAdmin]);

  async function fetchUsers() {
    const snap = await getDocs(collection(db, 'users'));
    const list = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(u => u.id !== currentUser.uid);

    // Get project counts
    const withCounts = await Promise.all(list.map(async u => {
      try {
        const q    = query(collection(db, 'projects'), where('teacherId', '==', u.id));
        const snap = await getCountFromServer(q);
        return { ...u, projectCount: snap.data().count };
      } catch { return { ...u, projectCount: '?' }; }
    }));

    setUsers(withCounts.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0)));
    setLoading(false);
  }

  async function toggleBlock(user) {
    setActionId(user.id);
    await updateDoc(doc(db, 'users', user.id), { blocked: !user.blocked });
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, blocked: !u.blocked } : u));
    setActionId(null);
  }

  async function deleteUser(user) {
    if (!window.confirm(`Delete ${user.name}? This won't delete their projects.`)) return;
    await deleteDoc(doc(db, 'users', user.id));
    setUsers(prev => prev.filter(u => u.id !== user.id));
  }

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const blocked = users.filter(u => u.blocked).length;
  const active  = users.filter(u => !u.blocked).length;

  if (!isAdmin) return null;

  return (
    <Layout>
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-xs text-yellow-400 font-semibold uppercase tracking-wider mb-0.5">⚡ Admin Control</p>
            <h1 className="text-2xl font-bold">Dashboard</h1>
          </div>
          <button onClick={() => navigate('/')} className="text-sm text-gray-400 hover:text-white border border-gray-700 px-3 py-2 rounded-xl transition-colors">
            ← Home
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Total Users', value: users.length, color: 'text-white' },
          { label: 'Active',      value: active,       color: 'text-green-400' },
          { label: 'Blocked',     value: blocked,      color: 'text-red-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-gray-900 rounded-2xl p-4 border border-gray-800 text-center">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {[['users', `Users (${users.length})`], ['blocked', `Blocked (${blocked})`]].map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === v ? 'bg-yellow-500 text-black' : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">🔍</span>
        <input
          className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-9 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 transition-colors text-sm"
          placeholder="Search by name or email…"
          value={search} onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* User list */}
      {loading ? (
        <div className="text-center text-gray-500 py-16">Loading users…</div>
      ) : (
        <div className="space-y-3">
          {filtered
            .filter(u => tab === 'blocked' ? u.blocked : true)
            .map(user => (
              <div key={user.id} className={`bg-gray-900 rounded-2xl border p-4 transition-all ${user.blocked ? 'border-red-900/50 bg-red-950/10' : 'border-gray-800'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${user.blocked ? 'bg-red-950 text-red-400' : 'bg-cyan-950 text-cyan-400'}`}>
                      {user.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm text-gray-100 truncate">{user.name}</p>
                        {user.blocked && <span className="text-xs bg-red-950 text-red-400 px-1.5 py-0.5 rounded-lg">Blocked</span>}
                      </div>
                      <p className="text-gray-500 text-xs truncate">{user.email}</p>
                      <p className="text-gray-600 text-xs mt-0.5">
                        {user.projectCount ?? '?'} project{user.projectCount !== 1 ? 's' : ''} ·{' '}
                        {user.createdAt ? new Date(user.createdAt.seconds * 1000).toLocaleDateString() : 'Unknown date'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => toggleBlock(user)}
                    disabled={actionId === user.id}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-50 ${
                      user.blocked
                        ? 'bg-green-950 hover:bg-green-900 text-green-400 border border-green-900'
                        : 'bg-red-950 hover:bg-red-900 text-red-400 border border-red-900'
                    }`}
                  >
                    {actionId === user.id ? '…' : user.blocked ? '✓ Unblock' : '⊘ Block'}
                  </button>
                  <button
                    onClick={() => deleteUser(user)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-800 hover:bg-gray-700 text-gray-400 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}

          {filtered.length === 0 && (
            <div className="text-center py-16 text-gray-500 text-sm">
              {search ? 'No users match your search' : 'No users registered yet'}
            </div>
          )}
        </div>
      )}

      <div className="h-4" />
    </Layout>
  );
}
