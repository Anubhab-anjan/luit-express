import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, saveSession } from '../api.js';
import { useAuth } from '../App.jsx';

export default function Login() {
  const { setUser } = useAuth();
  const nav = useNavigate();
  const [signup, setSignup] = useState(false);
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setErr('');
    try {
      const r = await api(signup ? '/auth/register' : '/auth/login', { method: 'POST', body: f });
      saveSession(r);
      setUser(r.user);
      nav(-1);
    } catch (x) { setErr(x.message); }
  }

  return (
    <form onSubmit={submit} className="mx-auto mt-12 max-w-sm space-y-4 rounded-xl bg-white p-6">
      <h1 className="text-2xl font-bold">{signup ? 'Create your account' : 'Log in'}</h1>
      {signup && <input className="field" placeholder="Full name" value={f.name} onChange={set('name')} required />}
      <input className="field" type="email" placeholder="Email" value={f.email} onChange={set('email')} required />
      <input className="field" type="password" placeholder="Password (6+ characters)" value={f.password} onChange={set('password')} required />
      {err && <p className="text-sm font-semibold">{err}</p>}
      <button className="btn w-full">{signup ? 'Sign up' : 'Log in'}</button>
      <button type="button" className="w-full text-sm underline" onClick={() => setSignup(!signup)}>
        {signup ? 'I already have an account' : 'New here? Create an account'}
      </button>
    </form>
  );
}
