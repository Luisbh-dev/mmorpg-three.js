# Plan de Desarrollo

## Estado Actual
- [x] Cliente React + Three.js con control FPS y sincronizacion multijugador.
- [x] Servidor Socket.io con login, registro, seleccion de personaje y borrado.
- [x] Persistencia en SQLite para personaje, inventario y progreso de misiones.
- [x] Mundo dividido en 3 territorios de faccion y una zona de guerra central.
- [x] NPCs de mision, mobs por bioma, loot, inventario y consumibles.
- [x] Habilidad de clase en `Q`, experiencia, subida de nivel y respawn.
- [x] Fortalezas conquistables en el centro con bonus de dano por faccion.
- [x] HUD, minimapa y mapa del mundo mostrando misiones, control territorial y estado del jugador.

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
