import { Component, Suspense, useRef, useState, useEffect, type ReactNode, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Html, OrbitControls, RoundedBox } from '@react-three/drei';
import { Group, OrthographicCamera } from 'three';
import type { Agent } from './types';
type SceneProps = { resetCount: number; agents: Agent[]; selected: string; currentAgent?: string | null; onSelect: (id: string) => void };
type LabelPortal = RefObject<HTMLDivElement>;

function Box({ position, size, color, ...props }: { position: [number, number, number]; size: [number, number, number]; color: string; rotation?: [number, number, number] }) {
  return <mesh position={position} castShadow receiveShadow {...props}><boxGeometry args={size}/><meshStandardMaterial color={color} roughness={0.75}/></mesh>;
}
function Plant({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return <group position={position} scale={scale}>
    <mesh position={[0, .22, 0]} castShadow><cylinderGeometry args={[.24, .18, .44, 16]}/><meshStandardMaterial color="#d8b798"/></mesh>
    <mesh position={[0, .72, 0]}><cylinderGeometry args={[.035, .04, .8, 8]}/><meshStandardMaterial color="#677451"/></mesh>
    {[0, 1, 2, 3, 4].map(i => <mesh key={i} position={[Math.sin(i * 2.4) * .15, .7 + i * .12, Math.cos(i * 2.4) * .15]} rotation={[.3, i * 2.4, .65]} castShadow><sphereGeometry args={[.23, 10, 8]}/><meshStandardMaterial color={i % 2 ? '#6b895b' : '#8ea573'}/></mesh>)}
  </group>;
}
function Character({ agent, active, selected, onSelect, labelPortal }: { labelPortal: LabelPortal; agent: Agent; active: boolean; selected: boolean; onSelect: () => void }) {
  const body = useRef<Group>(null);
  const [motionAllowed] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [hovered, setHovered] = useState(false);
  useFrame(({ clock }) => { if (body.current) body.current.position.y = active && motionAllowed ? Math.sin(clock.elapsedTime * 3) * .035 : 0; });
  return <group onClick={e => { e.stopPropagation(); onSelect(); }} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .025, 0]}><ringGeometry args={[.46, .5, 40]}/><meshBasicMaterial color={selected || hovered ? '#749660' : '#c7c9b4'} transparent opacity={selected || hovered ? 1 : .35}/></mesh>
    <group ref={body}>
      <RoundedBox args={[.5, .62, .34]} radius={.1} position={[0, .88, 0]} castShadow><meshStandardMaterial color={agent.color}/></RoundedBox>
      <mesh position={[0, 1.45, 0]} castShadow><sphereGeometry args={[.255, 20, 16]}/><meshStandardMaterial color="#e9be9b"/></mesh>
      <mesh position={[0, 1.56, -.035]} castShadow><sphereGeometry args={[.26, 20, 16, 0, Math.PI * 2, 0, Math.PI / 2]}/><meshStandardMaterial color={agent.id === 'writer' ? '#684f43' : '#373c35'}/></mesh>
      {[-1, 1].map(i => <group key={i}>
        <Box position={[i * .12, .41, .02]} size={[.17, .46, .21]} color="#414940"/>
        <Box position={[i * .12, .15, .1]} size={[.2, .12, .34]} color="#f0e9da"/>
        <mesh position={[i * .33, .88, .04]} rotation={[0, 0, i * .1]} castShadow><capsuleGeometry args={[.075, .4, 4, 8]}/><meshStandardMaterial color={agent.color}/></mesh>
        <mesh position={[i * .085, 1.45, .24]}><sphereGeometry args={[.024, 8, 8]}/><meshStandardMaterial color="#30352e"/></mesh>
      </group>)}
    </group>
    <Html portal={labelPortal} position={[0, 2.03, 0]} center zIndexRange={[10, 0]}><button className={`scene-name ${selected ? 'selected' : ''}`} onClick={onSelect} aria-label={`Chọn ${agent.name}`}><i style={{ background: active ? '#e2a653' : '#8ca77c' }}/>{agent.name}<small>{active ? 'Đang làm việc' : agent.role}</small></button></Html>
  </group>;
}
function Desk({ position, color }: { position: [number, number, number]; color: string }) {
  return <group position={position}>
    <RoundedBox args={[2.1, .12, 1.05]} radius={.06} position={[0, .93, 0]} castShadow receiveShadow><meshStandardMaterial color="#e3c6a2"/></RoundedBox>
    {[-.86, .86].map(x => <Box key={x} position={[x, .46, 0]} size={[.08, .9, .8]} color="#e7e5d6"/>)}
    <Box position={[0, 1.35, -.25]} size={[.8, .49, .065]} color="#38453d"/>
    <Box position={[0, 1.35, -.21]} size={[.7, .39, .01]} color={color}/>
    <Box position={[0, 1.1, -.25]} size={[.07, .27, .08]} color="#586353"/>
    <Box position={[0, 1.015, .18]} size={[.58, .025, .2]} color="#ecebe0"/>
    <mesh position={[.65, 1.08, .2]}><cylinderGeometry args={[.07, .06, .15, 12]}/><meshStandardMaterial color="#b48064"/></mesh>
    <Box position={[-.68, 1.015, .22]} size={[.28, .025, .35]} color="#f4edda"/>
  </group>;
}
function Room({ agents, selected, currentAgent, onSelect, resetCount, labelPortal }: SceneProps & { labelPortal: LabelPortal }) {
  const { camera, size } = useThree();
  useEffect(() => {
    const ortho = camera as OrthographicCamera;
    ortho.position.set(11, 10, 13);
    ortho.lookAt(0, .2, 0);
    ortho.zoom = Math.min(size.width / 13, size.height / 9);
    ortho.updateProjectionMatrix();
  }, [camera, size.width, size.height, resetCount]);
  const spots: [number, number, number][] = [[-2.7, 0, -.9], [.1, 0, -1.8], [2.8, 0, -.2]];
  return <>
    <color attach="background" args={['#e9e9dd']}/>
    <ambientLight intensity={1.5}/><hemisphereLight args={['#fff9e8', '#91a283', 1.3]}/>
    <directionalLight position={[-3, 10, 5]} intensity={2.4} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-8} shadow-camera-right={8} shadow-camera-top={8} shadow-camera-bottom={-8} shadow-bias={-.0002}/>
    <group position={[0, -.1, 0]}>
      <RoundedBox args={[10.6, .22, 7.5]} radius={.12} position={[0, -.05, 0]} receiveShadow><meshStandardMaterial color="#d6c5a7"/></RoundedBox>
      <Box position={[0, .08, 0]} size={[10.3, .045, 7.2]} color="#e6d8bf"/>
      {Array.from({ length: 17 }, (_, i) => <Box key={i} position={[-4.9 + i * .61, .105, 0]} size={[.012, .006, 7.1]} color="#d6c8b0"/>)}
      <Box position={[0, 1.55, -3.6]} size={[10.4, 3, .16]} color="#d8dfca"/>
      <Box position={[-5.15, 1.55, 0]} size={[.15, 3, 7.2]} color="#e8e7d9"/>
      <Box position={[.7, 1.9, -3.49]} size={[4.8, 1.7, .04]} color="#f6f3dc"/>
      <Box position={[.7, 1.9, -3.43]} size={[4.6, 1.5, .025]} color="#c3d7cb"/>
      {[-1.65, -.1, 1.45, 3.05].map(x => <Box key={x} position={[x, 1.9, -3.36]} size={[.07, 1.65, .06]} color="#f9f4e5"/>)}
      <Box position={[.7, 1.9, -3.35]} size={[4.8, .07, .06]} color="#f9f4e5"/>
      <Box position={[-4.1, 1.9, -3.44]} size={[1.3, 1.25, .06]} color="#f6f0e2"/>
      <mesh position={[-4.1, 1.9, -3.39]}><circleGeometry args={[.42, 40]}/><meshStandardMaterial color="#99ab80"/></mesh>
      <Box position={[-4.1, 1.7, -3.34]} size={[.9, .25, .01]} color="#c3b493"/>
      <RoundedBox args={[5.8, .025, 2.5]} radius={.18} position={[.35, .13, 1.8]} receiveShadow><meshStandardMaterial color="#c0c8aa"/></RoundedBox>
      {agents.map((agent, i) => <group key={agent.id}>
        <Desk position={spots[i]} color={agent.color}/>
        <group position={[spots[i][0], .13, spots[i][2] + 1.2]}><Character labelPortal={labelPortal} agent={agent} selected={selected === agent.id} active={currentAgent === agent.id} onSelect={() => onSelect(agent.id)}/></group>
      </group>)}
      <group position={[-3.8, .12, 2.2]}>
        <RoundedBox args={[1.3, .5, 1.8]} radius={.15} position={[0, .32, 0]} castShadow><meshStandardMaterial color="#9aaa88"/></RoundedBox>
        <RoundedBox args={[.28, .65, 1.8]} radius={.1} position={[-.56, .65, 0]} castShadow><meshStandardMaterial color="#9aaa88"/></RoundedBox>
        {[-.47, .47].map(z => <RoundedBox key={z} args={[1, .17, .8]} radius={.07} position={[.08, .62, z]}><meshStandardMaterial color="#b0bd9a"/></RoundedBox>)}
      </group>
      <mesh position={[-1.6, .47, 2.25]} castShadow><cylinderGeometry args={[.65, .65, .1, 32]}/><meshStandardMaterial color="#cfad86"/></mesh>
      <mesh position={[-1.6, .3, 2.25]}><cylinderGeometry args={[.13, .24, .45, 16]}/><meshStandardMaterial color="#eee7d5"/></mesh>
      <Plant position={[-4.5, .12, -2.6]} scale={1.3}/><Plant position={[4.4, .12, -2.7]} scale={1.2}/><Plant position={[4.4, .12, 2.7]} scale={.85}/>
      <Box position={[4.7, .58, -1.45]} size={[.55, 1, 1.25]} color="#d0b590"/>
      {[0, 1, 2, 3, 4].map(i => <Box key={i} position={[4.7, 1.18, -1.9 + i * .18]} size={[.35, .28 + i % 2 * .12, .12]} color={['#829779', '#b78062', '#e9dfc8'][i % 3]}/>)}
    </group>
    <ContactShadows position={[0, -.24, 0]} opacity={.25} scale={20} blur={2.5} far={8}/>
    <OrbitControls makeDefault target={[0, .2, 0]} minPolarAngle={.35} maxPolarAngle={Math.PI / 2.15} minZoom={15} maxZoom={100} enablePan={false}/>
  </>;
}
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <div className="scene-fallback"><span>◇</span><h3>Chế độ không gian 2D</h3><p>Trình duyệt chưa hỗ trợ WebGL. Bạn vẫn có thể chọn agent và giao việc bên dưới.</p></div> : this.props.children; }
}
export default function OfficeScene(props: SceneProps) {
  const labelPortal = useRef<HTMLDivElement>(null!);
  return <SceneBoundary><Suspense fallback={<div className="scene-fallback">Đang chuẩn bị văn phòng…</div>}><div ref={labelPortal} className="label-layer"/><Canvas shadows orthographic camera={{ position: [11, 10, 13], zoom: 52, near: .1, far: 100 }} dpr={[1, 1.7]} gl={{ antialias: true }} fallback={<div className="scene-fallback">Không hỗ trợ WebGL. Hãy dùng danh sách agent bên dưới.</div>}><Room {...props} labelPortal={labelPortal}/></Canvas></Suspense></SceneBoundary>;
}
