# Operación continua con Paperclip

Objetivo: que la tienda y el juego se mantengan solos, con agentes que trabajan cada día y una persona (Juan, el Board) que solo aprueba. Este directorio tiene lo que se pega en Paperclip: los roles (`agents/`) y las rutinas (`routines.md`). `AGENTS.md` en la raíz es el manual que todos los agentes leen.

## Qué es Paperclip y qué necesita

Paperclip (github.com/paperclipai/paperclip, MIT) es un servidor que organiza agentes como una empresa: organigrama, objetivos, tareas, aprobaciones, presupuesto por agente y rutinas programadas. Los agentes son runtimes externos (Claude Code, Codex, Cursor, Gemini CLI…) que Paperclip despierta cuando hay una tarea o una rutina.

Necesita una máquina encendida. Tres opciones, de más barata a más cómoda:

1. **Tu Mac.** Gratis. Solo trabaja cuando el Mac está encendido y despierto. Suficiente para empezar.
2. **Un VPS pequeño** (Hetzner, Railway, Fly, Zeabur) con la imagen Docker que incluye el repo: 5 a 10 USD al mes. Trabaja 24/7.
3. Una Mac mini en casa siempre encendida.

Requisitos: Node 24.11+ y pnpm 9.15+. Base de datos Postgres embebida (no hay que instalar nada). Para que los agentes sean Claude Code hace falta tener Claude Code instalado y con sesión iniciada en esa máquina; el consumo va contra tu suscripción o contra una API key.

## Instalación (en tu máquina)

```bash
npx paperclipai@latest onboard --yes
```

Abre http://localhost:3100. Luego:

1. **Company** → crear "Okay Cubs". Pegar como descripción el primer párrafo de `AGENTS.md`.
2. **Agents** → crear tres, adapter "Claude Code", directorio de trabajo = este repo clonado en esa máquina. Pegar como instrucciones el contenido de `ops/agents/mercado.md`, `ops/agents/tienda.md` y `ops/agents/analista.md`.
3. **Approvals** → activar revisión para todo lo que toque producción (los agentes ya lo saben por `AGENTS.md`, pero la barrera debe estar también en Paperclip).
4. **Budgets** → poner un tope por agente (por ejemplo 20 USD/mes) para que no haya sorpresas.
5. **Routines** → crear las de `ops/routines.md` con sus horarios.
6. Probar con una tarea manual: "Audita `merch/lib/products.ts` y proponme un cambio en una rama de preview".

Acceso remoto desde el celular: arrancar con `--bind tailnet` (Tailscale) o desplegar el Docker en el VPS con autenticación.

## Costos reales

- Hosting: 0 (Mac) o 5–10 USD/mes (VPS).
- Agentes: cada rutina diaria de revisión cuesta centavos; un reporte semanal, menos de 1 USD; una tarea de código, de 1 a 5 USD. Con los topes en Paperclip no pasa de lo que tú fijes.

## Lo que un agente no va a resolver solo

- Rotar las claves (Printful, Stripe, Helius, Tensor) y ponerlas en Vercel: lo haces tú, los agentes no deben ver valores de secretos.
- Pagar un pedido de prueba, aprobar precios, decidir productos.
- Traer tráfico: eso es comunidad y redes, con tu voz.
