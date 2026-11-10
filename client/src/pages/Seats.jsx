import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, fmtDate, fmtTime } from '../api.js';
import { useAuth } from '../App.jsx';

const ROWS = 10;

function Seat({ n, state, onPick }) {
  const base = 'relative h-11 w-10 rounded-t-lg rounded-b-sm border-2 text-sm font-semibold transition-colors';
  const look = {
    free: 'border-leaf bg-white hover:bg-leaf/20',
    mine: 'border-ink bg-ink text-white',
    taken: 'cursor-not-allowed border-mist bg-mist text-ink/40',
    held: 'seat-held cursor-not-allowed border-mist text-ink/40',
  }[state];
  return (
    <button disabled={state === 'taken' || state === 'held'} onClick={() => onPick(n)}
      aria-label={`Seat ${n}, ${state === 'mine' ? 'selected' : state}`} className={`${base} ${look}`}>
      {n}
      <span className="absolute inset-x-1 bottom-0.5 h-1 rounded-full bg-current opacity-25" />
    </button>
  );
}

export default function Seats() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [info, setInfo] = useState(null);
  const [picked, setPicked] = useState([]);
  const [hold, setHold] = useState(null); // { until }
  const [left, setLeft] = useState(0);
  const [method, setMethod] = useState('upi');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => api(`/trips/${id}/seats`).then(setInfo).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    if (!hold) return;
    const t = setInterval(() => {
      const s = Math.max(0, Math.round((hold.until - Date.now()) / 1000));
      setLeft(s);
      if (s === 0) { setHold(null); setPicked([]); setErr('Time ran out and your seats were released.'); load(); }
    }, 1000);
    return () => clearInterval(t);
  }, [hold]);

  if (!info) return <p className="py-10">{err || 'Loading seat map…'}</p>;
  const { trip, taken, held } = info;
  const total = Number(trip.fare) * picked.length;

  const pick = (n) => {
    if (hold) return;
    setErr('');
    setPicked((p) => (p.includes(n) ? p.filter((x) => x !== n) : p.length < 6 ? [...p, n] : p));
  };

  async function holdSeats() {
    if (!user) return nav('/login');
    setBusy(true); setErr('');
    try {
      const r = await api(`/trips/${id}/hold`, { method: 'POST', body: { seats: picked } });
      setHold({ until: Date.now() + r.minutes * 60000 });
      setLeft(r.minutes * 60);
    } catch (e) { setErr(e.message); setPicked([]); load(); }
    setBusy(false);
  }

  async function pay() {
    setBusy(true); setErr('');
    try {
      await api('/bookings', { method: 'POST', body: { tripId: +id, seats: picked, method } });
      nav('/tickets');
    } catch (e) { setErr(e.message); }
    setBusy(false);
  }

  const stateOf = (n) => picked.includes(n) ? 'mine' : taken.includes(n) ? 'taken' : held.includes(n) ? 'held' : 'free';

  return (
    <div className="grid gap-8 py-8 md:grid-cols-[auto_1fr]">
      {/* the bus, seen from above. driver at the top */}
      <div className="mx-auto w-fit rounded-[36px] border-4 border-ink bg-white px-6 pb-6 pt-4">
        <div className="mb-4 flex items-center justify-between border-b-2 border-dashed border-mist pb-3">
          <span className="text-xs">Front</span>
          <svg width="34" height="34" viewBox="0 0 34 34" aria-label="Driver">
            <circle cx="17" cy="17" r="13" fill="none" stroke="#2b6777" strokeWidth="3" />
            <circle cx="17" cy="17" r="3" fill="#2b6777" />
            <path d="M17 17 L5 20 M17 17 L29 20 M17 17 V30" stroke="#2b6777" strokeWidth="3" />
          </svg>
        </div>
        <div className="space-y-2">
          {Array.from({ length: ROWS }, (_, r) => (
            <div key={r} className="flex items-center gap-2">
              <Seat n={r * 4 + 1} state={stateOf(r * 4 + 1)} onPick={pick} />
              <Seat n={r * 4 + 2} state={stateOf(r * 4 + 2)} onPick={pick} />
              <span className="w-6" />
              <Seat n={r * 4 + 3} state={stateOf(r * 4 + 3)} onPick={pick} />
              <Seat n={r * 4 + 4} state={stateOf(r * 4 + 4)} onPick={pick} />
            </div>
          ))}
        </div>
        <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <li className="flex items-center gap-1"><i className="h-3 w-3 rounded-sm border-2 border-leaf bg-white" />Free</li>
          <li className="flex items-center gap-1"><i className="h-3 w-3 rounded-sm bg-ink" />Yours</li>
          <li className="flex items-center gap-1"><i className="h-3 w-3 rounded-sm bg-mist" />Booked</li>
          <li className="flex items-center gap-1"><i className="seat-held h-3 w-3 rounded-sm border border-mist" />Being paid for</li>
        </ul>
      </div>

      <aside className="h-fit rounded-xl bg-mist p-5">
        <h1 className="text-2xl font-bold">{trip.origin} to {trip.destination}</h1>
        <p className="mt-1 text-sm">{fmtDate(trip.departs_at)}, {fmtTime(trip.departs_at)} &middot; {trip.bus_type}</p>

        <div className="mt-5 rounded-lg bg-white p-4">
          {picked.length === 0 ? (
            <p className="text-sm">Tap a seat on the map. You can book up to 6.</p>
          ) : (
            <>
              <p className="text-sm">Seats <b>{[...picked].sort((a, b) => a - b).join(', ')}</b></p>
              <p className="font-head text-3xl font-bold">₹{total}</p>
            </>
          )}
        </div>

        {!hold ? (
          <button className="btn mt-4 w-full" disabled={!picked.length || busy} onClick={holdSeats}>
            {user ? 'Hold seats and pay' : 'Log in to continue'}
          </button>
        ) : (
          <div className="mt-4 space-y-3">
            <p className="text-sm">Seats are yours for <b>{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</b></p>
            <div className="flex gap-2">
              {['upi', 'card', 'netbanking'].map((m) => (
                <label key={m} className={`flex-1 cursor-pointer rounded-md border-2 px-2 py-2 text-center text-sm font-semibold ${method === m ? 'border-ink bg-ink text-white' : 'border-white bg-white'}`}>
                  <input type="radio" name="m" className="sr-only" checked={method === m} onChange={() => setMethod(m)} />
                  {m === 'upi' ? 'UPI' : m === 'card' ? 'Card' : 'Net banking'}
                </label>
              ))}
            </div>
            <button className="btn w-full" disabled={busy} onClick={pay}>Pay ₹{total}</button>
          </div>
        )}
        {err && <p className="mt-3 text-sm font-semibold">{err}</p>}
      </aside>
    </div>
  );
}
