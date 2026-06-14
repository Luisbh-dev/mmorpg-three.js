import React, { useEffect, useState } from 'react';
import useGameStore from '../../stores/useGameStore';
import { getFactionControlBonus, getFactionMeta, getQuestTitle, getZoneFromPosition, getLandmarkById } from '../../lib/gameData';
import { UI, FACTION_EMBLEM, titleStyle } from '../../lib/uiTheme';

const toneColor = {
  info: UI.goldBright,
  success: UI.good,
  warning: UI.warn,
  danger: UI.bad
};

const Bar = ({ value, max, fill, height = 12, label }) => {
  const pct = Math.max(0, Math.min(100, (value / Math.max(max, 1)) * 100));
  return (
    <div style={{
      position: 'relative',
      height,
      background: 'rgba(0,0,0,0.55)',
      border: '1px solid rgba(0,0,0,0.6)',
      borderRadius: 3,
      overflow: 'hidden',
      boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.6)'
    }}>
      <div style={{ width: `${pct}%`, height: '100%', background: fill, transition: 'width 0.25s ease' }} />
      {label && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.66rem', fontWeight: 600, color: '#fff', textShadow: '0 1px 2px #000', letterSpacing: '0.03em'
        }}>{label}</div>
      )}
    </div>
  );
};

const RESOURCE_FILL = {
  mana: UI.manaFill,
  energia: 'linear-gradient(90deg, #6a8a22, #c4e24f)',
  foco: 'linear-gradient(90deg, #1f7a6a, #4fe0c4)',
  fe: 'linear-gradient(90deg, #9c7a2e, #ffe08a)'
};

const PlayerFrame = ({ name, faction, factionMeta, stats, gold, online, resource }) => (
  <div style={{ ...UI.panel, position: 'absolute', top: 16, left: 16, width: 286, padding: 12 }}>
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <div style={{
        width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.5rem', color: factionMeta.color,
        background: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.12), rgba(0,0,0,0.5))',
        border: `2px solid ${factionMeta.color}`,
        boxShadow: `0 0 14px ${factionMeta.color}55`
      }}>{FACTION_EMBLEM[faction] || '✦'}</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ fontFamily: UI.fontTitle, fontWeight: 700, fontSize: '1.05rem', color: UI.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
          <div style={{
            fontFamily: UI.fontTitle, fontWeight: 700, fontSize: '0.7rem', color: '#1a140c',
            background: `linear-gradient(180deg, ${UI.goldBright}, ${UI.goldDim})`,
            padding: '1px 8px', borderRadius: 10, marginLeft: 6
          }}>Nv {stats.level}</div>
        </div>
        <div style={{ color: factionMeta.color, fontSize: '0.74rem', fontFamily: UI.fontBody, marginBottom: 6, marginTop: 1 }}>{factionMeta.label}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Bar value={stats.hp} max={stats.maxHp} fill={UI.hpFill} height={13} label={`${Math.max(0, Math.round(stats.hp))} / ${stats.maxHp}`} />
          {resource && resource.max > 0 && (
            <Bar value={resource.value} max={resource.max} fill={RESOURCE_FILL[resource.type] || UI.manaFill} height={9} label={`${Math.round(resource.value)} / ${resource.max}`} />
          )}
          <Bar value={stats.xp} max={stats.maxXp} fill={UI.xpFill} height={7} />
        </div>
      </div>
    </div>

    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
      <Chip icon="🪙" label={gold} color={UI.goldBright} />
      <Chip icon="👥" label={online} color={UI.ink} />
    </div>
  </div>
);

const Chip = ({ icon, label, color }) => (
  <div style={{
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '5px 0', borderRadius: 5, background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(197,160,89,0.15)', fontFamily: UI.fontBody
  }}>
    <span style={{ fontSize: '0.85rem', opacity: 0.9 }}>{icon}</span>
    <span style={{ color, fontWeight: 700, fontSize: '0.9rem' }}>{label}</span>
  </div>
);

const SectionPanel = ({ title, accent = UI.gold, children, style }) => (
  <div style={{ ...UI.panel, padding: 12, ...style }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <span style={{ ...titleStyle, color: accent }}>{title}</span>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${accent}66, transparent)` }} />
    </div>
    {children}
  </div>
);

const SkillSlot = ({ keybind, icon, name, accent, cooldownPct, cooldownText, cost, dim, locked, lockLabel }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: 64, opacity: locked ? 0.45 : (dim ? 0.5 : 1) }}>
    <div style={{
      position: 'relative', width: 54, height: 54, borderRadius: 7, overflow: 'hidden',
      background: locked ? 'rgba(8,7,5,0.92)' : 'radial-gradient(circle at 40% 30%, rgba(255,255,255,0.08), rgba(8,7,5,0.95))',
      border: `1px solid ${locked ? '#555' : `${accent}aa`}`,
      boxShadow: `0 4px 12px rgba(0,0,0,0.5), inset 0 0 10px ${accent}22`,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <span style={{ fontSize: '1.5rem', filter: 'grayscale(1) drop-shadow(0 1px 2px #000)', opacity: locked ? 0.6 : 1 }}>{locked ? '🔒' : icon}</span>
      <span style={{
        position: 'absolute', top: 2, left: 4, fontSize: '0.6rem', fontWeight: 800,
        color: UI.goldBright, fontFamily: UI.fontBody, textShadow: '0 1px 2px #000'
      }}>{keybind}</span>
      {locked && lockLabel ? (
        <span style={{
          position: 'absolute', bottom: 2, left: 0, right: 0, textAlign: 'center', fontSize: '0.56rem', fontWeight: 800,
          color: '#ffd27a', textShadow: '0 1px 2px #000'
        }}>{lockLabel}</span>
      ) : null}
      {!locked && cost ? (
        <span style={{
          position: 'absolute', bottom: 2, right: 4, fontSize: '0.58rem', fontWeight: 700,
          color: '#9fd0ff', textShadow: '0 1px 2px #000'
        }}>{cost}</span>
      ) : null}
      {cooldownPct > 0 && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ width: '100%', height: `${cooldownPct}%`, background: 'rgba(0,0,0,0.7)' }} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.95rem', textShadow: '0 1px 2px #000' }}>{cooldownText}</div>
        </div>
      )}
    </div>
    <div style={{ fontSize: '0.62rem', color: UI.inkDim, fontFamily: UI.fontBody, textAlign: 'center', lineHeight: 1.1, height: 16, overflow: 'hidden' }}>{name}</div>
  </div>
);

const SKILL_ICON = { damage: '⚔', projectile: '➶', heal: '✚', dash: '💨', drain: '🩸', aoe: '✦', dot: '☠' };

const TargetFrame = ({ target }) => {
  if (!target) return null;
  const accent = target.isMob ? (target.elite ? '#ff9248' : '#d9534f') : (getFactionMeta(target.faction).color);
  return (
    <div style={{ ...UI.panel, padding: '6px 16px', minWidth: 220, textAlign: 'center', borderColor: `${accent}66` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
        <span style={{ fontFamily: UI.fontTitle, fontWeight: 700, color: accent, fontSize: '0.9rem' }}>{target.name}</span>
        {target.level ? <span style={{ color: UI.inkDim, fontSize: '0.72rem' }}>Nv {target.level}</span> : null}
      </div>
      <div style={{ marginTop: 4 }}>
        <Bar value={target.hp} max={target.maxHp} fill={UI.hpFill} height={9} label={`${Math.max(0, Math.round(target.hp))} / ${target.maxHp}`} />
      </div>
    </div>
  );
};

const HUD = () => {
  const myCharacter = useGameStore((state) => state.myCharacter);
  const players = useGameStore((state) => state.players);
  const myId = useGameStore((state) => state.myId);
  const questDefinitions = useGameStore((state) => state.questDefinitions);
  const skillBook = useGameStore((state) => state.skillBook);
  const skillUnlocks = useGameStore((state) => state.skillUnlocks);
  const subclassDefs = useGameStore((state) => state.subclassDefs);
  const controlPoints = useGameStore((state) => state.controlPoints);
  const notifications = useGameStore((state) => state.notifications);
  const basicAttackReadyAt = useGameStore((state) => state.basicAttackReadyAt);
  const dismissNotification = useGameStore((state) => state.dismissNotification);
  const selectedTargetId = useGameStore((state) => state.selectedTargetId);
  const mobs = useGameStore((state) => state.mobs);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!notifications.length) return undefined;
    const latestId = notifications[notifications.length - 1].id;
    const timer = setTimeout(() => dismissNotification(latestId), 3500);
    return () => clearTimeout(timer);
  }, [dismissNotification, notifications]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(timer);
  }, []);

  if (!myCharacter || !players[myId]) return null;

  const localPlayer = players[myId];
  const stats = localPlayer.stats;
  const factionMeta = getFactionMeta(localPlayer.faction);
  const activeQuests = Object.entries(localPlayer.quests || {}).filter(([, quest]) => !quest.completed);
  const zone = getZoneFromPosition(localPlayer.position);
  const controlBonus = getFactionControlBonus(controlPoints, localPlayer.faction);
  const kit = skillBook[localPlayer.charClass] || {};
  const cooldowns = localPlayer.cooldowns || {};
  const resource = localPlayer.resource;
  const onlineCount = Object.keys(players).length;

  const atkRemaining = Math.max(0, basicAttackReadyAt - now);
  const atkPct = atkRemaining > 0 ? (atkRemaining / 500) * 100 : 0;

  const subDef = (subclassDefs[localPlayer.charClass] || {})[localPlayer.subclass] || null;
  const playerLevel = stats.level || 1;
  const skillSlots = [1, 2, 3, 4].map((slot) => {
    const reqLevel = skillUnlocks[slot] || 1;
    // Slots 1-3 from the class kit; slot 4 is the chosen subclass skill.
    const sk = slot === 4 ? (subDef ? subDef.skill4 : null) : kit[slot];
    const needsSubclass = slot === 4 && !subDef;
    const locked = playerLevel < reqLevel || needsSubclass;
    if (!sk && !locked) return null; // no skill defined and not a lock-placeholder
    const remaining = (!locked && sk && sk.cooldown) ? Math.max(0, sk.cooldown - (now - (cooldowns[slot] || 0))) : 0;
    return {
      slot,
      sk,
      locked,
      lockLabel: needsSubclass && playerLevel >= reqLevel ? 'Subclase' : `Nv ${reqLevel}`,
      cdPct: (!locked && sk && sk.cooldown) ? (remaining / sk.cooldown) * 100 : 0,
      cdText: remaining > 0 ? (remaining / 1000).toFixed(1) : '',
      dim: (!locked && sk && resource) ? resource.value < (sk.cost || 0) : false
    };
  }).filter(Boolean);

  const activeBuffs = Object.entries(localPlayer.buffs || {})
    .filter(([, b]) => b.expires > now)
    .map(([name, b]) => ({ name, secs: Math.ceil((b.expires - now) / 1000), def: (b.defMul || 1) < 1 }));

  let target = null;
  if (selectedTargetId) {
    const m = mobs[selectedTargetId];
    if (m) {
      target = { name: m.elite ? `Elite ${m.name}` : m.name, hp: m.hp, maxHp: m.maxHp, level: m.level, isMob: true, elite: m.elite };
    } else {
      const p = players[selectedTargetId];
      if (p) target = { name: p.name, hp: p.stats?.hp, maxHp: p.stats?.maxHp, level: p.stats?.level, isMob: false, faction: p.faction };
    }
  }

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', fontFamily: UI.fontBody, color: UI.ink }}>
      <PlayerFrame
        name={myCharacter.name}
        faction={localPlayer.faction}
        factionMeta={factionMeta}
        stats={stats}
        gold={localPlayer.gold || 0}
        online={onlineCount}
        resource={resource}
      />

      {/* Top-center: zone banner + toasts */}
      <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <div style={{
          ...UI.panel, padding: '6px 22px', borderRadius: 999, textAlign: 'center',
          borderColor: `${zone.color}55`
        }}>
          <div style={{ fontFamily: UI.fontTitle, fontWeight: 700, color: zone.color, letterSpacing: '0.08em', fontSize: '0.95rem' }}>{zone.name}</div>
          <div style={{ color: UI.inkDim, fontSize: '0.72rem' }}>{zone.subtitle}</div>
        </div>

        <TargetFrame target={target} />

        {notifications.map((n) => (
          <div key={n.id} style={{
            ...UI.panel, padding: '8px 16px', minWidth: 240, maxWidth: 440, textAlign: 'center',
            borderColor: `${toneColor[n.tone] || UI.gold}55`
          }}>
            <span style={{ color: toneColor[n.tone] || UI.gold, fontWeight: 600, fontSize: '0.86rem' }}>{n.message}</span>
          </div>
        ))}
      </div>

      {/* Right column (under the minimap): war + quests */}
      <div style={{ position: 'absolute', top: 232, right: 16, width: 250, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <SectionPanel title="Guerra de Facciones">
          <div style={{ fontSize: '0.78rem', color: UI.inkDim, marginBottom: 10 }}>
            Fortalezas: <strong style={{ color: factionMeta.color }}>{controlBonus.owned}/3</strong>
            {' · '}Daño <strong style={{ color: UI.goldBright }}>+{controlBonus.bonusPct}%</strong>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {Object.values(controlPoints).map((point) => {
              const ownerMeta = point.owner ? getFactionMeta(point.owner) : null;
              const barColor = getFactionMeta(point.contestingFaction || point.owner).color;
              return (
                <div key={point.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', marginBottom: 3 }}>
                    <span style={{ color: UI.ink }}>{point.name}</span>
                    <span style={{ color: ownerMeta?.color || UI.inkFaint }}>
                      {ownerMeta ? ownerMeta.shortLabel : point.contestingFaction ? `↑ ${getFactionMeta(point.contestingFaction).shortLabel}` : 'Neutral'}
                    </span>
                  </div>
                  <Bar value={point.progress || 0} max={100} fill={barColor} height={5} />
                </div>
              );
            })}
          </div>
        </SectionPanel>

        <SectionPanel title="Misiones">
          {activeQuests.length ? activeQuests.map(([questId, quest]) => {
            const def = questDefinitions[questId];
            if (!def) return null;
            const objs = Array.isArray(def.objectives) ? def.objectives : [{ type: 'kill', count: def.targetCount || 1, label: def.title }];
            const state = quest.objectives || [{ progress: quest.progress || 0 }];
            const allDone = objs.every((o, i) => ((state[i] && state[i].progress) || 0) >= (o.count || 1));
            let hint = null;
            if (def.turnInNpc) {
              const lm = getLandmarkById(def.turnInNpc.replace(/^story_/, ''));
              if (lm) hint = `${allDone ? 'Entrega en' : 'Destino:'} ${lm.shortName || lm.name}`;
            }
            return (
              <div key={questId} style={{ marginBottom: 9 }}>
                <div style={{ fontFamily: UI.fontTitle, fontWeight: 600, fontSize: '0.82rem', color: def.chain === 'main' ? UI.goldBright : UI.ink, marginBottom: 3 }}>
                  {def.chain === 'main' ? '★ ' : ''}{def.title || getQuestTitle(questDefinitions, questId)}
                </div>
                {objs.map((o, i) => {
                  const p = Math.min((state[i] && state[i].progress) || 0, o.count || 1);
                  const t = o.count || 1;
                  const done = p >= t;
                  return (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: done ? UI.good : UI.inkDim, lineHeight: 1.5 }}>
                      <span>{done ? '✓' : '○'} {o.label || o.type}</span>
                      {(o.type === 'kill' || o.type === 'collect') ? <span style={{ color: UI.inkFaint }}>{p}/{t}</span> : null}
                    </div>
                  );
                })}
                {hint ? <div style={{ fontSize: '0.68rem', color: allDone ? UI.good : UI.inkFaint, marginTop: 2 }}>↳ {hint}</div> : null}
              </div>
            );
          }) : (
            <div style={{ color: UI.inkDim, fontSize: '0.78rem', lineHeight: 1.4 }}>
              Habla con el <strong style={{ color: UI.goldBright }}>Cronista</strong> de tu ciudad inicial (tecla <strong style={{ color: UI.goldBright }}>E</strong>) para empezar la campaña.
            </div>
          )}
        </SectionPanel>
      </div>

      {/* Bottom-center: action bar + controls hint */}
      <div style={{ position: 'absolute', bottom: 18, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        {activeBuffs.length ? (
          <div style={{ display: 'flex', gap: 8 }}>
            {activeBuffs.map((b) => (
              <div key={b.name} style={{
                ...UI.panel, padding: '3px 10px', fontSize: '0.72rem', fontFamily: UI.fontBody,
                color: b.def ? '#9ff0c0' : UI.goldBright, borderColor: `${b.def ? '#9ff0c0' : UI.gold}66`
              }}>
                {b.def ? '🛡 ' : '✦ '}{b.name} · {b.secs}s
              </div>
            ))}
          </div>
        ) : null}
        <div style={{ ...UI.panel, padding: '10px 16px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <SkillSlot
            keybind="LMB"
            icon="⚔"
            name={`Ataque (${stats.dmg})`}
            accent={UI.bad}
            cooldownPct={atkPct}
            cooldownText={atkRemaining > 0 ? (atkRemaining / 1000).toFixed(1) : ''}
          />
          {skillSlots.map(({ slot, sk, cdPct, cdText, dim, locked, lockLabel }) => (
            <SkillSlot
              key={slot}
              keybind={(sk && sk.key) || String(slot)}
              icon={sk ? (SKILL_ICON[sk.type] || '✦') : '✦'}
              name={locked ? (lockLabel === 'Subclase' ? 'Subclase' : 'Bloqueada') : sk.name}
              accent={factionMeta.color}
              cooldownPct={cdPct}
              cooldownText={cdText}
              cost={sk && sk.cost}
              dim={dim}
              locked={locked}
              lockLabel={lockLabel}
            />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 14, fontSize: '0.72rem', color: UI.inkFaint, fontFamily: UI.fontBody }}>
          <span><b style={{ color: UI.inkDim }}>WASD</b> mover</span>
          <span><b style={{ color: UI.inkDim }}>RMB</b> cámara</span>
          <span><b style={{ color: UI.inkDim }}>E</b> interactuar</span>
          <span><b style={{ color: UI.inkDim }}>M</b> mapa</span>
          <span><b style={{ color: UI.inkDim }}>I</b> inventario</span>
          <span><b style={{ color: UI.inkDim }}>C</b> ficha</span>
        </div>
      </div>
    </div>
  );
};

export default HUD;
