const router = require('express').Router();
const jwt = require('jsonwebtoken');

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  const adminEmail    = (process.env.ADMIN_EMAIL    || 'info@kingdomenlightenment.org').toLowerCase();
  const adminPassword =  process.env.ADMIN_PASSWORD || 'KEMTkemt';

  const emailMatch    = email.trim().toLowerCase() === adminEmail ||
                        email.trim().toLowerCase().endsWith('@kingdomenlightenment.org');
  const passwordMatch = password.trim() === adminPassword;

  if (!emailMatch || !passwordMatch) {
    return res.status(401).json({ success: false, message: 'Invalid credentials.' });
  }

  const token = jwt.sign(
    { email: adminEmail, role: 'admin' },
    process.env.JWT_SECRET || 'kemt_jwt_secret_change_in_production',
    { expiresIn: '7d' }
  );

  res.json({
    success: true,
    token,
    user: { name: 'KEMT Administrator', email: adminEmail, role: 'Super Admin' },
  });
});

module.exports = router;
