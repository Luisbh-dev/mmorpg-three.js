# ⚔️ MMORPG Medieval — Three.js

Un MMORPG de fantasía medieval **jugable en el navegador**: mundo abierto en 3ª persona, 3 facciones en guerra, campaña lineal que te lleva de ciudad en ciudad, subclases, progresión por atributos, ciudades con edificios donde puedes **entrar**, y combate con habilidades, botín y jefes de mundo.

> Construido con React + Three.js (cliente) y Node + Socket.io (servidor autoritativo de combate/persistencia).

---

## 🎮 Características

### Mundo
- **Mapa abierto de ~2 km** con cámara en tercera persona (WASD + ratón).
- **3 facciones** (Orden del Sol ☀️, Pacto de la Sombra ☾, Alianza de la Naturaleza ❧), cada una con **12 asentamientos** (capital, ciudades, pueblos, aldeas, atalayas).
- **Biomas diferenciados** mediante vegetación instanciada (Kenney Nature Kit): llanuras doradas y cactus al norte, bosque frondoso al este, tierras ceniza con árboles muertos al oeste, frontera de pinos.
- **Ciclo día/noche** dinámico (sol que describe un arco, luz/niebla/cielo cambiantes).
- **Zona de Guerra central** con fortalezas conquistables que dan bonus de daño a la facción que las controla.
- **Puntos de interés** en el yermo: campamentos, ruinas y **santuarios activables** que conceden bendiciones temporales.

### Ciudades vivas
- Cada asentamiento tiene **identidad propia**: tema, estructura-firma (yunque de forja, obelisco arcano, campanario…) y **vendedor especializado**.
- **Edificios interactivos en los que entras**: Herrería, Botica, Taberna, Templo, Ayuntamiento, Cuartel, Arcanorium, Mercado. Pulsa **E** en la puerta y entras a un **interior 3D** temático con el NPC y sus servicios.
- Tiendas con stock especializado (armas/armadura, pociones, abalorios, suministros), descanso en taberna, y entrenador de subclases.

### Progresión
- **6 clases**: Paladín, Clérigo, Pícaro, Druida, Cazador, Nigromante — cada una con recurso propio (fe/maná/energía/foco), 3 habilidades y crítico.
- **Atributos asignables** al subir de nivel (Fuerza, Vitalidad, Destreza, Espíritu) — ficha de personaje con la tecla **C**.
- **Nivel máximo 30** con curva de XP equilibrada; habilidades que se **desbloquean por nivel** y equipo **restringido por nivel/rareza**.
- **Subclases**: 2 por clase (12 en total), cada una con una **4ª habilidad + pasiva + sesgo de stats**. Se desbloquean al **completar la campaña principal**.

### Campaña
- **Questline lineal de 8 capítulos por facción** que enruta físicamente al jugador: ciudad inicial → aldea → pueblo → ciudades → **capital**.
- Objetivos variados: **matar, recolectar, visitar y hablar**. Registro de misiones en el HUD con seguimiento y pista de destino.
- El capítulo final desbloquea tu especialización.

### Combate
- Habilidades por tipo (daño, proyectil, área, dot, drenaje, sanación, mejora, esquiva) con coste de recurso y enfriamiento — **cada una con su propia animación**.
- **Crítico, robo de vida, armadura y mitigación de daño** (bufos defensivos como el escudo del Guardián).
- Botín con **rarezas** (común→legendario), equipo por slots (arma/cabeza/pecho/piernas/abalorio), oro y tiendas.
- **Jefe de mundo** periódico (comando `/boss`).
- Daño flotante, barras de vida, objetivo seleccionable (Tab).

---

## ⌨️ Controles
| Tecla | Acción |
|---|---|
| **WASD** | Mover |
| **Ratón (clic derecho)** | Orbitar cámara · rueda = zoom |
| **Clic izquierdo** | Ataque básico |
| **1 / 2 / 3 / 4** | Habilidades (4 = subclase) |
| **Tab** | Seleccionar objetivo más cercano |
| **E** | Interactuar (hablar, entrar a edificio, orar en santuario, recoger) |
| **C** | Ficha de personaje / atributos |
| **I** | Inventario · **M** Mapa · **Esc** Menú |

---

## 🧱 Stack técnico
- **Cliente**: React 18, [@react-three/fiber](https://github.com/pmndrs/react-three-fiber) + drei, [Zustand](https://github.com/pmndrs/zustand), Three.js, Vite. (puerto **3000**)
- **Servidor**: Node.js, Express, Socket.io, SQLite3. Combate, XP, misiones y persistencia son **autoritativos en el servidor**. (puerto **3001**)
- Movimiento autoritativo en cliente con colisiones client-side; el render del mundo usa *instancing* y *distance culling* para sostener el mapa grande.

---

## 🚀 Cómo ejecutarlo
Requiere Node.js 18+.

```bash
# 1) Servidor (puerto 3001)
cd server
npm install
node index.js

# 2) Cliente (puerto 3000) — en otra terminal
cd client
npm install
npm run dev
```
Abre **http://localhost:3000**, regístrate, crea un personaje (elige clase y facción) y entra al mundo.

---

## 📁 Estructura
```
client/
  src/
    components/        # World, game/ (Terrain, Settlement, Establishment, CharacterModel, Mob, NPC…), ui/ (HUD, Inventory, Shop, DialogUI, CharacterSheet, InteriorView…)
    lib/               # gameData (mundo, facciones, asentamientos, campaña), terrain, colliders, uiTheme
    stores/            # useGameStore (Zustand: estado + sockets)
    systems/           # AudioManager
  public/assets/       # kaykit (personajes), kenney (castle/nature/city/building kits), audio
server/
  index.js             # socket.io: combate, skills, quests, subclases, tiendas, jefes, persistencia
  loot.js              # items, tablas de botín, stock de tiendas
  database.js          # esquema sqlite + migraciones
docs/                  # PLANNING.md, DEPTH_PLAN.md
```

---

## 🎨 Créditos de assets (CC0)
- **Personajes**: [KayKit Adventurers](https://kaylousberg.itch.io/kaykit-adventurers) (CC0).
- **Entorno y edificios**: [Kenney](https://kenney.nl) — Castle Kit, Nature Kit, City Kit (Roads), Modular Buildings (CC0).
- **Audio**: efectos de sonido de Kenney (CC0).

Todos los assets de terceros son CC0. El código es del autor del proyecto.
