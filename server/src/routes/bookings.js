const router = require('express').Router();
const crypto = require('crypto');
const db = require('../db');
const { required } = require('../auth');
const { saveTicket } = require('../s3');

const makeRef = () => 'LX' + crypto.randomBytes(4).toString('hex').toUpperCase();

// Payment is simulated here. To go live, create a Razorpay/Stripe order in this
// function and confirm it from the gateway webhook before marking paid.
const charge = async (amount, method) => ({ ok: true, providerRef: 'SIM-' + crypto.randomBytes(5).toString('hex') });

router.post('/', required, async (req, res, next) => {
  const { tripId, seats = [], method = 'upi' } = req.body;
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const held = await client.query(
      'SELECT seat_no FROM seat_holds WHERE trip_id=$1 AND user_id=$2 AND expires_at > now() AND seat_no = ANY($3)',
      [tripId, req.user.id, seats]
    );
    if (!seats.length || held.rowCount !== seats.length)
      throw Object.assign(new Error('hold'), { code: 'HOLD' });

    const trip = await client.query('SELECT fare FROM trips WHERE id=$1', [tripId]);
    const amount = trip.rows[0].fare * seats.length;
    const pay = await charge(amount, method);
    if (!pay.ok) throw Object.assign(new Error('pay'), { code: 'PAY' });

    const b = await client.query(
      'INSERT INTO bookings (ref,user_id,trip_id,seats,amount) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [makeRef(), req.user.id, tripId, seats, amount]
    );
    await client.query(
      'INSERT INTO booked_seats (trip_id, seat_no, booking_id) SELECT $1, s, $2 FROM unnest($3::int[]) s',
      [tripId, b.rows[0].id, seats]
    );
    await client.query(
      'INSERT INTO payments (booking_id, method, provider_ref, amount, status) VALUES ($1,$2,$3,$4,$5)',
      [b.rows[0].id, method, pay.providerRef, amount, 'success']
    );
    await client.query('DELETE FROM seat_holds WHERE trip_id=$1 AND user_id=$2', [tripId, req.user.id]);
    await client.query('COMMIT');
    saveTicket(b.rows[0]);
    res.json(b.rows[0]);
  } catch (e) {
    await client.query('ROLLBACK');
    if (e.code === 'HOLD') return res.status(409).json({ error: 'Your seat hold ran out. Pick your seats again.' });
    if (e.code === 'PAY') return res.status(402).json({ error: 'Payment failed. You have not been charged.' });
    next(e);
  } finally { client.release(); }
});

router.get('/mine', required, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT bk.*, r.origin, r.destination, t.departs_at, t.arrives_at, b.bus_type, b.reg_no
       FROM bookings bk JOIN trips t ON t.id=bk.trip_id JOIN routes r ON r.id=t.route_id JOIN buses b ON b.id=t.bus_id
       WHERE bk.user_id=$1 ORDER BY t.departs_at DESC`, [req.user.id]);
    res.json(rows);
  } catch (e) { next(e); }
});

// refund: 90% if 24h+ before departure, 50% if 6h+, otherwise nothing
router.post('/:id/cancel', required, async (req, res, next) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const q = await client.query(
      `SELECT bk.*, t.departs_at FROM bookings bk JOIN trips t ON t.id=bk.trip_id
       WHERE bk.id=$1 AND bk.user_id=$2 AND bk.status='paid' FOR UPDATE OF bk`, [req.params.id, req.user.id]);
    const bk = q.rows[0];
    if (!bk) throw Object.assign(new Error('nf'), { code: 'NF' });
    const hours = (new Date(bk.departs_at) - Date.now()) / 36e5;
    if (hours <= 0) throw Object.assign(new Error('late'), { code: 'LATE' });
    const pct = hours >= 24 ? 0.9 : hours >= 6 ? 0.5 : 0;
    const refund = Math.round(bk.amount * pct);
    await client.query('DELETE FROM booked_seats WHERE booking_id=$1', [bk.id]);
    const up = await client.query("UPDATE bookings SET status='cancelled', refund_amount=$2 WHERE id=$1 RETURNING *", [bk.id, refund]);
    await client.query('COMMIT');
    res.json(up.rows[0]);
  } catch (e) {
    await client.query('ROLLBACK');
    if (e.code === 'NF') return res.status(404).json({ error: 'Booking not found' });
    if (e.code === 'LATE') return res.status(400).json({ error: 'This bus has already left' });
    next(e);
  } finally { client.release(); }
});

module.exports = router;
