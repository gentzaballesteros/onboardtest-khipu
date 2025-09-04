// Cargamos librerías necesarias
require('dotenv').config();     // Para leer las variables del archivo .env
const express = require('express'); // Framework para armar servidor web
const axios = require('axios');     // Para hacer llamadas HTTP a la API de Khipu
const crypto = require('crypto');   // Para verificar la firma HMAC del webhook

// Creamos la app de Express
const app = express();

// Configuramos que Express pueda leer JSON, y además guardamos el "raw body"
// Esto es necesario porque la firma HMAC se calcula sobre el body crudo
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

// Variables desde el archivo .env
const PORT = process.env.PORT || 3000;               // Puerto donde correrá tu servidor
const BASE_URL = process.env.BASE_URL;               // URL de la API de Khipu
const API_KEY = process.env.KHIPU_API_KEY;           // API Key de Khipu
const PUBLIC_URL = process.env.PUBLIC_URL;           // URL pública (ngrok)

// Endpoint simple para verificar que el servidor corre
app.get('/health', (req, res) => {
  res.status(200).send('ok');
});

/**
 * Endpoint para CREAR un pago en Khipu
 * Se puede probar desde Postman con POST http://localhost:3000/create-payment
 */
app.post('/create-payment', async (req, res) => {
  try {
    // Datos de ejemplo (si no se envían desde Postman)
    const {
      amount = 1500,
      subject = 'Cobro demo CSM',
      payer_email = 'test@example.com',
      payer_name = 'Cliente Demo'
    } = req.body || {};

    // Armamos el JSON que se enviará a Khipu
    const payload = {
      amount: Number(amount),
      currency: 'CLP',
      subject: String(subject),
      transaction_id: 'csmdemo-' + Date.now() // ID único para este pago
    };

    // Si tenemos URL pública de ngrok, agregamos retorno y webhook
    if (PUBLIC_URL && PUBLIC_URL.startsWith('https://')) {
      payload.return_url = `${PUBLIC_URL}/success`;
      payload.notify_url = `${PUBLIC_URL}/webhook`;
      payload.notify_api_version = '3.0';
    }

    // Agregamos datos opcionales del pagador
    if (payer_email) payload.payer_email = String(payer_email);
    if (payer_name) payload.payer_name = String(payer_name);

    // Configuramos headers de la llamada a la API de Khipu
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY
    };

    // Llamamos a la API de Khipu para crear el pago
    const khipuRes = await axios.post(`${BASE_URL}/v3/payments`, payload, { headers });

    // Devolvemos al cliente lo que respondió Khipu (incluye payment_url)
    res.status(200).json({
      message: 'Pago creado en Khipu',
      request_payload: payload,
      khipu_response: khipuRes.data
    });
  } catch (err) {
    console.error('Error creando pago:', err?.response?.data || err.message);
    res.status(err?.response?.status || 500).json({
      error: 'No se pudo crear el pago',
      detail: err?.response?.data || err.message
    });
  }
});

// Endpoint de retorno (cuando el usuario vuelve desde Khipu después de pagar)
app.get('/success', (req, res) => {
  res.status(200).send('<h1>Gracias</h1><p>Tu pago fue procesado. Ojo: la confirmación real se valida por webhook.</p>');
});

/**
 * Endpoint para recibir la notificación de Khipu
 * Verificamos la firma HMAC enviada en el header 'x-khipu-signature'
 */
app.post('/webhook', (req, res) => {
  try {
    const signatureHeader = req.get('x-khipu-signature') || '';
    const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body || {}), 'utf8');

    // Calculamos lo que debería ser la firma
    const expected = crypto
      .createHmac('sha256', API_KEY)
      .update(rawBody)
      .digest('hex');

    if (signatureHeader !== expected) {
      console.warn('Firma inválida. Esperado:', expected, 'Recibido:', signatureHeader);
      return res.status(403).send('invalid signature');
    }

    // Si la firma es válida, procesamos el evento
    const event = req.body;
    console.log('Webhook OK. Evento recibido:', JSON.stringify(event, null, 2));

    // Respondemos rápido para que Khipu no reintente
    res.status(200).send('ok');

  } catch (err) {
    console.error('Error en webhook:', err.message);
    return res.status(500).send('server error');
  }
});

// Arrancamos el servidor
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
