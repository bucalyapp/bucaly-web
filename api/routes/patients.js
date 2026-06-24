const router = require('express').Router();
const auth = require('../middleware/auth');
const supabase = require('../lib/supabase');

// GET /api/patients — lista paginada (solo dentistas/admin)
router.get('/', auth, async (req, res) => {
  if (req.user.role === 'patient') return res.status(403).json({ error: 'Sin permiso' });

  const { page = 1, limit = 20, search = '', urgency = '' } = req.query;
  const from = (page - 1) * limit;

  let query = supabase
    .from('patients')
    .select('id, nombre, email, rut, telefono, role, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1);

  if (search) query = query.ilike('nombre', `%${search}%`);

  const { data, count, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  res.json({ data, total: count, page: Number(page), limit: Number(limit) });
});

// GET /api/patients/:id — perfil completo + triajes
router.get('/:id', auth, async (req, res) => {
  const id = req.params.id;
  if (req.user.role === 'patient' && req.user.id !== id)
    return res.status(403).json({ error: 'Sin permiso' });

  const [{ data: patient }, { data: triages }] = await Promise.all([
    supabase.from('patients').select('id, nombre, email, rut, telefono, created_at').eq('id', id).single(),
    supabase.from('triages').select('*').eq('patient_id', id).order('created_at', { ascending: false }),
  ]);

  if (!patient) return res.status(404).json({ error: 'Paciente no encontrado' });
  res.json({ ...patient, triages: triages || [] });
});

// PUT /api/patients/:id — actualizar datos propios
router.put('/:id', auth, async (req, res) => {
  if (req.user.id !== req.params.id && req.user.role === 'patient')
    return res.status(403).json({ error: 'Sin permiso' });

  const { nombre, telefono, rut } = req.body;
  const { data, error } = await supabase
    .from('patients')
    .update({ nombre, telefono, rut, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select('id, nombre, email, rut, telefono')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;
