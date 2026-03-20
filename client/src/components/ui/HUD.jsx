import React, { useEffect, useState } from 'react';
import useGameStore from '../../stores/useGameStore';
import { getFactionControlBonus, getFactionMeta, getQuestTitle, getZoneFromPosition } from '../../lib/gameData';

const tones = {
  info: '#74d7ff',
  success: '#6df58b',
  warning: '#ffd36b',
  danger: '#ff7b7b'
};

const HUD = () => {
  const myCharacter = useGameStore((state) => state.myCharacter);
  const players = useGameStore((state) => state.players);
  const myId = useGameStore((state) => state.myId);
  const questDefinitions = useGameStore((state) => state.questDefinitions);
  const skillBook = useGameStore((state) => state.skillBook);
  const controlPoints = useGameStore((state) => state.controlPoints);
  const notifications = useGameStore((state) => state.notifications);
  const lastCombatAction = useGameStore((state) => state.lastCombatAction);
  const basicAttackReadyAt = useGameStore((state) => state.basicAttackReadyAt);
  const dismissNotification = useGameStore((state) => state.dismissNotification);
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
  const classSkill = skillBook[localPlayer.charClass];
  const cooldowns = localPlayer.cooldowns || {};
  const onlineCount = Object.keys(players).length;
  const ownedStrongholds = Object.values(controlPoints).filter((point) => point.owner === localPlayer.faction);
  const combatPulseVisible = lastCombatAction && (now - lastCombatAction.id < (lastCombatAction.duration || 450));

  const getCooldownOverlay = (slot, cooldownTime) => {
    if (!cooldownTime) return null;

    const lastUsed = cooldowns[slot] || 0;
    const remaining = Math.max(0, cooldownTime - (now - lastUsed));
    if (remaining <= 0) return null;

    return (
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,0.82), rgba(0,0,0,0.18))',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        color: '#fff',
        fontWeight: 700,
        fontSize: '0.9rem'
      }}>
        {(remaining / 1000).toFixed(1)}
      </div>
    );
  };

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      fontFamily: '"Segoe UI", sans-serif',
      color: '#f6f1e7'
    }}>
      <div style={{
        position: 'absolute',
        top: 18,
        left: 18,
        width: 320,
        padding: 18,
        borderRadius: 18,
        background: 'linear-gradient(180deg, rgba(10,16,18,0.92), rgba(8,12,17,0.72))',
        border: `1px solid ${factionMeta.color}55`,
        boxShadow: '0 18px 40px rgba(0,0,0,0.35)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{myCharacter.name}</div>
            <div style={{ color: factionMeta.color, fontSize: '0.92rem' }}>{factionMeta.label}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.8rem', color: '#c5d0db' }}>Nivel</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800 }}>{stats.level}</div>
          </div>
        </div>

        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 4 }}>
            <span>Vitalidad</span>
            <span>{Math.max(0, stats.hp)} / {stats.maxHp}</span>
          </div>
          <div style={{ height: 14, background: '#241919', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{
              width: `${(stats.hp / stats.maxHp) * 100}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #8f2929, #ff6b6b)'
            }} />
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 4 }}>
            <span>Experiencia</span>
            <span>{stats.xp} / {stats.maxXp}</span>
          </div>
          <div style={{ height: 10, background: '#192233', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{
              width: `${(stats.xp / Math.max(stats.maxXp, 1)) * 100}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #4b70ff, #79d6ff)'
            }} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: '0.86rem' }}>
          <div style={{ padding: 10, borderRadius: 12, background: 'rgba(255,255,255,0.04)' }}>
            <div style={{ color: '#9fb0bf', marginBottom: 4 }}>Oro</div>
            <div style={{ color: '#ffd66b', fontWeight: 800 }}>{localPlayer.gold || 0}</div>
          </div>
          <div style={{ padding: 10, borderRadius: 12, background: 'rgba(255,255,255,0.04)' }}>
            <div style={{ color: '#9fb0bf', marginBottom: 4 }}>Jugadores</div>
            <div style={{ fontWeight: 800 }}>{onlineCount}</div>
          </div>
        </div>
      </div>

      <div style={{
        position: 'absolute',
        top: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10
      }}>
        <div style={{
          minWidth: 320,
          padding: '10px 16px',
          borderRadius: 999,
          background: 'rgba(12,17,24,0.82)',
          border: `1px solid ${zone.color}66`,
          textAlign: 'center',
          boxShadow: '0 12px 30px rgba(0,0,0,0.28)'
        }}>
          <div style={{ color: zone.color, fontWeight: 800, letterSpacing: '0.04em' }}>{zone.name}</div>
          <div style={{ color: '#d3dde7', fontSize: '0.82rem' }}>{zone.subtitle}</div>
        </div>

        {notifications.map((notification) => (
          <div
            key={notification.id}
            style={{
              minWidth: 280,
              maxWidth: 460,
              padding: '11px 14px',
              borderRadius: 14,
              background: 'rgba(10,15,20,0.9)',
              border: `1px solid ${(tones[notification.tone] || tones.info)}66`,
              color: '#f8fbff',
              boxShadow: '0 12px 30px rgba(0,0,0,0.28)'
            }}
          >
            <div style={{ color: tones[notification.tone] || tones.info, fontSize: '0.76rem', fontWeight: 800, marginBottom: 3 }}>
              ACTUALIZACION
            </div>
            <div style={{ fontSize: '0.92rem' }}>{notification.message}</div>
          </div>
        ))}
      </div>

      <div style={{
        position: 'absolute',
        top: 18,
        right: 240,
        width: 320,
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }}>
        <div style={{
          padding: 16,
          borderRadius: 16,
          background: 'rgba(11,16,21,0.84)',
          border: '1px solid rgba(255,255,255,0.08)'
        }}>
          <div style={{ color: '#f1e7cf', fontWeight: 800, marginBottom: 10 }}>Dominio de Guerra</div>
          <div style={{ fontSize: '0.88rem', color: '#b8c6d3', marginBottom: 10 }}>
            Fortalezas bajo tu faccion: <strong style={{ color: factionMeta.color }}>{controlBonus.owned}</strong>
            {' '}| Bonus de dano: <strong style={{ color: '#ffd66b' }}>+{controlBonus.bonusPct}%</strong>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.values(controlPoints).map((point) => {
              const ownerMeta = point.owner ? getFactionMeta(point.owner) : null;
              return (
                <div key={point.id} style={{ padding: 10, borderRadius: 12, background: 'rgba(255,255,255,0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontWeight: 700 }}>{point.name}</span>
                    <span style={{ color: ownerMeta?.color || '#d2d8df' }}>
                      {ownerMeta ? ownerMeta.shortLabel : point.contestingFaction ? `Captura ${getFactionMeta(point.contestingFaction).shortLabel}` : 'Neutral'}
                    </span>
                  </div>
                  <div style={{ height: 8, background: '#1b2530', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{
                      width: `${point.progress || 0}%`,
                      height: '100%',
                      background: getFactionMeta(point.contestingFaction || point.owner).color
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{
          padding: 16,
          borderRadius: 16,
          background: 'rgba(11,16,21,0.84)',
          border: '1px solid rgba(255,255,255,0.08)'
        }}>
          <div style={{ color: '#f1e7cf', fontWeight: 800, marginBottom: 10 }}>Misiones Activas</div>
          {activeQuests.length ? activeQuests.map(([questId, quest]) => {
            const definition = questDefinitions[questId];
            const targetCount = definition?.targetCount || 1;
            return (
              <div key={questId} style={{ marginBottom: 10, padding: 10, borderRadius: 12, background: 'rgba(255,255,255,0.04)' }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{getQuestTitle(questDefinitions, questId)}</div>
                <div style={{ fontSize: '0.82rem', color: '#b8c6d3', marginBottom: 8 }}>
                  {definition?.description || 'Completa el objetivo asignado.'}
                </div>
                <div style={{ height: 8, background: '#1b2530', borderRadius: 999, overflow: 'hidden', marginBottom: 6 }}>
                  <div style={{
                    width: `${(quest.progress / targetCount) * 100}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #5ad07a, #c3f27d)'
                  }} />
                </div>
                <div style={{ fontSize: '0.8rem', color: '#d9e2ea' }}>
                  Progreso: {quest.progress} / {targetCount}
                </div>
              </div>
            );
          }) : (
            <div style={{ color: '#b8c6d3', fontSize: '0.88rem' }}>
              Habla con un NPC de tu faccion para recibir tu primera mision.
            </div>
          )}
        </div>
      </div>

      <div style={{
        position: 'absolute',
        bottom: 26,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'flex-end',
        gap: 12,
        padding: '14px 20px',
        borderRadius: 18,
        background: 'linear-gradient(180deg, rgba(0,0,0,0.12), rgba(7,10,15,0.85))',
        boxShadow: '0 18px 40px rgba(0,0,0,0.32)'
      }}>
        <SkillSlot
          slot="LMB"
          title="Ataque basico"
          subtitle={`Dano ${stats.dmg}`}
          accent="#f18d7e"
          overlay={basicAttackReadyAt > now ? (
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.82), rgba(0,0,0,0.18))',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.9rem'
            }}>
              {((basicAttackReadyAt - now) / 1000).toFixed(1)}
            </div>
          ) : null}
        />
        <SkillSlot
          slot="Q"
          title={classSkill?.name || 'Habilidad de clase'}
          subtitle={classSkill?.type ? `Tipo ${classSkill.type}` : 'Lista'}
          accent={factionMeta.color}
          overlay={getCooldownOverlay(2, classSkill?.cooldown)}
        />
        <div style={{ width: 1, height: 62, background: 'rgba(255,255,255,0.12)' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.82rem', color: '#d7e0e8' }}>
          <div><strong>Movimiento:</strong> WASD</div>
          <div><strong>Interactuar:</strong> E</div>
          <div><strong>Mapa:</strong> M</div>
          <div><strong>Inventario:</strong> I</div>
        </div>
      </div>

      {combatPulseVisible && (
        <div style={{
          position: 'absolute',
          left: '50%',
          bottom: 128,
          transform: 'translateX(-50%)',
          padding: '10px 16px',
          borderRadius: 999,
          background: 'rgba(255, 107, 107, 0.92)',
          color: '#fff',
          fontWeight: 800,
          letterSpacing: '0.06em',
          boxShadow: '0 16px 28px rgba(0,0,0,0.3)'
        }}>
          ATAQUE
        </div>
      )}

      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 18,
        height: 18,
        opacity: 0.85
      }}>
        <div style={{ position: 'absolute', top: 8, left: 0, width: 18, height: 2, background: '#ffffff' }} />
        <div style={{ position: 'absolute', top: 0, left: 8, width: 2, height: 18, background: '#ffffff' }} />
      </div>

      <div style={{
        position: 'absolute',
        bottom: 18,
        right: 18,
        padding: '10px 12px',
        borderRadius: 12,
        background: 'rgba(12,17,24,0.82)',
        color: '#cfdae4',
        fontSize: '0.8rem',
        textAlign: 'right'
      }}>
        {ownedStrongholds.length
          ? `Tu faccion domina ${ownedStrongholds.map((point) => point.name).join(', ')}.`
          : 'Ninguna fortaleza esta bajo tu control.'}
      </div>
    </div>
  );
};

const SkillSlot = ({ slot, title, subtitle, accent, overlay }) => (
  <div style={{
    width: 88,
    height: 88,
    borderRadius: 20,
    padding: 10,
    position: 'relative',
    overflow: 'hidden',
    background: 'rgba(13,19,26,0.92)',
    border: `1px solid ${accent}66`,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between'
  }}>
    <div style={{ fontSize: '0.78rem', color: '#aab8c4', fontWeight: 800 }}>{slot}</div>
    <div>
      <div style={{ color: '#f5f7fb', fontWeight: 800, fontSize: '0.9rem', lineHeight: 1.1 }}>{title}</div>
      <div style={{ color: '#c0ccd6', fontSize: '0.75rem', marginTop: 4 }}>{subtitle}</div>
    </div>
    <div style={{
      position: 'absolute',
      inset: 'auto 10px 10px 10px',
      height: 2,
      background: accent,
      boxShadow: `0 0 12px ${accent}`
    }} />
    {overlay}
  </div>
);

export default HUD;
