import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, fmtTime, duration } from '../api.js';
import BusArt from '../components/BusArt.jsx';

const CITIES = ['Guwahati', 'Jorhat', 'Dibrugarh', 'Tezpur', 'Silchar', 'Shillong'];
const today = () => new Date().toISOString().slice(0, 10);

export default function Home() {
  const [q, setQ] = useState({ from: 'Guwahati', to: 'Jorhat', date: today() });
  const [trips, setTrips] = useState(null);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setQ({ ...q, [k]: e.target.value });

  async function search(e) {
    e.preventDefault();
    setErr('');
    try {
      setTrips(await api(`/trips?from=${q.from}&to=${q.to}&date=${q.date}`));
    } catch (x) { setErr(x.message); }
  }

  return (
    <>
      <section className="grid items-center gap-6 py-10 md:grid-cols-2">
        <div>
          <h1 className="text-4xl font-extrabold leading-tight md:text-5xl">Book your seat before you reach the counter</h1>
          <p className="mt-3 max-w-md">Daily buses between Guwahati and the rest of Assam. Pick your own seat, pay on your phone, show the QR code when you board.</p>
        </div>
        <BusArt className="w-full" />
      </section>

      <form onSubmit={search} className="grid gap-3 rounded-xl bg-mist p-4 sm:grid-cols-4">
        <label className="text-sm font-semibold">From
          <select className="field mt-1 font-normal" value={q.from} onChange={set('from')}>
            {CITIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold">To
          <select className="field mt-1 font-normal" value={q.to} onChange={set('to')}>
            {CITIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold">Travel date
          <input type="date" min={today()} className="field mt-1 font-normal" value={q.date} onChange={set('date')} />
        </label>
        <button className="btn self-end">Find buses</button>
      </form>

      {err && <p className="mt-4 font-semibold">{err}</p>}

      {trips && (
        <section className="mt-8">
          <h2 className="mb-3 text-2xl font-bold">{q.from} to {q.to}</h2>
          {trips.length === 0 && <p>No buses on this date. Try another day, or check that the route runs from {q.from} to {q.to}.</p>}
          <ul className="space-y-3">
            {trips.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-4 rounded-xl bg-white p-4">
                <div className="w-36">
                  <p className="font-semibold">{t.bus_type}</p>
                  <p className="text-sm">{Number(t.seats_left)} seats left</p>
                </div>
                <div className="flex min-w-[240px] flex-1 items-center gap-3">
                  <span className="font-head text-xl font-bold">{fmtTime(t.departs_at)}</span>
                  <div className="flex flex-1 flex-col items-center">
                    <span className="text-xs">{duration(t.departs_at, t.arrives_at)}</span>
                    <div className="flex w-full items-center">
                      <span className="h-2.5 w-2.5 rounded-full border-2 border-ink" />
                      <span className="h-0.5 flex-1 bg-leaf" />
                      <span className="h-2.5 w-2.5 rounded-full bg-ink" />
                    </div>
                  </div>
                  <span className="font-head text-xl font-bold">{fmtTime(t.arrives_at)}</span>
                </div>
                <p className="w-20 text-right font-head text-2xl font-bold">₹{Number(t.fare)}</p>
                <Link to={`/trip/${t.id}`} className="btn">Choose seats</Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
