-- Dummy data for demos. Run after schema.sql (which already loads routes, buses and 15 days of trips).
-- All three accounts use the password: password123
CREATE EXTENSION IF NOT EXISTS pgcrypto;

TRUNCATE payments, booked_seats, seat_holds, bookings, users RESTART IDENTITY CASCADE;

INSERT INTO users (name, email, password_hash, role) VALUES
  ('Admin',        'admin@luit.test', crypt('password123', gen_salt('bf', 10)), 'admin'),
  ('Rupam Baruah', 'rupam@luit.test', crypt('password123', gen_salt('bf', 10)), 'passenger'),
  ('Meera Das',    'meera@luit.test', crypt('password123', gen_salt('bf', 10)), 'passenger'),
  ('Dev Choudhury','dev@luit.test',   crypt('password123', gen_salt('bf', 10)), 'passenger');

-- paid bookings on the next three Guwahati -> Jorhat departures (starting from day after tomorrow's cutoff)
DO $$
DECLARE
  t record; p record; v_user int; v_bk int; v_fare numeric; v_seats int[];
BEGIN
  FOR t IN
    SELECT tr.id, tr.fare FROM trips tr JOIN routes r ON r.id = tr.route_id
    WHERE r.origin = 'Guwahati' AND r.destination = 'Jorhat' AND tr.departs_at > now() + interval '1 day'
    ORDER BY tr.departs_at LIMIT 3
  LOOP
    FOR p IN SELECT * FROM (VALUES
        ('rupam@luit.test', 1, 2, 'upi'),
        ('meera@luit.test', 7, 8, 'card'),
        ('dev@luit.test',  15, 16, 'netbanking'),
        ('rupam@luit.test', 22, 23, 'upi')
      ) AS x(email, a, b, method)
    LOOP
      SELECT id INTO v_user FROM users WHERE email = p.email;
      v_seats := ARRAY[p.a, p.b];
      v_fare  := t.fare * array_length(v_seats, 1);

      INSERT INTO bookings (ref, user_id, trip_id, seats, amount)
      VALUES ('LX' || upper(substr(md5(random()::text), 1, 8)), v_user, t.id, v_seats, v_fare)
      RETURNING id INTO v_bk;

      INSERT INTO booked_seats (trip_id, seat_no, booking_id)
      SELECT t.id, s, v_bk FROM unnest(v_seats) s;

      INSERT INTO payments (booking_id, method, provider_ref, amount, status)
      VALUES (v_bk, p.method, 'SIM-' || substr(md5(random()::text), 1, 10), v_fare, 'success');
    END LOOP;
  END LOOP;
END $$;

-- one cancelled booking with a partial refund, so the "cancelled" ticket style shows up
INSERT INTO bookings (ref, user_id, trip_id, seats, amount, status, refund_amount)
SELECT 'LXCANC001', u.id, tr.id, ARRAY[30], tr.fare, 'cancelled', round(tr.fare * 0.9)
FROM users u, trips tr JOIN routes r ON r.id = tr.route_id
WHERE u.email = 'meera@luit.test' AND r.origin = 'Guwahati' AND r.destination = 'Shillong'
  AND tr.departs_at > now() + interval '2 days'
ORDER BY tr.departs_at LIMIT 1;

-- two seats currently held (10 min) so the striped "being paid for" seats appear on the map
INSERT INTO seat_holds (trip_id, seat_no, user_id, expires_at)
SELECT tr.id, s, (SELECT id FROM users WHERE email = 'dev@luit.test'), now() + interval '10 minutes'
FROM trips tr JOIN routes r ON r.id = tr.route_id, unnest(ARRAY[30, 31]) s
WHERE r.origin = 'Guwahati' AND r.destination = 'Jorhat' AND tr.departs_at > now() + interval '1 day'
ORDER BY tr.departs_at LIMIT 2;

SELECT 'users' AS tbl, count(*) FROM users
UNION ALL SELECT 'bookings', count(*) FROM bookings
UNION ALL SELECT 'booked_seats', count(*) FROM booked_seats
UNION ALL SELECT 'trips', count(*) FROM trips;
