import React from 'react';
import useGameStore from '../../stores/useGameStore';
import { UI, titleStyle, FACTION_EMBLEM } from '../../lib/uiTheme';
import { getFactionMeta } from '../../lib/gameData';

const ATTR_META = {
  str: { label: 'Fuerza', desc: '+daño', color: '#e0915a' },
  vit: { label: 'Vitalidad', desc: '+vida máxima', color: '#7bd88f' },
  dex: { label: 'Destreza', desc: '+prob. crítico', color: '#5aa9ff' },
  spi: { label: 'Espíritu', desc: '+regen. recurso', color: '#b388ff' }
};
const ATTR_ORDER = ['str', 'vit', 'dex', 'spi'];

function StatRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', padding: '3px 0', borderBottom: '1px solid rgba(197,160,89,0.10)' }}>
      <span style={{ color: UI.inkDim }}>{label}</span>
      <span style={{ color: UI.ink, fontWeight: 700 }}>{value}</span>
    </div>
  );
}

const CharacterSheet = () => {
  const isCharSheetOpen = useGameStore((s) => s.isCharSheetOpen);
  const myId = useGameStore((s) => s.myId);
  const players = useGameStore((s) => s.players);
  const subclassDefs = useGameStore((s) => s.subclassDefs);
  const attrPerPoint = useGameStore((s) => s.attrPerPoint);
  const levelCap = useGameStore((s) => s.levelCap);
  const toggleCharSheet = useGameStore((s) => s.toggleCharSheet);
  const spendAttribute = useGameStore((s) => s.spendAttribute);
  const respecAttributes = useGameStore((s) => s.respecAttributes);

  if (!isCharSheetOpen) return null;
  const me = players[myId];
  if (!me) return null;

  const stats = me.stats || {};
  const attributes = me.attributes || { str: 0, vit: 0, dex: 0, spi: 0 };
  const unspent = me.unspentPoints || 0;
  const factionMeta = getFactionMeta(me.faction);
  const subDef = (subclassDefs[me.charClass] || {})[me.subclass] || null;
  const atCap = (stats.level || 1) >= (levelCap || 30);

  const xpPct = (stats.maxXp && stats.maxXp !== Infinity && isFinite(stats.maxXp))
    ? Math.max(0, Math.min(100, (stats.xp / stats.maxXp) * 100))
    : 100;

  return (
    <div data-ui-root="true" style={{
      position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
      width: 460, maxWidth: '94vw', ...UI.panel, borderRadius: 10, padding: 20,
      fontFamily: UI.fontBody, color: UI.ink, zIndex: 75, pointerEvents: 'auto'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: '1.4rem', color: factionMeta.color }}>{FACTION_EMBLEM[me.faction] || '✦'}</span>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, ...titleStyle, fontSize: '1.05rem' }}>{me.name}</h2>
          <div style={{ fontSize: '0.78rem', color: UI.inkDim }}>
            {me.charClass}{subDef ? ` · ${subDef.name}` : ''} · Nivel {stats.level}{atCap ? ' (máx)' : ''}
          </div>
        </div>
        <button onClick={toggleCharSheet} style={{
          background: 'rgba(0,0,0,0.35)', border: `1px solid ${UI.gold}`, color: UI.goldBright,
          borderRadius: 5, cursor: 'pointer', width: 28, height: 28, fontWeight: 700
        }}>✕</button>
      </div>

      {/* XP */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: UI.inkFaint, marginBottom: 3 }}>
          <span>Experiencia</span>
          <span>{atCap ? 'Nivel máximo' : `${Math.round(stats.xp || 0)} / ${stats.maxXp}`}</span>
        </div>
        <div style={{ height: 8, background: 'rgba(0,0,0,0.5)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ width: `${xpPct}%`, height: '100%', background: UI.xpFill }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        {/* Derived stats */}
        <div style={{ flex: 1 }}>
          <div style={{ ...titleStyle, fontSize: '0.72rem', marginBottom: 6 }}>Estadísticas</div>
          <StatRow label="Vida" value={`${Math.round(stats.hp || 0)} / ${stats.maxHp || 0}`} />
          <StatRow label="Daño" value={stats.dmg || 0} />
          <StatRow label="Armadura" value={stats.armor || 0} />
          <StatRow label="Crítico" value={`${Math.round((stats.critChance || 0) * 100)}%`} />
          <StatRow label="Alcance" value={(stats.range || 0).toFixed ? (stats.range).toFixed(1) : stats.range} />
          {stats.lifesteal ? <StatRow label="Robo de vida" value={`${Math.round(stats.lifesteal * 100)}%`} /> : null}
          {me.resource ? <StatRow label={`Recurso (${me.resource.type})`} value={`${Math.round(me.resource.value)} / ${me.resource.max} (+${(me.resource.regen || 0).toFixed(1)}/s)`} /> : null}
        </div>

        {/* Attributes */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
            <span style={{ ...titleStyle, fontSize: '0.72rem' }}>Atributos</span>
            <span style={{ fontSize: '0.72rem', color: unspent > 0 ? UI.goldBright : UI.inkFaint, fontWeight: 700 }}>
              {unspent} pts
            </span>
          </div>
          {ATTR_ORDER.map((key) => {
            const m = ATTR_META[key];
            return (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0' }}>
                <span style={{ flex: 1, fontSize: '0.8rem', color: m.color }} title={m.desc}>{m.label}</span>
                <span style={{ fontWeight: 800, color: UI.ink, minWidth: 22, textAlign: 'right' }}>{attributes[key] || 0}</span>
                <button
                  disabled={unspent <= 0}
                  onClick={() => spendAttribute(key)}
                  style={{
                    width: 22, height: 22, borderRadius: 4, fontWeight: 800, lineHeight: 1,
                    border: `1px solid ${unspent > 0 ? UI.gold : '#444'}`,
                    background: unspent > 0 ? `linear-gradient(180deg, ${UI.goldBright}, ${UI.goldDim})` : 'rgba(0,0,0,0.3)',
                    color: unspent > 0 ? '#1a140c' : '#666', cursor: unspent > 0 ? 'pointer' : 'default'
                  }}
                >+</button>
              </div>
            );
          })}
          <button
            onClick={respecAttributes}
            style={{
              marginTop: 8, width: '100%', padding: '5px 0', fontSize: '0.72rem',
              background: 'rgba(0,0,0,0.35)', border: `1px solid ${UI.goldDim}`, color: UI.inkDim,
              borderRadius: 5, cursor: 'pointer', fontFamily: UI.fontBody
            }}
            title="Reentrenar atributos junto a un Maestro de Armas (200 de oro)"
          >Reentrenar (200 oro)</button>
        </div>
      </div>

      {/* Subclass */}
      <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(197,160,89,0.18)' }}>
        <div style={{ ...titleStyle, fontSize: '0.72rem', marginBottom: 6 }}>Especialización</div>
        {subDef ? (
          <div>
            <div style={{ color: factionMeta.color, fontWeight: 700, fontSize: '0.9rem' }}>{subDef.name} <span style={{ color: UI.inkFaint, fontWeight: 400, fontSize: '0.74rem' }}>· {subDef.role}</span></div>
            {subDef.desc ? <div style={{ color: UI.inkDim, fontSize: '0.78rem', margin: '3px 0 6px' }}>{subDef.desc}</div> : null}
            {subDef.skill4 ? <div style={{ fontSize: '0.78rem' }}><b style={{ color: UI.goldBright }}>Habilidad (4):</b> {subDef.skill4.name}</div> : null}
            {subDef.passiveText ? <div style={{ fontSize: '0.78rem' }}><b style={{ color: UI.goldBright }}>Pasiva:</b> {subDef.passiveText}</div> : null}
          </div>
        ) : (
          <div style={{ color: UI.inkFaint, fontSize: '0.8rem' }}>
            Sin especializar. Completa la campaña principal y alcanza el nivel 10, luego habla con el Maestro de Armas en tu ciudad inicial.
          </div>
        )}
      </div>
    </div>
  );
};

export default CharacterSheet;
