const router = require('express').Router();
const auth = require('../middleware/auth');
const supabase = require('../lib/supabase');

// POST /api/triages — guardar resultado de triaje
router.post('/', async (req, res) => {
  const { patient_id, symptom, answers, pain_level, urgency_level, specialist, diagnoses, description,
          guest_nombre, guest_rut, guest_telefono, guest_email } = req.body;

  if (!symptom || !urgency_level) return res.status(400).json({ error: 'Faltan campos obligatorios' });

  const { data, error } = await supabase
    .from('triages')
    .insert({
      patient_id: patient_id || null,
      symptom,
      answers: answers || {},
      pain_level: pain_level ?? null,
      urgency_level,
      specialist,
      diagnoses: diagnoses || [],
      description: description || '',
      guest_nombre: guest_nombre || null,
      guest_rut: guest_rut || null,
      guest_telefono: guest_telefono || null,
      guest_email: guest_email || null,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// GET /api/triages — todos los triajes (dentistas/admin)
router.get('/', auth, async (req, res) => {
  if (req.user.role === 'patient') return res.status(403).json({ error: 'Sin permiso' });

  const { urgency, from_date, to_date, page = 1, limit = 30 } = req.query;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('triages')
    .select(`*, patients(nombre, email, rut, telefono)`, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (urgency) query = query.eq('urgency_level', urgency);
  if (from_date) query = query.gte('created_at', from_date);
  if (to_date) query = query.lte('created_at', to_date);

  const { data, count, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  res.json({ data, total: count, page: Number(page), limit: Number(limit) });
});

// GET /api/triages/my — triajes del paciente autenticado
router.get('/my', auth, async (req, res) => {
  const { data, error } = await supabase
    .from('triages')
    .select('*')
    .eq('patient_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/triages/:id
router.get('/:id', auth, async (req, res) => {
  const { data, error } = await supabase
    .from('triages')
    .select(`*, patients(nombre, email, rut, telefono)`)
    .eq('id', req.params.id)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Triaje no encontrado' });
  if (req.user.role === 'patient' && data.patient_id !== req.user.id)
    return res.status(403).json({ error: 'Sin permiso' });

  res.json(data);
});

module.exports = router;
