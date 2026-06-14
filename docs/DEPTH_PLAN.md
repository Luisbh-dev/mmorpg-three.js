# MMORPG Depth Plan — 4 pillars (city identity · questline · subclasses · progression)

Designed via parallel pillar agents + synthesis + adversarial critique (workflow `mmorpg-depth-design`).
This is the **implementation-ready** spec with the critique's blocker fixes baked in.

## One progression spine, four interlocking pillars
ATTRIBUTES drive growth → the QUESTLINE walks you city-to-city while skills/attributes unlock →
at the questline capstone (≈L12, arrive at capital) the SUBCLASS choice unlocks → CITY IDENTITY
gives each questline hub a vendor specialty + signature so the routing has a reason.

- ONE `subclass` column, ONE unlock path: questline Ch.8 sets `flags.subclassUnlocked`; barracks trainer
  offers `subclass:choose` only when `flags.subclassUnlocked && level >= SUBCLASS_MIN_LEVEL(10)`.
- ONE growth model: rewrite `applyLevelUps` (flat per-level + 1 attribute point, cap 30). REPLACE the
  duplicate inline level-up loop in `quest:complete` with `applyLevelUps(player)`.
- ONE stat order in `buildCombatStats(class, level, equipped, attributes, subclass)`:
  base → flat level growth → attributes(str/vit/dex/spi) → subclass statMods → equipment.
  Returns `critChance, critMult, regenBonus, passiveDmgPct`. `passiveDmgPct` applied ONCE per damage
  path in `player:skill`/`player:attack` — NEVER baked into `buildCombatStats.dmg`.
- Skill gating owned by progression (`SKILL_UNLOCK={1:1,2:2,3:4,4:10}` checked in `player:skill`),
  slot-4 CONTENT owned by subclass (`SUBCLASS_DB[class][sub].skill4`). Slot 4 active iff `level>=10 && subclass`.

## DB migrations (server/database.js, guarded ALTERs in the table_info(characters) callback)
```
subclass TEXT DEFAULT ''
attributes TEXT DEFAULT '{"str":0,"vit":0,"dex":0,"spi":0}'
unspent_points INTEGER DEFAULT 0
flags_json TEXT DEFAULT '{}'
```
- `savePlayer` UPDATE += subclass, attributes (JSON), unspent_points, flags_json (JSON). Keep dbId last.
- `character:select`: parse `attributes/subclass/flags/unspentPoints` from `char` BEFORE buildCombatStats;
  call `buildCombatStats(char.class, char.level, equipped, attributes, subclass)`; store all on player literal.
- New character relies on column DEFAULTs (don't touch INSERT; level 1 = 0 points).

## Code config (server/index.js, never persisted)
```
LEVEL_CAP=30
ATTR_PER_POINT={str:{dmg:2}, vit:{maxHp:12}, dex:{critChance:0.004}, spi:{regen:0.4}}
XP_TABLE={1:120,2:240,3:400,4:600,5:850,6:1150,7:1500,8:1900,9:2350,10:2850,11:3400,12:4000,
          13:4650,14:5350,15:6100,16:6900,17:7750,18:8650,19:9600,20:10600,21:11650,22:12750,
          23:13900,24:15100,25:16350,26:17650,27:19000,28:20400,29:21850,30:Infinity}
getXpForLevel(l)=XP_TABLE[l] ?? Infinity
SKILL_UNLOCK={1:1,2:2,3:4,4:10}
GEAR_TIER_REQ={common:1,uncommon:5,rare:10,epic:16,legendary:22}
ATTR_RESPEC_COST=200; SUBCLASS_MIN_LEVEL=10; SUBCLASS_RESPEC_COST=250
SUBCLASS_DB={ '<Class>': { '<subKey>': { name, role, desc,
   skill4:{slot:4,key:'4',name,type,cost,cooldown,value,[range|radius|duration]},
   passive:{bonusArmor?,bonusDmgPct?,lifesteal?,critChanceAdd?,critMultAdd?,regenMul?,regenAdd?},
   statMods:{hpMul?,dmgMul?,rangeAdd?} } } }   // 12 entries (2 per class) — content in workflow output
```
loot.js: `SHOP_STOCKS.arcanist`, `SHOP_STOCKS.provisioner`; quest-token ITEM_DEFS
(`bandit_insignia, orc_tusk, cursed_bone, blight_sap, heartwood_core`, itemType:'quest').

## Quest schema (extended; legacy 3 kill-quests kept via getQuestObjectives fallback)
`{ id, chain:'main', order:1..8, level, requires:questId|null, giverNpc, turnInNpc,
   objectives:[{type:'kill'|'collect'|'visit'|'talk', mob?,item?,count?,dropChance?,settlement?,radius?,npc?,label}],
   rewards:{xp,gold,item?,unlocks?} }`
Player quest state shape: `{accepted, completed, objectives:[{progress}]}` — `loadQuestState()` upgrades
legacy `{progress,completed}` in place (progress→objectives[0].progress).

## Phases (dependency-ordered; each shippable + verifiable)
- **Phase 0** — schema + empty config scaffold. No behavior change; old saves load identical.
- **Phase 1** — progression core: XP_TABLE, flat growth, attributes, skill+gear gating, CharacterSheet (key C), HUD bar 1-4 with locked slots.
- **Phase 2** — subclasses: SUBCLASS_DB content, slot-4 skill, passives, `subclass:choose`/respec at trainer.
- **Phase 3** — questline: 8-chapter campaign/faction, kill/collect/visit/talk objectives, `maybeDropQuestItem`, story envoys, prereq gating, Ch.8 flag write, HUD quest log.
- **Phase 4** — city identity: SETTLEMENT_PROFILES, multi-city establishments, vendor specialties, signature structures, zone banner specialty.
- **Phase 5 (user ask)** — enterable building interiors + cooler cities (designed at implementation time).

## CRITIQUE BLOCKER FIXES (client silently drops new fields — do these or it "works" server-side but renders nothing)
1. **world:state handler** (useGameStore.js ~130) destructures a FIXED set → ADD
   `subclasses={}, skillUnlocks={}, attrPerPoint={}, levelCap=30, gearTierReq={}` and store them (add to baseSessionState).
2. **unspentPoints desync**: `player:exp` rewrites only {xp,maxXp,level}; `player:levelup` replaces `stats` wholesale.
   Put `unspentPoints` on `player.stats` (rides existing replacement) OR emit `player:attrUpdate` on level-up too.
3. **HUD action bar** (HUD.jsx ~194) hardcodes `[1,2,3].filter(Boolean)` → iterate `[1,2,3,4]`, DON'T filter;
   render a locked SkillSlot when `level < skillUnlocks[slot]` (overlay "Nv N") and slot-4 when unspecialized.
4. **Input** (World.jsx ~338-340) only Digit1/2/3 → add `Digit4→castSkill(4)` and `KeyC→toggleCharSheet()`
   inside the panelsOpen/INPUT-focus guard; add `isCharSheetOpen` to store + panelsOpen().
5. **maybeDropQuestItem** is `function maybeDropQuestItem(){}` (index.js:643) CALLED as `(attacker, mob.type)` (684).
   Implement with `(player, mobType)` signature. Collect tokens: auto-CONSUME on count (sell blocked for quest items);
   pickup has NO 20-slot cap — guard it.
6. **quests_json shape**: update BOTH server readers (updateQuestProgress, quest:complete, player:talk quest branch)
   AND HUD render (~276-284 reads quest.progress/def.targetCount) to use objectives[]. Keep getQuestObjectives fallback.
7. **quest:complete dedup**: replace inline loop (1494-1502) with `applyLevelUps`; also `io.emit('player:exp',…)` (quest XP never updated the client bar before).
8. **buildCombatStats ripple**: 3 call sites (character:select 1277, recomputeStats 347, via equip). In select, parse attributes/subclass from `char` and pass positionally (player object doesn't exist yet).
9. **backward-compat stat drop**: flat growth < old 1.1x compounding → existing high-level saves visibly lose HP at login.
   `deriveUnspent=max(0,(level-1)-sum(attributes))` grants owed points; add `flags.migratedV2` so points aren't re-granted; clamp hp carefully.
10. **DialogUI** (handles only open_shop/rest/accept_quest/complete_quest) → add `choose_subclass` + story quest actions; add store actions chooseSubclass/spendAttribute/respecAttributes.
11. **<NPC> props** (World.jsx 682-693 passes id/name/position/faction/type/role/questId) → thread `storyState, establishment, shopKind, themeLabel` for markers/specialty.
12. **proximity numbers**: player:talk gates `dist>5`, E-key `<4`, plan wants `<=6` for trainer/turn-in → reconcile to one value.
13. **visit objectives**: throttle `advanceVisitObjectives` to ~1/s via `player.lastVisitCheck`; scan only the active objective's target settlement; do NOT savePlayer in player:move.

Full pillar content (12-entry SUBCLASS_DB, 8-chapter campaign per faction, 12 SETTLEMENT_PROFILES,
9 signature structures) is in the workflow output:
`.../tasks/wl58mt6m5.output` (designs[] array). Extract per phase.
