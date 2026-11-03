# Rutinas para Paperclip

Horarios en hora de Bogotá. Cada rutina crea una tarea para el agente indicado con el texto de "Prompt".

| Rutina | Agente | Cuándo | Prompt |
|---|---|---|---|
| Pedidos sin tracking | Tienda | Diario 8:00 | Revisa los pedidos de los últimos 7 días. Lista los pagados sin tracking a las 48 h con id de Printful y estado. Si no hay pedidos guardados aún, dilo en una línea y termina. |
| Salud del sitio | Tienda | Diario 8:10 | Comprueba que https://okaycubs-rpg.vercel.app, /game.html y /api/game/config responden. Si algo falla, abre una tarea con el error exacto. |
| Reporte de mercado | Mercado | Lunes 9:00 | Escribe `ops/reports/semana-<fecha>.md` según tu rol: costos Printful, competencia, máximo 3 propuestas, decisiones pendientes para Juan. |
| Reporte de métricas | Analista | Lunes 9:30 | Escribe `ops/reports/metricas-<fecha>.md` según tu rol. |
| Revisión de costos Printful | Mercado | Día 1 de cada mes 9:00 | Verifica en las fichas vivas de Printful el costo de cada producto de `merch/lib/products.ts` y de `ops/reports/catalogo.md`. Si cambió más de 5 %, propón nuevo precio con margen. |
| Deuda técnica | Tienda | Viernes 10:00 | Toma el primer punto abierto de "Prioridades abiertas" de tu rol que no tenga rama, hazlo en una rama `claude/*` con preview y deja el resumen para aprobación. |

Primer sprint (tareas manuales, no rutinas):
1. Tienda: puntos 1 y 2 de prioridades (pago SOL seguro, pedidos Printful fiables) en una sola rama.
2. Tienda: envío cotizado por país y apertura de Colombia + UE.
3. Mercado: borradores de descripciones y posts para los 5 productos que Juan elija.
4. Tienda: montar los 5 productos en preview.
5. Juan: pedido de prueba real y aprobación.
