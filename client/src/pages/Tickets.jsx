import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';
import Ticket from '../components/Ticket.jsx';

export default function Tickets() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [list, setList] = useState(null);
  const [err, setErr] = useState('');

  const load = () => api('/bookings/mine').then(setList).catch((e) => setErr(e.message));
  useEffect(() => { if (!user) nav('/login'); else load(); }, []);

  async function cancel(b) {
    if (!confirm(`Cancel ${b.ref}? Refund depends on how close the departure is.`)) return;
    try { await api(`/bookings/${b.id}/cancel`, { method: 'POST' }); load(); } catch (e) { setErr(e.message); }
  }

  return (
    <div className="py-8">
      <h1 className="mb-5 text-3xl font-extrabold">My tickets</h1>
      {err && <p className="mb-3 font-semibold">{err}</p>}
      {list && list.length === 0 && (
        <p>You haven't booked anything yet. <Link to="/" className="font-semibold underline">Find a bus</Link></p>
      )}
      <div className="grid gap-6 md:grid-cols-2">
        {list?.map((b) => <Ticket key={b.id} b={b} onCancel={cancel} />)}
      </div>
      <p className="mt-6 max-w-lg text-sm">Refunds: 90% if you cancel 24 hours or more before departure, 50% from 6 to 24 hours, nothing inside 6 hours.</p>
    </div>
  );
}
