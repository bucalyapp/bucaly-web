module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { image, mimeType, symptom, description } = req.body || {};
  if (!image) return res.status(400).json({ error: 'Falta imagen' });

  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: 'API key no configurada' });

  const symContext = symptom && symptom !== 'otro'
    ? `\n\nEl paciente también reporta como síntoma principal: "${symptom}".${description ? ` Descripción adicional: "${description}".` : ''}`
    : (description ? `\n\nDescripción del paciente: "${description}".` : '');

  const prompt = `Eres un asistente de triaje dental de apoyo diagnóstico para la app Bucaly. Analiza esta imagen clínica oral con criterio basado en evidencia científica (guías de la ADA, AAE, AAPD y literatura odontológica de referencia).${symContext}

Entrega:
1. DIAGNÓSTICO PRESUNTIVO: Describe lo que observas en la imagen y relaciona con los síntomas reportados si los hay. Máximo 3 oraciones en español claro para pacientes no expertos.
2. URGENCIA: Clasifica en exactamente una: URGENTE / MODERADO / ELECTIVO.
   - URGENTE: absceso, trauma dentario, hemorragia activa, infección con signos de propagación, dolor agudo intenso.
   - MODERADO: caries visible, gingivitis, lesión sospechosa, movilidad dental, sensibilidad persistente.
   - ELECTIVO: condición estética, desgaste leve, restauración fracturada sin dolor, control de rutina.
3. RECOMENDACIÓN: Una sola oración concreta de qué debería hacer el paciente.

Responde SOLO en este JSON exacto (sin markdown):
{"diagnosis":"texto","urgency":"URGENTE|MODERADO|ELECTIVO","recommendation":"texto"}`;

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [
            { inline_data: { mime_type: mimeType || 'image/jpeg', data: image } },
            { text: prompt }
          ]}],
          generationConfig: { temperature: 0.2, maxOutputTokens: 600 }
        })
      }
    );
    if (!r.ok) return res.status(502).json({ error: await r.text() });
    const raw = await r.json();
    const text = raw.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const data = JSON.parse(text.replace(/```json|```/g, '').trim());
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
