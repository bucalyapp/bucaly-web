const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');

router.post('/', async (req, res) => {
  const { name, email, role } = req.body;
  if (!name || !email || !role) {
    return res.status(400).json({ error: 'Nombre, email y rol son requeridos' });
  }
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(email)) {
    return res.status(400).json({ error: 'Email inválido' });
  }
  if (!['paciente', 'dentista'].includes(role)) {
    return res.status(400).json({ error: 'Rol inválido' });
  }

  const { error } = await supabase
    .from('waitlist')
    .insert({ name: name.trim(), email: email.trim().toLowerCase(), role });

  if (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Este email ya está registrado' });
    }
    console.error('Waitlist insert error:', error);
    return res.status(500).json({ error: 'Error al registrar' });
  }

  res.json({ ok: true });
});

router.get('/count', async (req, res) => {
  const { count, error } = await supabase
    .from('waitlist')
    .select('*', { count: 'exact', head: true });
  if (error) return res.status(500).json({ count: 0 });
  res.json({ count: count || 0 });
});

module.exports = router;
