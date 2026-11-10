import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, fmtDate, fmtTime } from '../api.js';
import { useAuth } from '../App.jsx';
import {
  BusIcon,
  CalendarIcon,
  TicketIcon,
  LockIcon,
  AlertIcon,
  CheckIcon,
  RefreshIcon,
  TrashIcon,
} from '../components/Icons.jsx';

export default function Admin() {
  const { user } = useAuth();
  const nav = useNavigate();

  const [tab, setTab] = useState('buses'); // 'buses' | 'trips' | 'bookings'
  const [stats, setStats] = useState(null);
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [trips, setTrips] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  // Form states
  const [busForm, setBusForm] = useState({
    reg_no: '',
    operator: 'Luit Express',
    bus_type: 'AC Seater',
    total_seats: 40,
  });
  const [busSubmitting, setBusSubmitting] = useState(false);

  const [tripForm, setTripForm] = useState({
    route_id: '',
    bus_id: '',
    departs_at: '',
    arrives_at: '',
    fare: 500,
  });
  const [tripSubmitting, setTripSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      nav('/login');
      return;
    }
    if (user.role !== 'admin') {
      setLoading(false);
      return;
    }
    loadData();
  }, [user]);

  async function loadData() {
    setLoading(true);
    setErr('');
    try {
      const [s, b, r, t, bk] = await Promise.all([
        api('/admin/stats'),
        api('/admin/buses'),
        api('/admin/routes'),
        api('/admin/trips'),
        api('/admin/bookings'),
      ]);
      setStats(s);
      setBuses(b);
      setRoutes(r);
      setTrips(t);
      setBookings(bk);
      if (r.length > 0 && !tripForm.route_id) {
        setTripForm((prev) => ({
          ...prev,
          route_id: r[0].id,
          bus_id: b[0]?.id || '',
        }));
      }
    } catch (e) {
      setErr(e.message || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddBus(e) {
    e.preventDefault();
    setErr('');
    setMsg('');
    setBusSubmitting(true);
    try {
      const newBus = await api('/admin/buses', {
        method: 'POST',
        body: busForm,
      });
      setBuses([newBus, ...buses]);
      setBusForm({
        reg_no: '',
        operator: 'Luit Express',
        bus_type: 'AC Seater',
        total_seats: 40,
      });
      setMsg(`Bus ${newBus.reg_no} added successfully!`);
      // refresh stats
      api('/admin/stats').then(setStats).catch(() => {});
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusSubmitting(false);
    }
  }

  async function handleDeleteBus(bus) {
    if (!confirm(`Are you sure you want to delete bus ${bus.reg_no}?`)) return;
    setErr('');
    setMsg('');
    try {
      await api(`/admin/buses/${bus.id}`, { method: 'DELETE' });
      setBuses(buses.filter((b) => b.id !== bus.id));
      setMsg(`Bus ${bus.reg_no} removed successfully.`);
      api('/admin/stats').then(setStats).catch(() => {});
    } catch (e) {
      setErr(e.message);
    }
  }

  async function handleAddTrip(e) {
    e.preventDefault();
    setErr('');
    setMsg('');
    setTripSubmitting(true);
    try {
      const newTrip = await api('/admin/trips', {
        method: 'POST',
        body: tripForm,
      });
      setMsg('Trip scheduled successfully!');
      // refresh trips and stats
      const [updatedTrips, updatedStats] = await Promise.all([
        api('/admin/trips'),
        api('/admin/stats'),
      ]);
      setTrips(updatedTrips);
      setStats(updatedStats);
    } catch (e) {
      setErr(e.message);
    } finally {
      setTripSubmitting(false);
    }
  }

  if (user && user.role !== 'admin') {
    return (
      <div className="mx-auto my-16 max-w-lg rounded-xl bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-mist/60 text-ink">
          <LockIcon className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold">Admin Privileges Required</h1>
        <p className="mt-2 text-ink/80">
          Your current account (<strong>{user.email}</strong>) is logged in as a <em>passenger</em>.
        </p>
        <p className="mt-1 text-sm text-ink/60">
          To manage buses and view admin settings, log in with an administrator account (e.g. <code>admin@luit.test</code>).
        </p>
        <Link to="/login" className="btn mt-6">
          Switch Account
        </Link>
      </div>
    );
  }

  return (
    <div className="py-8">
      {/* Title & Top Bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight">Admin Dashboard</h1>
            <span className="rounded bg-leaf px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-white">
              Admin
            </span>
          </div>
          <p className="text-sm text-ink/70">
            Manage fleet buses, scheduled trips, and review passenger bookings.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="btn-line flex items-center gap-2 text-sm"
          title="Refresh dashboard data"
        >
          <RefreshIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Refreshing…' : 'Refresh Data'}</span>
        </button>
      </div>

      {/* Notifications */}
      {err && (
        <div className="mb-6 flex items-center gap-2.5 rounded-lg border-2 border-red-300 bg-red-50 p-4 text-sm font-semibold text-red-800">
          <AlertIcon className="h-5 w-5 flex-shrink-0 text-red-700" />
          <span>{err}</span>
        </div>
      )}
      {msg && (
        <div className="mb-6 flex items-center gap-2.5 rounded-lg border-2 border-leaf/40 bg-leaf/10 p-4 text-sm font-semibold text-leaf">
          <CheckIcon className="h-5 w-5 flex-shrink-0 text-leaf" />
          <span>{msg}</span>
        </div>
      )}

      {/* Quick Metrics */}
      {stats && (
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-mist/80 bg-white p-4 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink/60">Fleet Buses</span>
            <p className="mt-1 font-head text-3xl font-bold text-ink">{stats.totalBuses}</p>
          </div>
          <div className="rounded-xl border border-mist/80 bg-white p-4 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink/60">Upcoming Trips</span>
            <p className="mt-1 font-head text-3xl font-bold text-ink">{stats.upcomingTrips}</p>
          </div>
          <div className="rounded-xl border border-mist/80 bg-white p-4 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink/60">Total Bookings</span>
            <p className="mt-1 font-head text-3xl font-bold text-ink">{stats.totalBookings}</p>
          </div>
          <div className="rounded-xl border border-mist/80 bg-white p-4 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink/60">Total Revenue</span>
            <p className="mt-1 font-head text-3xl font-bold text-leaf">₹{stats.totalRevenue.toLocaleString('en-IN')}</p>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="mb-6 flex border-b-2 border-mist">
        <button
          onClick={() => setTab('buses')}
          className={`flex items-center gap-2 border-b-4 px-5 py-3 font-head font-bold text-base transition-colors ${
            tab === 'buses'
              ? 'border-ink text-ink'
              : 'border-transparent text-ink/60 hover:text-ink'
          }`}
        >
          <BusIcon className="h-5 w-5" />
          <span>Manage Buses ({buses.length})</span>
        </button>
        <button
          onClick={() => setTab('trips')}
          className={`flex items-center gap-2 border-b-4 px-5 py-3 font-head font-bold text-base transition-colors ${
            tab === 'trips'
              ? 'border-ink text-ink'
              : 'border-transparent text-ink/60 hover:text-ink'
          }`}
        >
          <CalendarIcon className="h-5 w-5" />
          <span>Trips & Schedules ({trips.length})</span>
        </button>
        <button
          onClick={() => setTab('bookings')}
          className={`flex items-center gap-2 border-b-4 px-5 py-3 font-head font-bold text-base transition-colors ${
            tab === 'bookings'
              ? 'border-ink text-ink'
              : 'border-transparent text-ink/60 hover:text-ink'
          }`}
        >
          <TicketIcon className="h-5 w-5" />
          <span>Passenger Bookings ({bookings.length})</span>
        </button>
      </div>

      {/* TAB 1: MANAGE BUSES */}
      {tab === 'buses' && (
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Add Bus Form */}
          <div className="rounded-xl bg-white p-6 shadow-sm lg:col-span-1">
            <h2 className="mb-1 text-xl font-bold">Add New Bus</h2>
            <p className="mb-4 text-xs text-ink/60">Register a new coach to the fleet.</p>

            <form onSubmit={handleAddBus} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink/70">
                  Registration Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AS01 GC 5521"
                  value={busForm.reg_no}
                  onChange={(e) => setBusForm({ ...busForm, reg_no: e.target.value })}
                  className="field mt-1 font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink/70">
                  Operator Name
                </label>
                <input
                  type="text"
                  placeholder="Operator (default: Luit Express)"
                  value={busForm.operator}
                  onChange={(e) => setBusForm({ ...busForm, operator: e.target.value })}
                  className="field mt-1"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink/70">
                  Bus Type
                </label>
                <select
                  value={busForm.bus_type}
                  onChange={(e) => setBusForm({ ...busForm, bus_type: e.target.value })}
                  className="field mt-1"
                >
                  <option value="AC Sleeper">AC Sleeper</option>
                  <option value="AC Seater">AC Seater</option>
                  <option value="Non-AC Seater">Non-AC Seater</option>
                  <option value="AC Semi-Sleeper">AC Semi-Sleeper</option>
                  <option value="Luxury Volvo AC">Luxury Volvo AC</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink/70">
                  Seat Capacity
                </label>
                <input
                  type="number"
                  min="10"
                  max="60"
                  value={busForm.total_seats}
                  onChange={(e) => setBusForm({ ...busForm, total_seats: e.target.value })}
                  className="field mt-1"
                />
                <span className="mt-1 block text-xs text-ink/50">Standard layout is 40 seats.</span>
              </div>

              <button type="submit" disabled={busSubmitting} className="btn w-full">
                {busSubmitting ? 'Adding Bus…' : '+ Add Bus to Fleet'}
              </button>
            </form>
          </div>

          {/* Existing Buses List */}
          <div className="lg:col-span-2">
            <h2 className="mb-3 text-xl font-bold">Fleet Directory</h2>
            {buses.length === 0 ? (
              <p className="rounded-xl bg-white p-6 text-center text-ink/60">No buses registered yet.</p>
            ) : (
              <div className="space-y-3">
                {buses.map((bus) => (
                  <div
                    key={bus.id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-mist/70 bg-white p-4 shadow-sm transition-all hover:border-ink/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-mist/50 text-ink">
                        <BusIcon className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-base font-bold text-ink">{bus.reg_no}</span>
                          <span className="rounded-full bg-mist/60 px-2 py-0.5 text-xs font-semibold text-ink">
                            {bus.bus_type}
                          </span>
                        </div>
                        <p className="text-xs text-ink/70">
                          Operator: <strong>{bus.operator}</strong> &bull; Capacity: <strong>{bus.total_seats} seats</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right text-xs">
                        <span className="font-semibold text-ink">{bus.trips_count || 0}</span>
                        <span className="text-ink/60"> trips</span>
                      </div>
                      <button
                        onClick={() => handleDeleteBus(bus)}
                        className="flex items-center gap-1 rounded px-2.5 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
                        title="Delete bus"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: TRIPS & SCHEDULES */}
      {tab === 'trips' && (
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Schedule Trip Form */}
          <div className="rounded-xl bg-white p-6 shadow-sm lg:col-span-1">
            <h2 className="mb-1 text-xl font-bold">Schedule Trip</h2>
            <p className="mb-4 text-xs text-ink/60">Create a new journey on an existing route.</p>

            <form onSubmit={handleAddTrip} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink/70">Route *</label>
                <select
                  required
                  value={tripForm.route_id}
                  onChange={(e) => setTripForm({ ...tripForm, route_id: e.target.value })}
                  className="field mt-1"
                >
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.origin} → {r.destination} ({r.distance_km} km)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink/70">Bus *</label>
                <select
                  required
                  value={tripForm.bus_id}
                  onChange={(e) => setTripForm({ ...tripForm, bus_id: e.target.value })}
                  className="field mt-1 font-mono"
                >
                  {buses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.reg_no} ({b.bus_type} - {b.total_seats} seats)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink/70">
                  Departure Date & Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={tripForm.departs_at}
                  onChange={(e) => setTripForm({ ...tripForm, departs_at: e.target.value })}
                  className="field mt-1"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink/70">
                  Arrival Date & Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={tripForm.arrives_at}
                  onChange={(e) => setTripForm({ ...tripForm, arrives_at: e.target.value })}
                  className="field mt-1"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink/70">Fare (₹) *</label>
                <input
                  type="number"
                  min="50"
                  step="10"
                  required
                  value={tripForm.fare}
                  onChange={(e) => setTripForm({ ...tripForm, fare: e.target.value })}
                  className="field mt-1 font-head text-lg font-bold"
                />
              </div>

              <button type="submit" disabled={tripSubmitting} className="btn w-full">
                {tripSubmitting ? 'Scheduling…' : '+ Schedule Trip'}
              </button>
            </form>
          </div>

          {/* Upcoming Trips List */}
          <div className="lg:col-span-2">
            <h2 className="mb-3 text-xl font-bold">Upcoming Scheduled Trips</h2>
            <div className="max-h-[600px] space-y-3 overflow-y-auto pr-1">
              {trips.length === 0 ? (
                <p className="rounded-xl bg-white p-6 text-center text-ink/60">No scheduled trips found.</p>
              ) : (
                trips.map((t) => (
                  <div
                    key={t.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-mist/70 bg-white p-4 shadow-sm"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-head text-lg font-bold text-ink">
                          {t.origin} → {t.destination}
                        </span>
                        <span className="font-mono text-xs font-semibold text-leaf">
                          {t.reg_no}
                        </span>
                      </div>
                      <p className="text-xs text-ink/70">
                        Departs: <strong>{fmtDate(t.departs_at)} at {fmtTime(t.departs_at)}</strong> &bull;
                        Arrives: <strong>{fmtTime(t.arrives_at)}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <p className="font-head text-lg font-bold text-ink">₹{Number(t.fare)}</p>
                        <p className="text-xs text-ink/60">
                          {t.booked_seats_count} / {t.total_seats} booked
                        </p>
                      </div>
                      <Link to={`/trip/${t.id}`} className="btn-line text-xs">
                        View Map
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PASSENGER BOOKINGS */}
      {tab === 'bookings' && (
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-xl font-bold">Passenger Bookings</h2>
          <p className="mb-4 text-xs text-ink/60">Real-time overview of ticket reservations across all trips.</p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b-2 border-mist text-xs font-bold uppercase tracking-wider text-ink/60">
                  <th className="py-3 px-3">Ticket Ref</th>
                  <th className="py-3 px-3">Passenger</th>
                  <th className="py-3 px-3">Route</th>
                  <th className="py-3 px-3">Departure</th>
                  <th className="py-3 px-3">Seats</th>
                  <th className="py-3 px-3">Amount</th>
                  <th className="py-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mist/50">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-paper/40">
                    <td className="py-3 px-3 font-mono font-bold text-ink">{b.ref}</td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-ink">{b.user_name}</div>
                      <div className="text-xs text-ink/60">{b.user_email}</div>
                    </td>
                    <td className="py-3 px-3 font-medium">
                      {b.origin} → {b.destination}
                    </td>
                    <td className="py-3 px-3 text-xs text-ink/80">
                      {fmtDate(b.departs_at)} {fmtTime(b.departs_at)}
                    </td>
                    <td className="py-3 px-3 font-mono text-xs">
                      {b.seats?.join(', ')}
                    </td>
                    <td className="py-3 px-3 font-head font-bold text-ink">
                      ₹{Number(b.amount)}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                          b.status === 'paid'
                            ? 'bg-leaf/20 text-leaf'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
