const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { sign } = require('../auth');

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password || password.length < 6)
      return res.status(400).json({ error: 'Name, email and a password of 6+ characters are needed' });
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await db.query(
      'INSERT INTO users (name,email,password_hash) VALUES ($1,lower($2),$3) RETURNING id,name,email,role',
      [name, email, hash]
    );
    res.json({ user: rows[0], token: sign(rows[0]) });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'That email already has an account' });
    next(e);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM users WHERE email = lower($1)', [req.body.email || '']);
    const u = rows[0];
    if (!u || !(await bcrypt.compare(req.body.password || '', u.password_hash)))
      return res.status(401).json({ error: 'Email or password is wrong' });
    res.json({ user: { id: u.id, name: u.name, email: u.email, role: u.role }, token: sign(u) });
  } catch (e) { next(e); }
});

module.exports = router;
