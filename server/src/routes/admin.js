const router = require('express').Router();
const db = require('../db');
const { adminOnly } = require('../auth');

// Protect all admin routes
router.use(adminOnly);

// 1. Dashboard summary stats
router.get('/stats', async (_req, res, next) => {
  try {
    const [buses, routes, trips, bookings, revenue] = await Promise.all([
      db.query('SELECT count(*) FROM buses'),
      db.query('SELECT count(*) FROM routes'),
      db.query("SELECT count(*) FROM trips WHERE departs_at >= now()"),
      db.query('SELECT count(*) FROM bookings'),
      db.query("SELECT COALESCE(sum(amount), 0) AS total FROM bookings WHERE status = 'paid'"),
    ]);

    res.json({
      totalBuses: parseInt(buses.rows[0].count, 10),
      totalRoutes: parseInt(routes.rows[0].count, 10),
      upcomingTrips: parseInt(trips.rows[0].count, 10),
      totalBookings: parseInt(bookings.rows[0].count, 10),
      totalRevenue: parseFloat(revenue.rows[0].total),
    });
  } catch (e) {
    next(e);
  }
});

// 2. Bus management
router.get('/buses', async (_req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT b.*, 
              (SELECT count(*) FROM trips t WHERE t.bus_id = b.id) AS trips_count
       FROM buses b 
       ORDER BY b.id DESC`
    );
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

router.post('/buses', async (req, res, next) => {
  try {
    let { reg_no, operator, bus_type, total_seats } = req.body;
    if (!reg_no || !reg_no.trim()) {
      return res.status(400).json({ error: 'Bus registration number is required' });
    }

    reg_no = reg_no.trim().toUpperCase();
    operator = (operator && operator.trim()) || 'Luit Express';
    bus_type = (bus_type && bus_type.trim()) || 'AC Seater';
    total_seats = parseInt(total_seats, 10) || 40;

    if (total_seats < 10 || total_seats > 60) {
      return res.status(400).json({ error: 'Seat capacity must be between 10 and 60' });
    }

    const { rows } = await db.query(
      'INSERT INTO buses (reg_no, operator, bus_type, total_seats) VALUES ($1, $2, $3, $4) RETURNING *',
      [reg_no, operator, bus_type, total_seats]
    );

    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === '23505') {
      return res.status(409).json({ error: 'A bus with registration number ' + req.body.reg_no + ' already exists' });
    }
    next(e);
  }
});

router.delete('/buses/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    // Check if trips exist with bookings
    const booked = await db.query(
      'SELECT 1 FROM trips t JOIN booked_seats bs ON bs.trip_id = t.id WHERE t.bus_id = $1 LIMIT 1',
      [id]
    );
    if (booked.rowCount > 0) {
      return res.status(400).json({ error: 'Cannot delete bus: It has active seat bookings. Remove bookings first.' });
    }

    // Check if trips exist
    const trips = await db.query('SELECT count(*) FROM trips WHERE bus_id = $1', [id]);
    if (parseInt(trips.rows[0].count, 10) > 0) {
      return res.status(400).json({ error: 'Cannot delete bus: It is assigned to scheduled trips. Remove or reschedule them first.' });
    }

    const deleted = await db.query('DELETE FROM buses WHERE id = $1 RETURNING *', [id]);
    if (deleted.rowCount === 0) {
      return res.status(404).json({ error: 'Bus not found' });
    }

    res.json({ ok: true, bus: deleted.rows[0] });
  } catch (e) {
    next(e);
  }
});

// 3. Routes & Trips management
router.get('/routes', async (_req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM routes ORDER BY origin, destination');
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

router.get('/trips', async (_req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT t.id, t.departs_at, t.arrives_at, t.fare,
              r.origin, r.destination, r.distance_km,
              b.reg_no, b.operator, b.bus_type, b.total_seats,
              (SELECT count(*) FROM booked_seats bs WHERE bs.trip_id = t.id) AS booked_seats_count
       FROM trips t
       JOIN routes r ON r.id = t.route_id
       JOIN buses b ON b.id = t.bus_id
       ORDER BY t.departs_at DESC
       LIMIT 60`
    );
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

router.post('/trips', async (req, res, next) => {
  try {
    const { route_id, bus_id, departs_at, arrives_at, fare } = req.body;
    if (!route_id || !bus_id || !departs_at || !arrives_at || !fare) {
      return res.status(400).json({ error: 'Missing required trip fields (route, bus, departure, arrival, fare)' });
    }

    const { rows } = await db.query(
      'INSERT INTO trips (route_id, bus_id, departs_at, arrives_at, fare) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [route_id, bus_id, departs_at, arrives_at, fare]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    next(e);
  }
});

// 4. Bookings overview
router.get('/bookings', async (_req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT bk.id, bk.ref, bk.seats, bk.amount, bk.status, bk.refund_amount, bk.created_at,
              u.name AS user_name, u.email AS user_email,
              r.origin, r.destination, t.departs_at
       FROM bookings bk
       JOIN users u ON u.id = bk.user_id
       JOIN trips t ON t.id = bk.trip_id
       JOIN routes r ON r.id = t.route_id
       ORDER BY bk.id DESC
       LIMIT 50`
    );
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
