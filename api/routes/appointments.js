const router = require('express').Router();
const auth = require('../middleware/auth');
const supabase = require('../lib/supabase');

// POST /api/appointments — crear cita
router.post('/', auth, async (req, res) => {
  const { dentist_name, specialty, address, price, triage_id, scheduled_at } = req.body;
  if (!dentist_name || !specialty) return res.status(400).json({ error: 'Faltan campos obligatorios' });

  const { data, error } = await supabase
    .from('appointments')
    .insert({
      patient_id: req.user.id,
      triage_id: triage_id || null,
      dentist_name,
      specialty,
      address: address || '',
      price: price || null,
      scheduled_at: scheduled_at || null,
      status: 'pending',
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// GET /api/appointments/my — citas del paciente
router.get('/my', auth, async (req, res) => {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('patient_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/appointments — todas las citas (dentistas/admin)
router.get('/', auth, async (req, res) => {
  if (req.user.role === 'patient') return res.status(403).json({ error: 'Sin permiso' });

  const { status, page = 1, limit = 30 } = req.query;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('appointments')
    .select(`*, patients(nombre, email, rut, telefono)`, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq('status', status);

  const { data, count, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  res.json({ data, total: count, page: Number(page), limit: Number(limit) });
});

// PATCH /api/appointments/:id/status — actualizar estado
router.patch('/:id/status', auth, async (req, res) => {
  if (req.user.role === 'patient') return res.status(403).json({ error: 'Sin permiso' });

  const { status } = req.body;
  const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Estado inválido' });

  const { data, error } = await supabase
    .from('appointments')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;
