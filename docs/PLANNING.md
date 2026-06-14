# Plan de Desarrollo

## Estado Actual
- [x] Cliente React + Three.js con sincronizacion multijugador.
- [x] Servidor Socket.io con login, registro, seleccion de personaje y borrado.
- [x] Persistencia en SQLite para personaje, inventario y progreso de misiones.
- [x] Mundo dividido en 3 territorios de faccion y una zona de guerra central.
- [x] NPCs de mision, mobs por bioma, loot, inventario y consumibles.
- [x] Habilidad de clase en `Q`, experiencia, subida de nivel y respawn.
- [x] Fortalezas conquistables en el centro con bonus de dano por faccion.
- [x] HUD, minimapa y mapa del mundo mostrando misiones, control territorial y estado del jugador.

## Fase 1 — Mundo vivo + camara en 3a persona (HECHO Y VERIFICADO)
- [x] Camara orbital en tercera persona (RMB orbita, rueda zoom) con el avatar local visible; movimiento WASD relativo a la camara y giro hacia la direccion.
- [x] Altura de terreno compartida (`client/src/lib/terrain.js`): el jugador pisa el suelo en cada bioma.
- [x] Colisiones client-side (`client/src/lib/colliders.js`): murallas (anillo + radiales), POIs y borde del mundo, con deslizamiento. Asentamientos y estructuras centrales quedan transitables a proposito (NPCs / puntos de control).
- [x] Estructuras centrales (fortaleza/arena/puertas/ruinas) reconstruidas con los kits de Kenney para coherencia visual (`CentralStructures.jsx`, `kenneyAssets.jsx`).
- [x] Naturaleza instanciada por bioma (`InstancedScatter.jsx`) y puntos de interes (`PointsOfInterest.jsx`: campamentos, santuarios, ruinas).
- [x] Densidad de mobs por campamentos en el servidor (`MOB_CAMPS`, relleno periodico, nivel escalado por bioma; `MOBS_LIMIT` 30 -> 70).
- [x] **Texturas Kenney arregladas**: faltaba `Textures/colormap.png` en los kits (estaban en blanco). Descargada (CC0) y colocada en castle-kit, city-kit-roads, modular-buildings y characters.
- [x] **Personajes animados** (Kenney Mini Characters, CC0): `CharacterModel.jsx` reescrito — modelo por clase, animaciones idle/walk, normalizado en tamano, anillo de faccion y VFX de ataque. Reemplaza el paladin/cleric rotos y los avatares primitivos.
- [x] **Interfaz in-game rediseñada** con tema unico de fantasia oscura/laton (`client/src/lib/uiTheme.js`, fuentes Cinzel + Spectral): HUD compacto (marco de jugador, barra de habilidades con cooldown, paneles de guerra/misiones), chat, dialogo, inventario (con colores de rareza), menu de sistema y mapa, todos coherentes.
- [x] **Texto de daño flotante** en combate (`addFloatingText` en el store + `CombatTextLayer` en World).
- [x] **Mercader funcional**: vende Pocion de Vida por oro (`shop:buy` en servidor, opcion de compra en el dialogo). Antes solo soltaba texto.

> Verificado end-to-end con navegador headless (login -> crear -> mundo): 0 errores de consola, avatar animado visible, UI correcta. Movimiento sigue autoritativo en cliente; el escalado de red es la fase de netcode.

## Fase 2 — En curso (combate, personajes, mundo grande)
- [x] **Personajes KayKit (CC0)** medievales y animados por clase (Knight/Mage/Rogue/Rogue_Hooded), con animacion de **ataque real** (slice/stab/spellcast/ranged) via maquina de estados en `CharacterModel.jsx` (idle/correr/atacar). Hueso `handslot.r` disponible para anclar armas en el futuro.
- [x] **Mundo ~6x mas grande** (MAP_RADIUS 320 -> 780): 27 asentamientos generados por plantilla (9 por faccion), **ciudad inicial por faccion** (spawn), capitales, mas NPCs (servicios completos en la ciudad inicial), realm centralizado `getRealmAt` (terreno/scatter/zona coherentes), POIs repartidos, scatter mas denso, niebla/sombras ajustadas, **sol que sigue al jugador** para sombras nitidas en todo el mapa.
- [x] **Recursos + 3 habilidades por clase** (server `SKILL_KITS` + `RESOURCE_DB`, sin BD): coste + cooldown + efectos (damage/projectile/heal/dash/drain/aoe/dot con ticks), regeneracion de recurso, teclas 1/2/3 (Q = slot 2). HUD: barra de recurso + barra de 4 ranuras con coste/cooldown/atenuado.
- [x] **Mercader funcional** (compra pociones), **daño flotante**, **interfaz unificada** (tema laton/Cinzel) en HUD/chat/dialogo/inventario/menu/mapa.

### Fase 2 — combate RPG (HECHO Y VERIFICADO)
- [x] **Equipo/loot con rarezas**: `server/loot.js` (24 items: armas/cabeza/pecho/piernas/abalorio en 5 rarezas + consumibles + quest), drop tables por mob (elites mejores), `slot`/`rarity`/`stats`; equipar/desequipar (`player:equip`/`unequip`), stats aplicadas a combate (bonusDmg/Hp/Armor/Range/lifesteal), armadura mitiga daño, robo de vida, persistencia columna `equipped`. Inventario con ranuras de equipo + atributos + colores de rareza.
- [x] **Tienda completa** (`ShopUI.jsx`): hablar con mercader → comprar (precio autoritativo, 13 items) / vender (por rareza). `shop:open/buy/sell`.
- [x] **Objetivo seleccionable**: clic en mob o Tab (más cercano) → marco de objetivo (nombre/nivel/HP) en HUD; ataque/habilidades priorizan el objetivo; anillo de selección; clic en vacío deselecciona. **Críticos** por clase (texto flotante grande dorado). Mobs se desvanecen al morir.
- [x] **Jefe de mundo**: Coloso de la Forja (4000 HP) aparece cada ~3 min en la arena (o `/boss` en el chat), con banner de HP, botín garantizado (Filo del Coloso épico + oro + poción) y **buff de facción +15% daño 2 min** al matarlo.

### Pendiente (siguiente)
- [ ] Misiones multi-objetivo (recolectar/visitar) + más misiones + entrenador (`maybeDropQuestItem` es un stub).
- [ ] Anclar armas KayKit al hueso `handslot.r`.
- [ ] Fase 3 — netcode (interest management, deltas, 10-20 Hz autoritativo).
- [ ] Audio/música (mp3 referenciados pero ausentes).

### Herramienta de QA
- `client/scripts/smoke.mjs` (puppeteer-core): login -> mundo -> captura + reporte de errores de consola. `node scripts/smoke.mjs` con los servidores arriba.

## Siguiente Gran Objetivo
- [ ] Convertir la zona de guerra en el corazon del juego con objetivos a medio y largo plazo.
- [ ] Dar mas personalidad jugable a cada clase para que no solo cambie el color o la estadistica base.
- [ ] Empezar a construir un bucle social: grupo, comercio, progreso compartido y rivalidad entre facciones.

## Roadmap Recomendado

### 1. Vertical Slice Jugable
- [ ] Añadir 1 dungeon pequeno cooperativo con jefe final.
- [ ] Crear 1 evento dinamico por territorio: caravana, corrupcion o invasion.
- [ ] Introducir equipamiento con rarezas y bonus simples.

### 2. Profundidad de Combate
- [ ] Ataques dirigidos con cono frontal o proyectiles reales.
- [ ] Barra de recursos por clase: mana, energia o fe.
- [ ] Segunda y tercera habilidad desbloqueables por nivel.

### 3. Progresion MMORPG
- [ ] Arbol de talentos ligero por clase.
- [ ] Profesiones iniciales: herboristeria, mineria, cocina.
- [ ] Reputacion por faccion con recompensas cosmeticas y utilitarias.

### 4. Guerra de Facciones
- [ ] Beneficios distintos por fortaleza capturada.
- [ ] Temporadas de guerra con reinicio de control territorial.
- [ ] Ranking de contribucion por captura, defensa y PvP.

### 5. Social y Persistencia
- [ ] Lista de amigos, grupos y chat por faccion.
- [ ] Banco compartido y correo entre personajes.
- [ ] Guardado de posicion segura y reconexion limpia tras caida.

### 6. Pulido Tecnico
- [ ] Mejorar animaciones de personajes y mobs.
- [ ] Reducir renders y trafico de red con culling/interpolacion.
- [ ] Sustituir placeholders de audio y arte por recursos definitivos.

## Ideas de Juego
- [ ] Cada faccion puede invocar un jefe temporal si controla las 3 fortalezas.
- [ ] Las caravanas entre capital y zona de guerra reparten recursos si llegan vivas.
- [ ] El centro puede corromperse por semanas y abrir una mazmorra publica.
- [ ] Los NPCs reaccionan al estado de la guerra con dialogos y descuentos distintos.
