export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { image, mimeType } = req.body;
  if (!image) return res.status(400).json({ error: 'Falta imagen' });

  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: 'API key no configurada' });

  const prompt = `Eres un asistente de triaje dental de apoyo diagnóstico para la app Bucaly. Analiza esta imagen clínica oral con criterio basado en evidencia científica (guías de la ADA, AAE, AAPD y literatura odontológica de referencia).

Entrega:
1. DIAGNÓSTICO PRESUNTIVO: descripción breve de lo que observas (máximo 3 oraciones en español simple para pacientes).
2. URGENCIA: clasifica en exactamente una de estas tres palabras: URGENTE / MODERADO / ELECTIVO.
   - URGENTE: absceso, trauma dentario, hemorragia, dolor agudo intenso, infección con signos de propagación.
   - MODERADO: caries visible, gingivitis, lesión sospechosa, movilidad dental, sensibilidad persistente.
   - ELECTIVO: condición estética, desgaste leve, restauración fracturada sin dolor, control de rutina.
3. RECOMENDACIÓN: una sola oración de qué debería hacer el paciente.

Responde SOLO en este formato JSON exacto (sin markdown, sin comillas extra):
{"diagnosis":"texto del diagnóstico presuntivo","urgency":"URGENTE|MODERADO|ELECTIVO","recommendation":"texto de la recomendación"}`;

  const geminiResp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [
          { inline_data: { mime_type: mimeType || 'image/jpeg', data: image } },
          { text: prompt }
        ]}],
        generationConfig: { temperature: 0.2, maxOutputTokens: 512 }
      })
    }
  );

  if (!geminiResp.ok) {
    const err = await geminiResp.text();
    return res.status(502).json({ error: err });
  }

  const raw = await geminiResp.json();
  const text = raw.candidates?.[0]?.content?.parts?.[0]?.text || '';
  try {
    const data = JSON.parse(text.replace(/```json|```/g, '').trim());
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Respuesta inesperada de Gemini', raw: text });
  }
}
