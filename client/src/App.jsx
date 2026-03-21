import React, { Suspense, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import World from './components/World'
import CharacterCreation from './components/CharacterCreation'
import Chat from './components/Chat'
import Minimap from './components/ui/Minimap'
import HUD from './components/ui/HUD'
import WorldMap from './components/ui/WorldMap'
import Inventory from './components/ui/Inventory'
import SystemMenu from './components/ui/SystemMenu'
import DialogUI from './components/ui/DialogUI'
import LoginScreen from './components/LoginScreen'
import CharacterSelection from './components/CharacterSelection'
import useGameStore from './stores/useGameStore'

function App() {
  const { connect, isConnected, authStage } = useGameStore()

  useEffect(() => {
    if (!isConnected) {
      connect()
    }
  }, [connect, isConnected])

  if (!isConnected) {
    return (
      <div style={{ 
        position: 'absolute',
        inset: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        color: '#eef5ff',
        zIndex: 10,
        background: 'radial-gradient(circle at top, #20354a 0%, #06080d 72%)'
      }}>
        <div style={{
          padding: '24px 28px',
          borderRadius: '22px',
          background: 'rgba(10,16,24,0.78)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 30px 60px rgba(0,0,0,0.35)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '6px' }}>Aethelgard</div>
          <div style={{ color: '#b8c6d3' }}>Conectando con el reino...</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#111', position: 'relative' }}>
      {authStage === 'login' && <LoginScreen />}
      {authStage === 'char_select' && <CharacterSelection />}
      {authStage === 'create' && <CharacterCreation />}
      
      {authStage === 'game' && (
        <>
          <Canvas shadows camera={{ fov: 75 }}>
            <Suspense fallback={null}>
              <World />
            </Suspense>
          </Canvas>
          <HUD />
          <Chat />
          <Minimap />
          <WorldMap />
          <Inventory />
          <DialogUI />
          <SystemMenu />
        </>
      )}
    </div>
  )
}

export default App
