DROP TABLE IF EXISTS payments, booked_seats, seat_holds, bookings, trips, buses, routes, users CASCADE;

CREATE TABLE users (
  id serial PRIMARY KEY,
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'passenger',
  created_at timestamptz DEFAULT now()
);
CREATE TABLE routes (
  id serial PRIMARY KEY,
  origin text NOT NULL,
  destination text NOT NULL,
  distance_km int NOT NULL
);
CREATE TABLE buses (
  id serial PRIMARY KEY,
  reg_no text UNIQUE NOT NULL,
  operator text NOT NULL,
  bus_type text NOT NULL,
  total_seats int NOT NULL DEFAULT 40
);
CREATE TABLE trips (
  id serial PRIMARY KEY,
  route_id int REFERENCES routes(id),
  bus_id int REFERENCES buses(id),
  departs_at timestamptz NOT NULL,
  arrives_at timestamptz NOT NULL,
  fare numeric(8,2) NOT NULL
);
CREATE INDEX trips_departs_idx ON trips (departs_at);

CREATE TABLE bookings (
  id serial PRIMARY KEY,
  ref text UNIQUE NOT NULL,
  user_id int REFERENCES users(id),
  trip_id int REFERENCES trips(id),
  seats int[] NOT NULL,
  amount numeric(8,2) NOT NULL,
  status text NOT NULL DEFAULT 'paid',
  refund_amount numeric(8,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
-- primary key here is what makes double booking impossible
CREATE TABLE booked_seats (
  trip_id int REFERENCES trips(id),
  seat_no int NOT NULL,
  booking_id int REFERENCES bookings(id),
  PRIMARY KEY (trip_id, seat_no)
);
CREATE TABLE seat_holds (
  trip_id int REFERENCES trips(id),
  seat_no int NOT NULL,
  user_id int REFERENCES users(id),
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (trip_id, seat_no)
);
CREATE TABLE payments (
  id serial PRIMARY KEY,
  booking_id int REFERENCES bookings(id),
  method text,
  provider_ref text,
  amount numeric(8,2),
  status text,
  created_at timestamptz DEFAULT now()
);

-- sample data
INSERT INTO routes (origin, destination, distance_km) VALUES
 ('Guwahati','Jorhat',300),('Jorhat','Guwahati',300),
 ('Guwahati','Dibrugarh',440),('Dibrugarh','Guwahati',440),
 ('Guwahati','Shillong',100),('Shillong','Guwahati',100),
 ('Guwahati','Tezpur',180),('Tezpur','Guwahati',180),
 ('Guwahati','Silchar',340),('Silchar','Guwahati',340);
INSERT INTO buses (reg_no, operator, bus_type) VALUES
 ('AS01 FC 2214','Luit Express','AC Sleeper'),
 ('AS01 EH 7781','Luit Express','AC Seater'),
 ('AS03 BK 1096','Luit Express','Non-AC Seater');
INSERT INTO trips (route_id, bus_id, departs_at, arrives_at, fare)
SELECT r.id, b.id,
       d::date + tm.t,
       d::date + tm.t + (r.distance_km / 45.0) * interval '1 hour',
       round(r.distance_km * 1.6 + (b.id - 1) * 90, 0)
FROM routes r
JOIN buses b ON b.id = ((r.id - 1) % 3) + 1
CROSS JOIN (VALUES (time '07:30'), (time '21:00')) tm(t)
CROSS JOIN generate_series(current_date, current_date + 14, '1 day') d;
