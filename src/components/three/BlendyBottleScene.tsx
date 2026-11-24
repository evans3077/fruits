import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ChevronDown, ChevronUp, Layers, RotateCw, RotateCcw } from 'lucide-react';
import type { FlavourId } from '../../types';

export interface BlendyBottleSceneProps {
  flavourName: string;
  heroSpecKey?: FlavourId | null;
  bgTint?: string;
  sizeLabel: string; // e.g. '330ml Bottle' or '1L Family Bottle'
  nutritionJson?: Record<string, string>;
  compact?: boolean;
}

interface FlavourPalette {
  liquid: string;
  cap: string;
  fleck: string;
  backdrop: string;
}

const PALETTES: Record<string, FlavourPalette> = {
  berry: {
    liquid: '#6E3F99',
    cap: '#2D1C42',
    fleck: '#3D195E',
    backdrop: '#EDE7F6',
  },
  kiwi: {
    liquid: '#72A632',
    cap: '#233812',
    fleck: '#203314',
    backdrop: '#EAF3DE',
  },
  banana: {
    liquid: '#E7BD3D',
    cap: '#3B2F12',
    fleck: '#B88719',
    backdrop: '#FAF2D8',
  },
  strawberry: {
    liquid: '#D9486E',
    cap: '#421625',
    fleck: '#8B1D3B',
    backdrop: '#FBE5EC',
  },
};

function resolvePalette(
  heroSpecKey?: FlavourId | null,
  flavourName = '',
  bgTint = ''
): FlavourPalette {
  const key = (heroSpecKey || flavourName || '').toLowerCase();
  if (key.includes('kiwi')) return PALETTES.kiwi;
  if (key.includes('banana')) return PALETTES.banana;
  if (key.includes('straw')) return PALETTES.strawberry;
  if (key.includes('berry')) return PALETTES.berry;
  return {
    liquid: '#7E57C2',
    cap: '#18181B',
    fleck: '#3F2768',
    backdrop: bgTint || '#EFECE6',
  };
}

function createBottleLabelTexture(
  flavourName: string,
  sizeLabel: string,
  palette: FlavourPalette,
  nutritionJson: Record<string, string>,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Tinted header band
  ctx.fillStyle = palette.liquid;
  ctx.fillRect(0, 0, canvas.width, 76);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 28px Poppins, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('100% REAL FRUIT · ZERO ADDED SUGAR · COLD BLENDED', 512, 48);

  // Front label face (centered around x = 512)
  ctx.fillStyle = '#18181B';
  ctx.font = '800 84px "Baloo 2", Poppins, system-ui, sans-serif';
  ctx.fillText('Blendy', 512, 185);

  ctx.fillStyle = palette.liquid;
  ctx.font = '700 54px Poppins, system-ui, sans-serif';
  ctx.fillText(flavourName.toUpperCase(), 512, 260);

  // Size pill box on label graphic
  const cleanSize = sizeLabel.replace(/\s+Bottle/i, '').trim() || '330ml';
  ctx.fillStyle = '#18181B';
  ctx.fillRect(422, 294, 180, 58);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 32px Poppins, system-ui, sans-serif';
  ctx.fillText(cleanSize, 512, 334);

  // Nutrition strip at bottom
  ctx.fillStyle = '#F4F4F5';
  ctx.fillRect(0, 396, canvas.width, 116);
  ctx.fillStyle = '#3F3F46';
  const energy = nutritionJson['Energy'] || '150 kcal';
  const vitC = nutritionJson['Vitamin C'] || nutritionJson['Potassium'] || 'Fresh Fruit';
  ctx.font = '600 24px Poppins, system-ui, sans-serif';
  ctx.fillText(
    `KENYA SMALL-BATCH · ${energy} · ${vitC} · KEEP CHILLED 2–4°C`,
    512,
    460
  );

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, maxAnisotropy);
  texture.needsUpdate = true;
  return texture;
}

function createSoftShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(128, 128, 18, 128, 128, 122);
  grad.addColorStop(0, 'rgba(24, 24, 27, 0.42)');
  grad.addColorStop(0.55, 'rgba(24, 24, 27, 0.14)');
  grad.addColorStop(1, 'rgba(24, 24, 27, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export const BlendyBottleScene: React.FC<BlendyBottleSceneProps> = ({
  flavourName,
  heroSpecKey,
  bgTint,
  sizeLabel,
  nutritionJson = {},
  compact = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [exploded, setExploded] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [preset, setPreset] = useState<'hero' | 'top' | 'detail'>('hero');
  const [dockOpen, setDockOpen] = useState(true);
  const [webglError, setWebglError] = useState<string | null>(null);

  const controlsStateRef = useRef({
    exploded: false,
    autoRotate: true,
    preset: 'hero' as 'hero' | 'top' | 'detail',
    recenterNonce: 0,
  });

  controlsStateRef.current.exploded = exploded;
  controlsStateRef.current.autoRotate = autoRotate;
  controlsStateRef.current.preset = preset;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const palette = resolvePalette(heroSpecKey, flavourName, bgTint);
    const isOneLiter = /1\s*L/i.test(sizeLabel);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglError('3D WebGL view is unavailable on this browser.');
      return;
    }

    const gl = renderer.getContext();
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererString = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
    const isSoftwareGl = /swiftshader|llvmpipe|software/i.test(rendererString);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isSoftwareGl ? 1 : 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.04;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const bgColor = new THREE.Color(palette.backdrop);
    scene.background = bgColor;
    scene.fog = new THREE.Fog(bgColor, 6.5, 13.5);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    scene.environmentIntensity = 0.85;

    const camera = new THREE.PerspectiveCamera(
      36,
      Math.max(1, container.clientWidth) / Math.max(1, container.clientHeight),
      0.1,
      50
    );
    camera.position.set(2.15, 1.85, 3.65);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.target.set(0, 1.05, 0);
    controls.minDistance = 1.8;
    controls.maxDistance = 6.2;
    controls.minPolarAngle = 0.2;
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.autoRotate = !isSoftwareGl && controlsStateRef.current.autoRotate;
    controls.autoRotateSpeed = 1.3;
    controls.update();

    // Lighting Rig
    const hemiLight = new THREE.HemisphereLight('#F4F6FB', '#D8D0C5', 0.7);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight('#FFF6E8', 2.2);
    keyLight.position.set(3.2, 4.8, 3.6);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight('#DCE8FF', 0.9);
    rimLight.position.set(-3.4, 2.4, -2.8);
    scene.add(rimLight);

    // 1. Studio Plinth + Contact Shadow
    const plinthGeo = new THREE.CylinderGeometry(1.15, 1.22, 0.08, 48);
    const plinthMat = new THREE.MeshStandardMaterial({
      color: '#FFFFFF',
      roughness: 0.72,
      metalness: 0.04,
    });
    const plinth = new THREE.Mesh(plinthGeo, plinthMat);
    plinth.position.y = -0.04;
    plinth.receiveShadow = !isSoftwareGl;
    scene.add(plinth);

    const shadowTex = createSoftShadowTexture();
    const shadowGeo = new THREE.PlaneGeometry(1.7, 1.7);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = 0.002;
    scene.add(shadowPlane);

    // Composite 3D Bottle Rig (THREE.Group seated cleanly at y = 0)
    const bottleGroup = new THREE.Group();
    const bottleScaleXZ = isOneLiter ? 1.18 : 1.0;
    const bottleScaleY = isOneLiter ? 1.24 : 1.0;
    bottleGroup.scale.set(bottleScaleXZ, bottleScaleY, bottleScaleXZ);
    scene.add(bottleGroup);

    // 2. Outer Clear Glass / PET Bottle Body (LatheGeometry)
    const outerPoints = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(0.35, 0.0),
      new THREE.Vector2(0.41, 0.06),
      new THREE.Vector2(0.42, 0.14),
      new THREE.Vector2(0.42, 1.18),
      new THREE.Vector2(0.39, 1.38),
      new THREE.Vector2(0.24, 1.56),
      new THREE.Vector2(0.165, 1.68),
      new THREE.Vector2(0.165, 1.84),
      new THREE.Vector2(0.145, 1.84),
    ];
    const outerGeo = new THREE.LatheGeometry(outerPoints, 48);
    const outerMat = new THREE.MeshPhysicalMaterial({
      color: '#FFFFFF',
      roughness: 0.08,
      metalness: 0.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      transmission: isSoftwareGl ? 0 : 0.72,
      ior: 1.48,
      thickness: 0.25,
      transparent: true,
      opacity: isSoftwareGl ? 0.36 : 0.94,
      depthWrite: false,
    });
    const outerMesh = new THREE.Mesh(outerGeo, outerMat);
    outerMesh.renderOrder = 2;
    outerMesh.castShadow = !isSoftwareGl;
    bottleGroup.add(outerMesh);

    // 3. Inner Thick Smoothie Liquid Column
    const liquidGroup = new THREE.Group();
    const liquidPoints = [
      new THREE.Vector2(0.0, 0.03),
      new THREE.Vector2(0.34, 0.03),
      new THREE.Vector2(0.385, 0.09),
      new THREE.Vector2(0.385, 1.18),
      new THREE.Vector2(0.34, 1.36),
      new THREE.Vector2(0.21, 1.52),
      new THREE.Vector2(0.0, 1.52),
    ];
    const liquidGeo = new THREE.LatheGeometry(liquidPoints, 42);
    const liquidMat = new THREE.MeshStandardMaterial({
      color: palette.liquid,
      roughness: 0.34,
      metalness: 0.02,
    });
    const liquidMesh = new THREE.Mesh(liquidGeo, liquidMat);
    liquidMesh.renderOrder = 1;
    liquidGroup.add(liquidMesh);

    // 4. Suspended Real-Fruit Flecks (InstancedMesh inside smoothie)
    const fleckGeo = new THREE.DodecahedronGeometry(0.016, 0);
    const fleckMat = new THREE.MeshStandardMaterial({
      color: palette.fleck,
      roughness: 0.65,
    });
    const fleckCount = 46;
    const flecks = new THREE.InstancedMesh(fleckGeo, fleckMat, fleckCount);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < fleckCount; i++) {
      const angle = (i * 2.39996) % (Math.PI * 2);
      const radius = 0.14 + ((i * 37) % 100) / 480;
      const y = 0.14 + ((i * 53) % 100) / 76;
      dummy.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
      dummy.rotation.set(i * 0.4, i * 0.7, 0);
      const s = 0.75 + (i % 4) * 0.25;
      dummy.scale.set(s, s * 0.8, s);
      dummy.updateMatrix();
      flecks.setMatrixAt(i, dummy.matrix);
    }
    flecks.instanceMatrix.needsUpdate = true;
    flecks.computeBoundingSphere();
    liquidGroup.add(flecks);
    bottleGroup.add(liquidGroup);

    // 5. Wrapped Procedural CanvasTexture Label
    const labelTex = createBottleLabelTexture(
      flavourName,
      sizeLabel,
      palette,
      nutritionJson,
      renderer.capabilities.getMaxAnisotropy()
    );
    const labelGeo = new THREE.CylinderGeometry(0.427, 0.427, 0.78, 48, 1, true);
    const labelMat = new THREE.MeshStandardMaterial({
      map: labelTex,
      roughness: 0.48,
      metalness: 0.02,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    });
    const labelMesh = new THREE.Mesh(labelGeo, labelMat);
    labelMesh.position.y = 0.68;
    labelMesh.rotation.y = -Math.PI / 2;
    labelMesh.renderOrder = 3;
    bottleGroup.add(labelMesh);

    // 6. Neck Tamper Collar Ring
    const collarGeo = new THREE.TorusGeometry(0.178, 0.022, 16, 36);
    const collarMat = new THREE.MeshStandardMaterial({
      color: palette.cap,
      roughness: 0.45,
      metalness: 0.08,
    });
    const collarMesh = new THREE.Mesh(collarGeo, collarMat);
    collarMesh.rotation.x = Math.PI / 2;
    collarMesh.position.y = 1.72;
    bottleGroup.add(collarMesh);

    // 7. Ribbed Cap Assembly
    const capGroup = new THREE.Group();
    capGroup.position.y = 1.75;
    const capPoints = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(0.185, 0.0),
      new THREE.Vector2(0.19, 0.03),
      new THREE.Vector2(0.188, 0.21),
      new THREE.Vector2(0.172, 0.235),
      new THREE.Vector2(0.0, 0.238),
    ];
    const capGeo = new THREE.LatheGeometry(capPoints, 36);
    const capMat = new THREE.MeshStandardMaterial({
      color: palette.cap,
      roughness: 0.52,
      metalness: 0.08,
    });
    const capShell = new THREE.Mesh(capGeo, capMat);
    capShell.castShadow = !isSoftwareGl;
    capGroup.add(capShell);

    const ribGeo = new THREE.BoxGeometry(0.012, 0.16, 0.018);
    const ribCount = 24;
    const capRibs = new THREE.InstancedMesh(ribGeo, capMat, ribCount);
    for (let i = 0; i < ribCount; i++) {
      const a = (i / ribCount) * Math.PI * 2;
      dummy.position.set(Math.cos(a) * 0.188, 0.115, Math.sin(a) * 0.188);
      dummy.rotation.set(0, -a, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      capRibs.setMatrixAt(i, dummy.matrix);
    }
    capRibs.instanceMatrix.needsUpdate = true;
    capRibs.computeBoundingSphere();
    capGroup.add(capRibs);
    bottleGroup.add(capGroup);

    // Animation, Damping, Resize & After-Draw Pacing
    const clock = new THREE.Clock();
    let animFrameId = 0;
    let delayTimer: number | undefined;
    let disposed = false;

    const targetCamPos = new THREE.Vector3(2.15, 1.85, 3.65);
    const targetLookAt = new THREE.Vector3(0, 1.05, 0);
    let lastPreset = controlsStateRef.current.preset;
    let lastNonce = controlsStateRef.current.recenterNonce;

    const syncSize = () => {
      if (disposed || !container) return;
      const w = Math.max(1, container.clientWidth);
      const h = Math.max(1, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    syncSize();
    const resizeObserver = new ResizeObserver(syncSize);
    resizeObserver.observe(container);

    const afterDraw = () => {
      if (disposed) return;
      const delayMs = isSoftwareGl ? 100 : 0;
      if (delayMs > 0) {
        delayTimer = window.setTimeout(() => {
          if (!disposed) animFrameId = requestAnimationFrame(renderFrame);
        }, delayMs);
      } else {
        animFrameId = requestAnimationFrame(renderFrame);
      }
    };

    const renderFrame = () => {
      if (disposed) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      const { exploded: isExp, autoRotate: shouldSpin, preset: curPreset, recenterNonce } =
        controlsStateRef.current;

      controls.autoRotate = !isSoftwareGl && shouldSpin;

      // Exploded view smoothly damped
      const expFactor = isExp ? 1 : 0;
      capGroup.position.y = THREE.MathUtils.damp(capGroup.position.y, 1.75 + expFactor * 0.48, 7, dt);
      collarMesh.position.y = THREE.MathUtils.damp(
        collarMesh.position.y,
        1.72 + expFactor * 0.25,
        7,
        dt
      );
      labelMesh.position.y = THREE.MathUtils.damp(
        labelMesh.position.y,
        0.68 - expFactor * 0.06,
        7,
        dt
      );
      labelMesh.scale.setScalar(THREE.MathUtils.damp(labelMesh.scale.x, 1 + expFactor * 0.16, 7, dt));
      outerMesh.position.y = THREE.MathUtils.damp(outerMesh.position.y, expFactor * 0.14, 7, dt);

      // Apply camera presets smoothly when preset changes or recenter clicked
      if (curPreset !== lastPreset || recenterNonce !== lastNonce) {
        lastPreset = curPreset;
        lastNonce = recenterNonce;
        if (curPreset === 'hero') {
          targetCamPos.set(2.15, 1.85, 3.65);
          targetLookAt.set(0, 1.05, 0);
        } else if (curPreset === 'top') {
          targetCamPos.set(0.3, 4.1, 1.5);
          targetLookAt.set(0, 1.1, 0);
        } else {
          targetCamPos.set(0.85, 0.95, 2.35);
          targetLookAt.set(0, 0.85, 0);
        }
        camera.position.copy(targetCamPos);
        controls.target.copy(targetLookAt);
      }

      controls.update();
      renderer.render(scene, camera);
      afterDraw();
    };

    animFrameId = requestAnimationFrame(renderFrame);

    return () => {
      disposed = true;
      cancelAnimationFrame(animFrameId);
      if (delayTimer !== undefined) clearTimeout(delayTimer);
      resizeObserver.disconnect();
      controls.dispose();
      [plinthGeo, shadowGeo, outerGeo, liquidGeo, fleckGeo, labelGeo, collarGeo, capGeo, ribGeo].forEach(
        (g) => g.dispose()
      );
      [plinthMat, shadowMat, outerMat, liquidMat, fleckMat, labelMat, collarMat, capMat].forEach((m) =>
        m.dispose()
      );
      shadowTex.dispose();
      labelTex.dispose();
      envTarget.dispose();
      pmrem.dispose();
      renderer.dispose();
    };
  }, [flavourName, heroSpecKey, bgTint, sizeLabel, nutritionJson]);

  if (webglError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-zinc-100 text-zinc-700">
        <p className="text-sm font-semibold">{webglError}</p>
        <p className="text-xs text-zinc-500 mt-1">Switch back to 2D Bottle View to inspect artwork.</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      {/* Isolated WebGL Viewport Container */}
      <div
        ref={containerRef}
        className="w-full h-full"
        aria-label={`Interactive 3D view of ${flavourName} ${sizeLabel}`}
      />

      {/* Collapsible Compact Bottom Control Dock (No backdrop-filter over WebGL) */}
      <div className="absolute bottom-3 left-3 right-3 flex flex-col items-center pointer-events-none z-10">
        {dockOpen ? (
          <div className="pointer-events-auto bg-white border border-zinc-200 rounded-xl shadow-lg px-2.5 py-1.5 flex flex-wrap items-center justify-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setExploded((v) => !v)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                exploded ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-800 hover:bg-zinc-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{exploded ? 'Assemble' : 'Explode'}</span>
            </button>

            <button
              type="button"
              onClick={() => setAutoRotate((v) => !v)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                autoRotate ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-800 hover:bg-zinc-200'
              }`}
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>{autoRotate ? 'Spin On' : 'Spin Off'}</span>
            </button>

            {!compact && (
              <>
                <button
                  type="button"
                  onClick={() => setPreset('hero')}
                  className={`px-2.5 py-1.5 rounded-lg font-medium cursor-pointer ${
                    preset === 'hero' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-800'
                  }`}
                >
                  Hero
                </button>
                <button
                  type="button"
                  onClick={() => setPreset('detail')}
                  className={`px-2.5 py-1.5 rounded-lg font-medium cursor-pointer ${
                    preset === 'detail' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-800'
                  }`}
                >
                  Label
                </button>
                <button
                  type="button"
                  onClick={() => setPreset('top')}
                  className={`px-2.5 py-1.5 rounded-lg font-medium cursor-pointer ${
                    preset === 'top' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-800'
                  }`}
                >
                  Cap
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => {
                setPreset('hero');
                controlsStateRef.current.recenterNonce += 1;
              }}
              aria-label="Reset camera view"
              className="p-1.5 rounded-lg bg-zinc-100 text-zinc-700 hover:bg-zinc-200 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setDockOpen(false)}
              aria-label="Collapse 3D controls"
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 cursor-pointer"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setDockOpen(true)}
            className="pointer-events-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-zinc-200 shadow text-xs font-semibold text-zinc-800 cursor-pointer"
          >
            <ChevronUp className="w-3.5 h-3.5" />
            <span>3D Controls</span>
          </button>
        )}
      </div>
    </div>
  );
};
