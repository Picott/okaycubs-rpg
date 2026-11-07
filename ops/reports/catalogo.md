# Catálogo Okay Cubs Travel — verificado contra la API de Printful (7 nov 2026)

Store Printful: "Okay Cubs" (native, id 17852645). Costos = precio Printful S–XL; 2XL +$2.00. Envío no incluido en el margen. Precios de venta = **propuesta pendiente de aprobación del Board** (están en la rama `claude/store-sprint-1`, no en producción).

| Producto | Printful | Costo | PVP propuesto | Margen (S–XL) | Colores en tienda | Impresión |
|---|---|---|---|---|---|---|
| Hoodie | Cotton Heritage M2580 · id 380 | $27.84 | $58 | $30.16 · 52 % | Black, Navy Blazer, Charcoal Heather | DTG frente 1800×1800 |
| Crewneck | Cotton Heritage M2480 · id 411 | $24.53 | $52 | $27.47 · 53 % | Black, Navy Blazer, Charcoal Heather | DTG frente 1800×2400 |
| Joggers | Cotton Heritage M7580 · id 412 | $29.98 | $60 | $30.02 · 50 % | Black, Carbon Grey, Navy Blazer | DTG pierna izq. 525×2175 |
| Tee | Bella + Canvas 3001 · id 71 | $11.92 | $30 | $18.08 · 60 % | Black, White, Dark Grey Heather | DTG frente 1800×2400 |
| Beanie | Yupoong 1501KC · id 266 | $13.05 | $28 | $14.95 · 53 % | Black, Heather Grey, Navy | Bordado frente 1500×525 |
| Cap (ya existía) | Yupoong 7005 · id 92 | $17.93 | $45 | $27.07 · 60 % | Black, Grey, Khaki, Navy, Olive | Bordado frente 1200×525 |

Tallas: S–2XL en hoodie, crewneck, joggers y tee. Gorra y beanie talla única.

## Hallazgos al verificar

- **Costos subieron** desde que se escribió el código: hoodie $27.29 → $27.84, joggers $29.39 → $29.98, gorra $17.58 → $17.93. Precios de venta antiguos ($48 / $50 / $45) seguían dando margen, pero menos.
- **Color mal etiquetado en producción**: la variante 24975–24978 del hoodie se vendía como "Vintage White" (hex crema) y en Printful es **Oatmeal Heather**. Corregido en la rama: el hoodie ahora ofrece Black, Navy Blazer y Charcoal Heather. "Navy" era en realidad "Navy Blazer" (mismo id, nombre corregido).
- **Área de impresión del hoodie cambió**: el frente es ahora 1800×1800 px, no 1800×2400. Posición actualizada.
- **Calcetines sublimados (id 882) no envían a Colombia ni a EE.UU.**, solo a Europa y Canadá. Reemplazados por el beanie en la primera ola.
- Las tarifas y pedidos con clave de cuenta exigen `store_id`: el código ahora lo manda siempre (de `PRINTFUL_STORE_ID` o resolviéndolo desde la cuenta).

## Envío estándar real (1 unidad, tarifa viva de Printful)

| Destino | Tee / Beanie | Hoodie / Crewneck / Joggers | Días |
|---|---|---|---|
| EE.UU. | $4.95 | $8.79 | 4–6 |
| Alemania (UE) | $4.99 | $7.29 | 3–6 |
| Reino Unido | — | $7.29 | 2–11 |
| Colombia | $12.49 | $17.70 | 11 (+ aduana al recibir) |
| Colombia, hoodie + joggers juntos | — | $25.69 | 11 |

El checkout cobra la tarifa viva por destino; si Printful no responde usa una tabla de respaldo ligeramente superior ($8.99 / $17.99 / $7.99).

## Pendiente de decisión (Board)

1. Aprobar los precios propuestos (o ajustarlos).
2. ¿Colombia en la primera ola? El envío de $17.70 + aduana hace que un hoodie salga en ~$76 + impuestos al comprador.
3. Pedido de prueba real en el preview (una tee a tu dirección) antes de fusionar.
