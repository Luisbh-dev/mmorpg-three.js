# Planificación Detallada del Desarrollo

## Estado Actual (v0.2.5 - Alpha)
- [x] **Core**: Cliente (Three.js) y Servidor (Socket.io) conectados.
- [x] **Movimiento**: Control FPS (WASD + Mouse), sincronización multijugador.
- [x] **Mundo**: Mapa 400x400 con 3 zonas de facción + Zona de Guerra central.
- [x] **Combate Básico**: Ataque cuerpo a cuerpo/rango simple, daño, muerte y respawn.
- [x] **NPCs**: Mobs básicos con IA de persecución (Lobos, Esqueletos, Bandidos, Guardianes).
- [x] **UI**: HUD (Vida, Skills, XP, Oro), Minimapa, Mapa del Mundo (M), Etiquetas de nombre.
- [x] **Creación de Personaje**: Rediseño UI completa, previsualización 3D, selección de facción.
- [x] **Sistema de Experiencia (XP)**: Ganancia de XP, niveles, escalado de stats.
- [x] **Sistema de Loot e Inventario**: Drops de mobs, recogida (E), UI de inventario (I).
- [x] **Consumibles**: Uso de pociones desde inventario.
- [x] **Habilidades (Skills)**: Habilidad "Q" implementada con cooldowns y UI.
- [x] **Autenticación**: Login, Registro, Selección y Borrado de PJ.
- [x] **Persistencia**: Guardado automático en DB.

---

## Fase 4: Autenticación y Cuentas (PRIORIDAD ALTA)
- [ ] **Sistema de Cuentas**
  - [ ] Pantalla de Login/Registro.
  - [ ] Base de datos de usuarios (Credentials, Faction).
  - [ ] Restricción de facción por cuenta (Una vez elegida, todos los PJ son de esa facción).
- [ ] **Selección de Personaje**
  - [ ] Pantalla de selección de personajes tras login.
  - [ ] Listado de personajes creados (Nombre, Nivel, Clase).
  - [ ] Opción "Crear Nuevo Personaje" (Límite X slots).
  - [ ] Botón "Jugar".
- [ ] **Persistencia Completa**
  - [ ] Guardar personajes en DB (Stats, Inventario, Posición).

## Fase 5: Mundo y Lore (EN PROGRESO)
- [ ] **Geografía y Límites**
  - [ ] Implementar muros/montañas impasables entre zonas de facción para canalizar el flujo hacia el centro.
  - [ ] Definir puntos de paso (puertas) custodiados.
- [x] **Lore de Facciones**
  - [ ] **Orden del Sol**: Teocracia militar. Creen que el "Gran Cataclismo" fue castigo por la oscuridad.
  - [ ] **Pacto de la Sombra**: Buscadores de conocimiento prohibido. Creen que la luz ciega la verdad.
  - [ ] **Alianza Natural**: Druidas que protegen el equilibrio. Ven la guerra como una plaga.
- [x] **NPCs y Diálogo**
  - [ ] Sistema de interacción (Tecla 'E' para hablar).
  - [ ] Ventana de diálogo con texto estilo RPG.

## Fase 6: Sistema de Misiones (Quests)
- [x] **Backend**
  - [ ] Tabla `quests` (ID, Título, Descripción, Recompensa).
  - [ ] Tabla `player_quests` (Estado: Activa, Completada).
- [x] **Frontend**
  - [ ] Indicadores de misión sobre NPCs (! / ?).
  - [ ] Tracking de objetivos en el HUD.

## Fase 7: Optimización y Pulido (PENDIENTE)
- [ ] **Sonido**: Efectos de sonido (ataque, pasos, ambiente).
- [ ] **Culling y Performance**: No renderizar jugadores/mobs muy lejanos.
- [ ] **Animaciones Avanzadas**: Integrar sistema de animaciones (Mixamo).

## Fase 8: PvP Avanzado y Conquista
- [ ] **Captura de Fuertes**
  - [ ] Estructura "Fuerte Central" con zona de captura.
  - [ ] Sistema de puntuación por facción.
  - [ ] UI de estado de la guerra en tiempo real.
- [ ] **Ranking**
  - [ ] Tabla de clasificación (Kills/Honor).

## Fase 7: Optimización y Pulido
- [ ] **Culling y Performance**: No renderizar jugadores/mobs muy lejanos.
- [ ] **Animaciones**: Integrar un sistema de animaciones (Mixamo o similar).
- [ ] **Sonido**: Efectos de sonido (ataque, pasos, ambiente).
