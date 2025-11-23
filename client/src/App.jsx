import React, { useEffect } from 'react'
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
    connect()
  }, [])

  if (!isConnected) {
    return (
      <div style={{ 
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        color: 'white', zIndex: 10, background: '#000'
      }}>
        Connecting to server...
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
            <World />
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
