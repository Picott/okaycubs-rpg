# OkayCubs — manual para agentes

Este archivo lo lee cualquier agente (Claude Code, Codex, Paperclip, etc.) antes de tocar el repo.
Reportes y conversación con Juan en español; todo lo que ve un cliente (tienda, juego, emails) en inglés.

## Qué es esto

- `merch/` — app Next.js 14 desplegada en Vercel (raíz del proyecto en Vercel = `merch/`). Producción: https://www.okaycubs.space (alias https://okaycubs-rpg.vercel.app).
  - Tienda de merch print-on-demand **"OkayCubs by πcott"**: la colección son los ~50 Cubs que posee Juan (`COLLECTOR_WALLET`); cualquiera puede comprarlos en hoodie / crewneck / joggers / tee / beanie / gorra con mockups reales de Printful. Un holder puede conectar Phantom y vestir sus propios Cubs. Paga con Stripe (live) o con SOL. El pedido se crea en Printful.
  - **Propiedad intelectual**: Juan no es el creador de OkayCubs. Solo se venden Cubs que él posee (o que posee la wallet conectada). Nunca ofrecer Cubs de terceros ni usar "OkayCubs" como marca propia; la tienda se presenta como colección independiente de un coleccionista, con aviso de no afiliación. Pendiente: confirmar la licencia de la colección / hablar con los creadores.
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
2. ~~Pago en SOL con precio del navegador~~ Resuelto en la rama `claude/store-sprint-1` (precio en servidor, intención en Redis, fulfil idempotente). Pendiente: fusionar tras aprobación.
3. ~~Pedidos Printful en borrador / sin comprobar errores / imagen IPFS~~ Resuelto en la misma rama (confirm=true, errores visibles, imagen en Blob, pedidos en Redis, email al cliente para el aviso de envío).
4. ~~Envío no cobrado~~ Resuelto en la misma rama: tarifa viva de Printful por país, 60+ países con Colombia y UE, aviso de aduana.
5. ~~Rutas de depuración abiertas~~ Resuelto en la misma rama: `test*` eliminadas; `catalog` y `store-info` detrás de `ADMIN_KEY`. Nuevo `/api/orders` (admin) para la rutina de pedidos.
6. Proxy de Tensor devuelve 502 (floor price apagado).
7. Sprint 1 fusionado el 8 nov 2026. `ADMIN_KEY` configurada; el store id de Printful se resuelve solo. Catálogo verificado en `ops/reports/catalogo.md`.
8. Primer pedido real de prueba creado el 10 nov 2026 (Printful #185932064, gorra a Girón, pagado en Stripe test). Lecciones ya codificadas: Stripe entrega la dirección en `collected_information`; los bordados exigen `embroidery_type` + `thread_colors` (se derivan del arte); `external_id` de Printful ≤ 32 caracteres; la página `/order/success` crea el pedido si el webhook no llegó. Stripe test y live tienen webhooks y secretos distintos.
9. **Stripe en modo live desde el 10 nov 2026**: `sk_live` y el `whsec` del endpoint live en Vercel (Production). Las tarjetas de prueba ya no funcionan en producción; para probar el checkout sin cobrar, usar un deployment de preview con las claves de test. La tienda ya vende de verdad.

Backlog del juego: ranking semanal de tiempos (roads y jefes), perfil público de hunter, osos como agentes (idea, sin prioridad).

## Dónde está cada cosa

- Productos y variantes: `merch/lib/products.ts`. Checkout: `merch/lib/stripe.ts`, `merch/app/api/checkout/*`. Fulfillment: `merch/app/api/webhook/stripe/route.ts`, `merch/app/api/checkout/solana/fulfill/route.ts`, `merch/lib/printful.ts`. Mockups: `merch/app/api/printful/mockup/route.ts`.
- Juego: reglas en `merch/public/engine.js`; IA de guardianes y jefes en `guardian.js`; plataformas y arena en `honey-road.js`; música en `gamemusic.js`; servidor en `merch/lib/gameStore.ts` y `merch/app/api/game/*`.
- Roles y rutinas de los agentes: `ops/`.
