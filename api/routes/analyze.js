const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const DENTAL_PROMPT = `Eres un odontólogo clínico con acceso a evidencia científica actualizada. Analiza esta imagen dental y entrega:

1. **Diagnóstico presuntivo**: qué condición o patología observas (ej. caries, enfermedad periodontal, absceso, fractura, lesión mucosa, etc.)
2. **Hallazgos clínicos**: describe lo que ves objetivamente en la imagen
3. **Urgencia**: clasifica como URGENTE, MODERADO o ELECTIVO y explica por qué
4. **Rama odontológica sugerida**: ej. Endodoncia, Periodoncia, Cirugía oral, Odontología general, etc.
5. **Evidencia científica**: menciona 1-2 referencias o guías clínicas relevantes (ej. clasificación AAP 2017 para periodontitis, criterios ICDAS para caries, etc.)

IMPORTANTE: Este análisis es orientativo y no reemplaza la evaluación clínica presencial. Siempre recomienda que el paciente consulte con un profesional.

Responde en español, de forma clara y estructurada.`;

router.post('/photo', async (req, res) => {
  const { image, mimeType } = req.body;

  if (!image || !mimeType) {
    return res.status(400).json({ error: 'Se requiere imagen y tipo MIME' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'Servicio de análisis no configurado' });
  }

  try {
    const response = await client.messages.create({
      model: 'claude-opus-5',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mimeType, data: image },
            },
            { type: 'text', text: DENTAL_PROMPT },
          ],
        },
      ],
    });

    const text = response.content[0].text;

    // Extract urgency level from response
    let urgency = 'MODERADO';
    if (/URGENTE/i.test(text)) urgency = 'URGENTE';
    else if (/ELECTIVO/i.test(text)) urgency = 'ELECTIVO';

    res.json({ diagnosis: text, urgency });
  } catch (err) {
    console.error('Claude vision error:', err);
    res.status(500).json({ error: 'Error al analizar la imagen' });
  }
});

module.exports = router;
