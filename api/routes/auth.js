const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../lib/supabase');

const sign = (user) => jwt.sign(
  { id: user.id, email: user.email, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: '30d' }
);

const validate = (fields, body) => {
  const errors = [];
  for (const [key, msg] of fields) {
    if (!body[key] || String(body[key]).trim() === '') errors.push({ field: key, msg });
  }
  return errors;
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { nombre, email, password, rut, telefono } = req.body || {};

    const errors = validate([
      ['nombre', 'Nombre requerido'],
      ['email', 'Email requerido'],
      ['password', 'Contraseña requerida'],
      ['rut', 'RUT requerido'],
      ['telefono', 'Teléfono requerido'],
    ], req.body || {});

    if (password && password.length < 8) errors.push({ field: 'password', msg: 'Contraseña mínimo 8 caracteres' });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push({ field: 'email', msg: 'Email inválido' });
    if (errors.length) return res.status(400).json({ errors });

    const { data: existing } = await supabase
      .from('patients').select('id').eq('email', email).single();

    if (existing) return res.status(409).json({ error: 'Ya existe una cuenta con ese email' });

    const password_hash = await bcrypt.hash(password, 10);

    const { data: patient, error } = await supabase
      .from('patients')
      .insert({ nombre: nombre.trim(), email, password_hash, rut: rut.trim(), telefono: telefono.trim(), role: 'patient' })
      .select().single();

    if (error) return res.status(500).json({ error: error.message });

    res.status(201).json({
      token: sign(patient),
      user: { id: patient.id, nombre: patient.nombre, email: patient.email, role: patient.role }
    });
  } catch (e) {
    console.error('register error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' });

    const { data: patient } = await supabase
      .from('patients').select('*').eq('email', email).single();

    if (!patient) return res.status(401).json({ error: 'Credenciales incorrectas' });

    const valid = await bcrypt.compare(password, patient.password_hash);
    if (!valid) return res.status(401).json({ error: 'Credenciales incorrectas' });

    res.json({
      token: sign(patient),
      user: { id: patient.id, nombre: patient.nombre, email: patient.email, role: patient.role }
    });
  } catch (e) {
    console.error('login error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/auth/me
router.get('/me', require('../middleware/auth'), async (req, res) => {
  try {
    const { data: patient } = await supabase
      .from('patients')
      .select('id, nombre, email, rut, telefono, role, created_at')
      .eq('id', req.user.id).single();

    if (!patient) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(patient);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
