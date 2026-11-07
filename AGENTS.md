# OkayCubs — manual para agentes

Este archivo lo lee cualquier agente (Claude Code, Codex, Paperclip, etc.) antes de tocar el repo.
Reportes y conversación con Juan en español; todo lo que ve un cliente (tienda, juego, emails) en inglés.

## Qué es esto

- `merch/` — app Next.js 14 desplegada en Vercel (raíz del proyecto en Vercel = `merch/`). Producción: https://okaycubs-rpg.vercel.app (dominio okaycubs.space comprado, pendiente de conectar).
  - Tienda de merch print-on-demand: el holder conecta su wallet Solana, elige su Cub y lo ve en hoodie / joggers / gorra con mockups reales de Printful. Paga con Stripe o con SOL. El pedido se crea en Printful.
  - Juego "OkayCubs: The Honey Chronicles" en `merch/public/` (game.html, hunt.html, honey-road.html) con motor compartido `engine.js` y progreso firmado en servidor (Upstash Redis, Sign-In with Solana).
- Archivos HTML en la raíz del repo (index, about, blog…) son páginas antiguas; los que sirven están en `merch/public/`.

## Regla madre (el Board)

Juan es el Board. Los agentes proponen, investigan y preparan. **Nada se publica, cobra, descuenta ni se promete a clientes sin su aprobación explícita.** Si una tarea toca dinero, clientes, precios, proveedores o la tienda en vivo: parar, dejar el trabajo listo en preview y pedir el visto bueno.

Siempre requiere el sí de Juan:
- publicar o despublicar un producto, cambiar un precio o un envío;
- cualquier gasto (muestras, apps, anuncios, créditos de API);
- cualquier mensaje a clientes o redes;
- reembolsos, reenvíos, descuentos;
- cambiar de proveedor o de integración (Printful, Stripe, Helius, Upstash);
- borrar datos en Redis o tocar variables de entorno en Vercel.

Se puede hacer sin preguntar:
- leer, auditar, investigar, escribir reportes;
- cambios de código en una rama `claude/*` con preview de Vercel, nunca directo a `main` salvo que Juan lo pida;
- tests locales, capturas, pedidos de prueba en modo test de Stripe.

## Cómo trabajar en el código

- Instalar: `cd merch && npm install`. Tipos: `npx tsc --noEmit -p .` (restaurar `tsconfig.tsbuildinfo` después). Dev: `npx next dev -p 3000`.
- Las páginas del juego son estáticas: `python3 -m http.server 8787` dentro de `merch/public` y abrir `/game.html`. Playwright está disponible para bots de prueba.
- `main` despliega solo en Vercel. Las ramas generan preview.
- Secretos solo en variables de entorno de Vercel / `.env.local`. Nombres: `PRINTFUL_API_KEY`, `PRINTFUL_STORE_ID`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `HELIUS_KEY`, `TENSOR_API_KEY`, `MERCHANT_SOLANA_WALLET`, `REVIVE_PRICE_SOL`, `KV_REST_API_URL`, `KV_REST_API_TOKEN` (o `UPSTASH_REDIS_REST_*`), `GAME_SESSION_SECRET`, `BLOB_READ_WRITE_TOKEN`. **Nunca** escribir un valor de secreto en código, commits, reportes ni chat.
- Commits claros, en inglés, sin identificadores de modelo.

## Estado conocido (nov 2026)

Pendiente urgente antes de vender en serio (ver `ops/README.md`):
1. ~~Rotar la clave de Printful que estuvo commiteada en `merch/probe-printful.mjs`~~ Hecho el 7 nov 2026 (archivo eliminado, clave vieja revocada; la vieja sigue en el historial de git pero ya no sirve).
2. Pago en SOL: el precio de SOL llega del navegador (`merch/app/api/checkout/solana/route.ts`); calcularlo en servidor y hacer la referencia idempotente.
3. Pedidos Printful: `lib/printful.ts` crea la orden sin confirmar y sin comprobar errores; enviar la imagen alojada en Blob, no la IPFS; guardar el pedido en Redis; email de confirmación con tracking.
4. Envío: hoy no se cobra. Cotizar por país con la API de Printful y abrir Colombia y UE con aviso de aduana.
5. Rutas de depuración abiertas: `merch/app/api/printful/test*`, `catalog`, `store-info`. Proteger o borrar.
6. Proxy de Tensor devuelve 502 (floor price apagado). Conectar okaycubs.space en Vercel.

Backlog del juego: ranking semanal de tiempos (roads y jefes), perfil público de hunter, osos como agentes (idea, sin prioridad).

## Dónde está cada cosa

- Productos y variantes: `merch/lib/products.ts`. Checkout: `merch/lib/stripe.ts`, `merch/app/api/checkout/*`. Fulfillment: `merch/app/api/webhook/stripe/route.ts`, `merch/app/api/checkout/solana/fulfill/route.ts`, `merch/lib/printful.ts`. Mockups: `merch/app/api/printful/mockup/route.ts`.
- Juego: reglas en `merch/public/engine.js`; IA de guardianes y jefes en `guardian.js`; plataformas y arena en `honey-road.js`; música en `gamemusic.js`; servidor en `merch/lib/gameStore.ts` y `merch/app/api/game/*`.
- Roles y rutinas de los agentes: `ops/`.
