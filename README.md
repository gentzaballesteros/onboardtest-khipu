# onboardtest-khipu

Este proyecto implementa una integración **realista de Khipu Instant Payments** usando Node.js, Express y la API REST de Khipu.  
Simula el flujo completo de pago en **DemoBank** (con tope de $5.000 CLP), incluyendo:

- Creación de pagos vía API (`/v3/payments`)
- Recepción de notificaciones automáticas mediante **webhook** (`/webhook`)
- Validación de firmas HMAC para seguridad
- Exposición del servidor local a Internet usando túneles (Ngrok, LocalTunnel o Cloudflared)
---

## Requisitos previos

- [Node.js v18+](https://nodejs.org/)  
- npm (incluido con Node.js)  
- Cuenta de desarrollador en [Khipu](https://khipu.com/) para obtener **API Key**  
- Postman (para probar las requests)  
- Ngrok, LocalTunnel o Cloudflared (para exponer tu servidor público en las pruebas). Usé LocalTunnel

---

## Instalación

1. Clona este repositorio o descárgalo como `.zip`.
   ```
   git clone https://github.com/tuusuario/khipu-csm-demo.git
   cd khipu-csm-demo
   ```

2. Instala las dependencias:
   ```
   npm install
   ```

3. Crea un archivo `.env` en la raíz del proyecto (usa `ejemplo.env` como referencia):

   ```env
   PORT=3000
   BASE_URL=https://payment-api.khipu.com
   KHIPU_API_KEY=TU_API_KEY_DE_KHIPU
   PUBLIC_URL=https://TU_URL_PUBLICA_DEL_TUNEL
   ```

   - `PUBLIC_URL` será la URL que te entregue LocalTunnel (ejemplo: `https://xxxxx.loca.lt`).

---

## Ejecución

1. Inicia el servidor:
   ```   
   npm run dev
   ```

2. Verifica la salud en tu navegador:

   - Local: [http://localhost:3000/health](http://localhost:3000/health)  
   - Público: `https://TU_URL_PUBLICA/health`

   → Deben ambos responder con `ok`.

---

## Flujo de pago (DemoBank)

### 1. Crear un pago (desde Postman)

- **Endpoint**:  
  ```
  POST http://localhost:3000/create-payment
  ```

- **Body (JSON)**:
  ```json
  {
    "amount": 2000,
    "subject": "Pago de prueba Khipu",
    "payer_email": "test@example.com",
    "payer_name": "Cliente Demo"
  }
  ```

- **Respuesta esperada** (resumen):
  ```json
  {
    "payment_id": "XXXXXXXX",
    "payment_url": "https://khipu.com/payment/XXXXXX",
    "return_url": "https://TU_URL_PUBLICA/success",
    "notify_url": "https://TU_URL_PUBLICA/webhook"
  }
  ```

### 2. Completar el pago

1. Copia el `payment_url` de la respuesta.  
2. Ábrelo en tu navegador.  
3. Selecciona **DemoBank** y paga ≤ $5.000 CLP.  
4. Khipu redirigirá al `return_url` y enviará un **webhook firmado** al endpoint `/webhook`.

### 3. Recibir la notificación (webhook)

En tu terminal deberías ver un log similar a:

```
Webhook recibido: { payment_id: "XXXXXX", status: "done", ... }
```

## Seguridad

- El endpoint `/webhook` valida la **firma HMAC** enviada por Khipu.  
- Si la firma es inválida → responde `403 invalid signature`.  
- Esto asegura que solo notificaciones oficiales de Khipu sean aceptadas.
---

## Estructura del proyecto

```
khipu-csm-demo/
├── server.js         # Servidor Express con endpoints de integración
├── package.json      # Dependencias y scripts npm
├── .env.example      # Variables de entorno (plantilla)
└── README.md         # Documentación del proyecto
```
