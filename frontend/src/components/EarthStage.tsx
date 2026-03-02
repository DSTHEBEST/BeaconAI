import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { Suspense } from 'react'
import * as THREE from 'three'

function EarthSphere() {
  const geometry = new THREE.SphereGeometry(1.4, 64, 64)

  return (
    <group>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color="#1a1a1a"
          emissive="#ffffff"
          emissiveIntensity={0.4}
          metalness={0.9}
          roughness={0.2}
        />
      </mesh>
      <mesh geometry={geometry} scale={1.03}>
        <meshStandardMaterial
          color="#000000"
          emissive="#ffffff"
          emissiveIntensity={1.0}
          transparent
          opacity={0.12}
          wireframe
        />
      </mesh>
    </group>
  )
}

const EarthStage = () => {
  return (
    <Canvas
      camera={{ position: [0, 0, 4.5], fov: 40 }}
      gl={{ antialias: true, alpha: true }}
    >
      <color attach="background" args={['#000000']} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.9} />
      <directionalLight position={[-5, -3, -2]} intensity={0.4} />
      <Suspense fallback={null}>
        <group rotation={[0.35, 0.4, 0]}>
          <EarthSphere />
        </group>
        <Stars
          radius={30}
          depth={40}
          count={4000}
          factor={3}
          saturation={0}
          fade
          speed={0.4}
        />
      </Suspense>
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        autoRotate
        autoRotateSpeed={0.3}
      />
    </Canvas>
  )
}

export default EarthStage

