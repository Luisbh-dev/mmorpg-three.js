import React, { useState } from 'react';
import useGameStore from '../../stores/useGameStore';
import { UI, RARITY, SELL_VALUE_BY_RARITY } from '../../lib/uiTheme';

const SLOT_LABEL = { weapon: 'Arma', head: 'Cabeza', chest: 'Pecho', legs: 'Piernas', trinket: 'Abalorio' };

function statLine(stats) {
  if (!stats) return '';
  const parts = [];
  if (stats.bonusDmg) parts.push(`+${stats.bonusDmg} Daño`);
  if (stats.bonusHp) parts.push(`+${stats.bonusHp} Vida`);
  if (stats.bonusArmor) parts.push(`+${stats.bonusArmor} Armadura`);
  if (stats.bonusRange) parts.push(`+${stats.bonusRange} Alcance`);
  if (stats.lifesteal) parts.push(`+${Math.round(stats.lifesteal * 100)}% Robo`);
  return parts.join('  ');
}

const Row = ({ children, accent }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
    borderRadius: 6, background: 'rgba(0,0,0,0.28)', border: `1px solid ${accent}33`
  }}>{children}</div>
);

const ShopUI = () => {
  const isShopOpen = useGameStore((s) => s.isShopOpen);
  const activeShop = useGameStore((s) => s.activeShop);
  const myCharacter = useGameStore((s) => s.myCharacter);
  const players = useGameStore((s) => s.players);
  const myId = useGameStore((s) => s.myId);
  const closeShop = useGameStore((s) => s.closeShop);
  const buyItem = useGameStore((s) => s.buyItem);
  const sellItem = useGameStore((s) => s.sellItem);
  const [tab, setTab] = useState('buy');

  if (!isShopOpen || !activeShop) return null;

  const live = (myId && players[myId]) || myCharacter || {};
  const gold = live.gold || 0;
  const inventory = live.inventory || [];

  const TabButton = ({ id, label }) => (
    <button onClick={() => setTab(id)} style={{
      padding: '8px 18px', borderRadius: 6, cursor: 'pointer', fontFamily: UI.fontTitle, fontWeight: 700,
      border: `1px solid ${UI.gold}`,
      background: tab === id ? `linear-gradient(180deg, ${UI.goldBright}, ${UI.goldDim})` : 'rgba(0,0,0,0.3)',
      color: tab === id ? '#1a140c' : UI.goldBright
    }}>{label}</button>
  );

  return (
    <div data-ui-root="true" style={{
      position: 'absolute', inset: 0, background: 'rgba(4,6,9,0.6)',
      display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 60,
      pointerEvents: 'auto', fontFamily: UI.fontBody
    }}>
      <div style={{ width: 560, maxWidth: '94vw', maxHeight: '86vh', padding: 22, ...UI.panel, borderRadius: 10, color: UI.ink, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ fontFamily: UI.fontTitle, fontWeight: 700, fontSize: '1.2rem', color: UI.goldBright, letterSpacing: '0.05em' }}>{activeShop.merchantName || 'Mercader'}</div>
            <div style={{ color: UI.inkDim, fontSize: '0.82rem' }}>Oro: <strong style={{ color: UI.goldBright }}>{gold}</strong></div>
          </div>
          <button onClick={closeShop} style={{ border: `1px solid ${UI.gold}`, background: 'rgba(0,0,0,0.3)', color: UI.goldBright, borderRadius: 6, width: 36, height: 36, cursor: 'pointer', fontWeight: 700 }}>✕</button>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <TabButton id="buy" label="Comprar" />
          <TabButton id="sell" label="Vender" />
        </div>

        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 7, paddingRight: 4 }}>
          {tab === 'buy' && (activeShop.items || []).map((it) => {
            const color = RARITY[it.rarity] || UI.inkDim;
            const canAfford = gold >= (it.price || 0);
            return (
              <Row key={it.itemCode} accent={color}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: it.color || color, boxShadow: `0 0 8px ${color}` }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color, fontWeight: 700, fontSize: '0.88rem' }}>{it.name} {it.slot ? <span style={{ color: UI.inkFaint, fontWeight: 400 }}>· {SLOT_LABEL[it.slot]}</span> : null}</div>
                  <div style={{ color: UI.inkDim, fontSize: '0.72rem' }}>{statLine(it.stats) || (it.itemType === 'consumable' ? 'Consumible' : '')}</div>
                </div>
                <div style={{ color: UI.goldBright, fontWeight: 700, fontSize: '0.85rem', minWidth: 54, textAlign: 'right' }}>{it.price} 🪙</div>
                <button
                  disabled={!canAfford}
                  onClick={() => buyItem(it.itemCode, 1)}
                  style={{ padding: '6px 12px', borderRadius: 5, cursor: canAfford ? 'pointer' : 'not-allowed', opacity: canAfford ? 1 : 0.45, border: `1px solid ${UI.gold}`, background: 'rgba(0,0,0,0.3)', color: UI.goldBright, fontWeight: 700 }}
                >Comprar</button>
              </Row>
            );
          })}

          {tab === 'sell' && inventory.map((it, index) => {
            if (!it || it.itemType === 'currency' || it.itemType === 'quest') return null;
            const color = RARITY[it.rarity] || UI.inkDim;
            const value = it.itemType === 'equipment' ? (SELL_VALUE_BY_RARITY[it.rarity] || 8) : 8;
            return (
              <Row key={it.id || index} accent={color}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: it.color || color, boxShadow: `0 0 8px ${color}` }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color, fontWeight: 700, fontSize: '0.88rem' }}>{it.name}</div>
                  <div style={{ color: UI.inkDim, fontSize: '0.72rem' }}>{statLine(it.stats)}</div>
                </div>
                <div style={{ color: UI.goldBright, fontWeight: 700, fontSize: '0.85rem', minWidth: 54, textAlign: 'right' }}>{value} 🪙</div>
                <button onClick={() => sellItem(index)} style={{ padding: '6px 12px', borderRadius: 5, cursor: 'pointer', border: `1px solid ${UI.gold}`, background: 'rgba(0,0,0,0.3)', color: UI.goldBright, fontWeight: 700 }}>Vender</button>
              </Row>
            );
          })}
          {tab === 'sell' && inventory.filter((it) => it && it.itemType !== 'currency' && it.itemType !== 'quest').length === 0 && (
            <div style={{ color: UI.inkDim, fontSize: '0.85rem', padding: 10 }}>No tienes nada que vender.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShopUI;
