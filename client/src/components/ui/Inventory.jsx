import React, { useEffect } from 'react';
import useGameStore from '../../stores/useGameStore';
import { UI, RARITY } from '../../lib/uiTheme';

const SLOTS = [
  { key: 'weapon', label: 'Arma', icon: '⚔' },
  { key: 'head', label: 'Cabeza', icon: '🪖' },
  { key: 'chest', label: 'Pecho', icon: '🛡' },
  { key: 'legs', label: 'Piernas', icon: '👖' },
  { key: 'trinket', label: 'Abalorio', icon: '💍' }
];

function statLine(stats) {
  if (!stats) return '';
  const p = [];
  if (stats.bonusDmg) p.push(`+${stats.bonusDmg} Daño`);
  if (stats.bonusHp) p.push(`+${stats.bonusHp} Vida`);
  if (stats.bonusArmor) p.push(`+${stats.bonusArmor} Armadura`);
  if (stats.bonusRange) p.push(`+${stats.bonusRange} Alcance`);
  if (stats.lifesteal) p.push(`+${Math.round(stats.lifesteal * 100)}% Robo de vida`);
  return p.join('\n');
}

const Inventory = () => {
  const isInventoryOpen = useGameStore((state) => state.isInventoryOpen);
  const toggleInventory = useGameStore((state) => state.toggleInventory);
  const players = useGameStore((state) => state.players);
  const myId = useGameStore((state) => state.myId);
  const myCharacter = useGameStore((state) => state.myCharacter);
  const useItem = useGameStore((state) => state.useItem);
  const equipItem = useGameStore((state) => state.equipItem);
  const unequipItem = useGameStore((state) => state.unequipItem);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      if (event.code === 'KeyI') toggleInventory();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleInventory]);

  if (!isInventoryOpen) return null;

  const live = (myId && players[myId]) || myCharacter || {};
  const items = live.inventory || [];
  const equipped = live.equipped || {};
  const stats = live.stats || {};

  const onItemDouble = (item, index) => {
    if (!item) return;
    if (item.itemType === 'equipment') equipItem(index);
    else useItem(index);
  };

  return (
    <div data-ui-root="true" style={{
      position: 'absolute', inset: 0, background: 'rgba(4,6,9,0.6)',
      display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 60,
      pointerEvents: 'auto', fontFamily: UI.fontBody
    }}>
      <div style={{ width: 640, maxWidth: '94vw', padding: 22, ...UI.panel, borderRadius: 10, color: UI.ink }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: UI.fontTitle, fontWeight: 700, fontSize: '1.2rem', color: UI.goldBright, letterSpacing: '0.05em' }}>Morral y Equipo</div>
            <div style={{ color: UI.inkDim, fontSize: '0.82rem' }}>Doble clic para equipar / usar · doble clic en un slot para quitar</div>
          </div>
          <button onClick={toggleInventory} style={{ border: `1px solid ${UI.gold}`, background: 'rgba(0,0,0,0.3)', color: UI.goldBright, borderRadius: 6, width: 36, height: 36, cursor: 'pointer', fontWeight: 700 }}>✕</button>
        </div>

        <div style={{ display: 'flex', gap: 16 }}>
          {/* Equipment slots + attributes */}
          <div style={{ width: 190, flexShrink: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {SLOTS.map((s) => {
                const it = equipped[s.key];
                const color = it ? (RARITY[it.rarity] || UI.gold) : 'rgba(197,160,89,0.2)';
                return (
                  <div key={s.key}
                    onDoubleClick={() => it && unequipItem(s.key)}
                    title={it ? `${it.name}\n${statLine(it.stats)}` : ''}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '7px 9px', borderRadius: 6,
                      border: `1px solid ${color}`, background: it ? 'rgba(20,16,11,0.85)' : 'rgba(0,0,0,0.22)',
                      cursor: it ? 'pointer' : 'default', boxShadow: it ? `inset 0 0 12px ${color}30` : 'none'
                    }}>
                    <span style={{ fontSize: '1.05rem', width: 18, textAlign: 'center' }}>{s.icon}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.62rem', color: UI.inkFaint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
                      <div style={{ fontSize: '0.78rem', color: it ? color : UI.inkFaint, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 130 }}>{it ? it.name : 'Vacío'}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 14, padding: 10, borderRadius: 6, background: 'rgba(0,0,0,0.28)', border: '1px solid rgba(197,160,89,0.15)' }}>
              <div style={{ ...{ fontFamily: UI.fontTitle }, color: UI.goldBright, fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Atributos</div>
              <Attr label="Daño" value={stats.dmg} />
              <Attr label="Vida máx." value={stats.maxHp} />
              <Attr label="Armadura" value={stats.armor || 0} />
              <Attr label="Alcance" value={stats.range} />
              {stats.lifesteal ? <Attr label="Robo de vida" value={`${Math.round(stats.lifesteal * 100)}%`} /> : null}
            </div>
          </div>

          {/* Bag grid */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 9, padding: 12, borderRadius: 8, background: 'rgba(0,0,0,0.28)', border: '1px solid rgba(197,160,89,0.12)' }}>
              {Array.from({ length: 20 }).map((_, index) => {
                const item = items[index];
                const isGold = item?.itemType === 'currency';
                const rarityColor = item ? (RARITY[item.rarity] || 'rgba(197,160,89,0.45)') : 'rgba(197,160,89,0.10)';
                return (
                  <div key={index}
                    onDoubleClick={() => onItemDouble(item, index)}
                    title={item ? `${item.name}${item.stats ? '\n' + statLine(item.stats) : ''}` : ''}
                    style={{
                      aspectRatio: '1 / 1', borderRadius: 7, border: `1px solid ${rarityColor}`,
                      background: item ? 'rgba(20,16,11,0.85)' : 'rgba(0,0,0,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
                      cursor: item ? 'pointer' : 'default', boxShadow: item ? `inset 0 0 14px ${rarityColor}33` : 'none'
                    }}>
                    {item && (
                      <>
                        <div style={{ width: 28, height: 28, borderRadius: isGold ? '50%' : 6, background: item.color || rarityColor, boxShadow: `0 0 12px ${item.color || rarityColor}66` }} />
                        <div style={{ position: 'absolute', left: 3, right: 3, bottom: 3, textAlign: 'center', fontSize: '0.58rem', color: UI.ink, textShadow: '0 1px 2px #000', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, color: UI.inkDim, fontSize: '0.85rem' }}>
              <span>Objetos: {items.length} / 20</span>
              <span>Oro: <strong style={{ color: UI.goldBright }}>{live.gold || 0}</strong></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Attr = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', padding: '1px 0' }}>
    <span style={{ color: UI.inkDim }}>{label}</span>
    <span style={{ color: UI.ink, fontWeight: 700 }}>{value}</span>
  </div>
);

export default Inventory;
