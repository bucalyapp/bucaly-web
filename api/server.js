require('dotenv').config({ path: require('path').join(__dirname, '.env'), override: true });
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/triages', require('./routes/triages'));
app.use('/api/appointments', require('./routes/appointments'));

// Health check
app.get('/health', (_, res) => res.json({ status: 'ok', version: '1.0.0' }));

// 404
app.use((_, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// Error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 4000;
const supabase = require('./lib/supabase');
app.listen(PORT, async () => {
  console.log(`Bucaly API corriendo en puerto ${PORT}`);
  const { error } = await supabase.from('patients').select('count');
  console.log(error ? `Supabase error: ${error.message}` : 'Supabase conectado');
});
