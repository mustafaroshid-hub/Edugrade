import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const { login } = useAuth();
  const navigate  = useNavigate();

  async function handleSubmit() {
    if (!email || !password) { setError('Please fill in all fields'); return; }
    setError(''); setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message.replace('Firebase: ', '').replace(/\(auth.*\)\.?/, ''));
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="text-6xl mb-3">📊</div>
        <h1 className="text-3xl font-bold tracking-tight">EduGrade</h1>
        <p className="text-gray-400 mt-1 text-sm">Smart Result Management</p>
      </div>

      <div className="w-full max-w-sm bg-gray-900 rounded-2xl p-6 border border-gray-800 shadow-xl">
        <h2 className="text-lg font-semibold mb-5">Sign In</h2>

        {error && (
          <div className="bg-red-950 border border-red-800 text-red-400 rounded-xl p-3 mb-4 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-3 mb-5">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
        >
          {loading ? 'Signing in…' : 'Sign In'}
        </button>

        <p className="text-center text-gray-400 text-sm mt-4">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="text-cyan-400 hover:underline font-medium">Register</Link>
        </p>
      </div>
    </div>
  );
}
