const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const supabase = require('../lib/supabase');

const sign = (user) => jwt.sign(
  { id: user.id, email: user.email, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: '30d' }
);

// POST /api/auth/register
router.post('/register', [
  body('nombre').trim().notEmpty().withMessage('Nombre requerido'),
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 8 }).withMessage('Contraseña mínimo 8 caracteres'),
  body('rut').trim().notEmpty().withMessage('RUT requerido'),
  body('telefono').trim().notEmpty().withMessage('Teléfono requerido'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { nombre, email, password, rut, telefono } = req.body;

  const { data: existing } = await supabase
    .from('patients')
    .select('id')
    .eq('email', email)
    .single();

  if (existing) return res.status(409).json({ error: 'Ya existe una cuenta con ese email' });

  const password_hash = await bcrypt.hash(password, 12);

  const { data: patient, error } = await supabase
    .from('patients')
    .insert({ nombre, email, password_hash, rut, telefono, role: 'patient' })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  res.status(201).json({ token: sign(patient), user: { id: patient.id, nombre: patient.nombre, email: patient.email, role: patient.role } });
});

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail(),
  body('password').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password } = req.body;

  const { data: patient } = await supabase
    .from('patients')
    .select('*')
    .eq('email', email)
    .single();

  if (!patient) return res.status(401).json({ error: 'Credenciales incorrectas' });

  const valid = await bcrypt.compare(password, patient.password_hash);
  if (!valid) return res.status(401).json({ error: 'Credenciales incorrectas' });

  res.json({ token: sign(patient), user: { id: patient.id, nombre: patient.nombre, email: patient.email, role: patient.role } });
});

// GET /api/auth/me
router.get('/me', require('../middleware/auth'), async (req, res) => {
  const { data: patient } = await supabase
    .from('patients')
    .select('id, nombre, email, rut, telefono, role, created_at')
    .eq('id', req.user.id)
    .single();

  if (!patient) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(patient);
});

module.exports = router;
