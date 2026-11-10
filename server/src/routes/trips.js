const router = require('express').Router();
const db = require('../db');
const { required } = require('../auth');

const HOLD_MINUTES = 10;

router.get('/', async (req, res, next) => {
  try {
    const { from = '', to = '', date } = req.query;
    const day = date || new Date().toISOString().slice(0, 10);
    const { rows } = await db.query(
      `SELECT t.id, r.origin, r.destination, r.distance_km, b.operator, b.bus_type,
              t.departs_at, t.arrives_at, t.fare,
              b.total_seats - (SELECT count(*) FROM booked_seats s WHERE s.trip_id = t.id) AS seats_left
       FROM trips t
       JOIN routes r ON r.id = t.route_id
       JOIN buses b ON b.id = t.bus_id
       WHERE r.origin ILIKE $1 AND r.destination ILIKE $2
         AND (t.departs_at AT TIME ZONE 'Asia/Kolkata')::date = $3
       ORDER BY t.departs_at`,
      [from, to, day]
    );
    res.json(rows);
  } catch (e) { next(e); }
});

router.get('/:id/seats', async (req, res, next) => {
  try {
    const id = +req.params.id;
    const trip = await db.query(
      `SELECT t.id, t.fare, t.departs_at, r.origin, r.destination, b.bus_type, b.total_seats
       FROM trips t JOIN routes r ON r.id=t.route_id JOIN buses b ON b.id=t.bus_id WHERE t.id=$1`, [id]);
    if (!trip.rows[0]) return res.status(404).json({ error: 'Trip not found' });
    const taken = await db.query('SELECT seat_no FROM booked_seats WHERE trip_id=$1', [id]);
    const held = await db.query('SELECT seat_no FROM seat_holds WHERE trip_id=$1 AND expires_at > now()', [id]);
    res.json({
      trip: trip.rows[0],
      taken: taken.rows.map((r) => r.seat_no),
      held: held.rows.map((r) => r.seat_no),
    });
  } catch (e) { next(e); }
});

// lock seats for 10 minutes while the passenger pays
router.post('/:id/hold', required, async (req, res, next) => {
  const id = +req.params.id;
  const seats = [...new Set(req.body.seats || [])];
  if (!seats.length || seats.length > 6 || seats.some((s) => !(s >= 1 && s <= 40)))
    return res.status(400).json({ error: 'Pick between 1 and 6 seats' });

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM seat_holds WHERE trip_id=$1 AND (expires_at < now() OR user_id=$2)', [id, req.user.id]);
    const gone = await client.query('SELECT 1 FROM booked_seats WHERE trip_id=$1 AND seat_no = ANY($2)', [id, seats]);
    if (gone.rowCount) throw Object.assign(new Error('taken'), { code: 'TAKEN' });
    const ins = await client.query(
      `INSERT INTO seat_holds (trip_id, seat_no, user_id, expires_at)
       SELECT $1, s, $2, now() + ($4 || ' minutes')::interval FROM unnest($3::int[]) s
       ON CONFLICT DO NOTHING RETURNING seat_no`,
      [id, req.user.id, seats, HOLD_MINUTES]
    );
    if (ins.rowCount !== seats.length) throw Object.assign(new Error('taken'), { code: 'TAKEN' });
    await client.query('COMMIT');
    res.json({ held: seats, minutes: HOLD_MINUTES });
  } catch (e) {
    await client.query('ROLLBACK');
    if (e.code === 'TAKEN') return res.status(409).json({ error: 'Someone just took one of those seats. Pick again.' });
    next(e);
  } finally { client.release(); }
});

module.exports = router;
