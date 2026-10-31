/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { SamuraiEngine, HUDStateSnapshot } from './game/SamuraiEngine';
import {
  WEAPONS,
  THROWABLES,
  ARMORS,
  HELMETS,
  TWENTY_AUTHENTIC_ARSENAL,
  ArtworkThemeId,
} from './game/arsenal';
import { downloadStandaloneSamuraiHTML } from './game/singleFileExporter';
import {
  ARTWORK_THEMES,
  generateAllStudioArtworkPortraits,
  synthesizeLiveAIScrollPortrait,
} from './game/artworkStudio';
import {
  SKIN_COMPLEXIONS,
  EYE_IRIS_COLORS,
  HAIRSTYLES,
  FACIAL_HAIRS,
  SCAR_ACCESSORIES,
  TATTOO_PAINTS,
  ELEMENTAL_INFUSIONS,
  DEFAULT_CHARACTER_APPEARANCE,
} from './game/characterCustomization';
import {
  VERIFIED_3D_ASSET_PRESETS,
  AssetTargetSlot,
  InspectedModelTelemetry,
} from './game/assetManager';
import { SIX_COMBAT_MOVES, CombatMoveDefinition } from './game/combatSplinesAndShaders';
import { NANO_BANANA_PBR_PRESETS, NanoBananaPresetId } from './game/pbrTextureForge';
import { DOJO_CURRICULUM_LESSONS, DojoLessonId } from './game/comboDojoTrainer';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  auth,
  signInSamuraiWithGoogle,
  signOutSamurai,
  syncSamuraiProfileToCloud,
  subscribeToSamuraiProfile,
} from './lib/firebase';

interface TacticianResponse {
  source: string;
  scrollTitle: string;
  enemyCounterDirective: string;
  samuraiAdvice: string[];
}

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<SamuraiEngine | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [hud, setHud] = useState<HUDStateSnapshot | null>(null);
  const [arsenalOpen, setArsenalOpen] = useState(false);
  const [arsenalTab, setArsenalTab] = useState<
    'weapons' | 'throwables' | 'armor' | 'helmets' | 'compendium_studio'
  >('weapons');
  const [shogunPanelOpen, setShogunPanelOpen] = useState(false);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Dual-Pipeline Ukiyo-e & AI Artwork Studio State
  const [artTheme, setArtTheme] = useState<ArtworkThemeId>('sumi_blood_ink');
  const [artworkMap, setArtworkMap] = useState<Record<string, string>>({});
  const [synthesizingId, setSynthesizingId] = useState<string | null>(null);
  const [artStudioBanner, setArtStudioBanner] = useState<string>(
    'Pipeline 1 (3-Point Offscreen 3D Studio + Ukiyo-e Woodblock Compositor) & Pipeline 2 (Gemini Image Synthesizer) Ready'
  );

  // Gemini 4 Argon High-Thinking Tactician & Lyria 3 Music State
  const [tacticianLoading, setTacticianLoading] = useState(false);
  const [tacticianScroll, setTacticianScroll] = useState<TacticianResponse | null>(null);
  const [lyriaLoading, setLyriaLoading] = useState(false);
  const [lyriaDurationType, setLyriaDurationType] = useState<'clip' | 'full'>('clip');
  const [lyriaStatus, setLyriaStatus] = useState<string>(
    'Active: Procedural Web Audio Pentatonic Koto, Shakuhachi & Taiko Engine'
  );

  // Live 3D Asset Inspector & URL/File Dropper State ([L] Hotkey)
  const [assetStudioOpen, setAssetStudioOpen] = useState(false);
  const [assetTargetSlot, setAssetTargetSlot] = useState<AssetTargetSlot>('samurai');
  const [customAssetUrlInput, setCustomAssetUrlInput] = useState('');
  const [assetLoadingStatus, setAssetLoadingStatus] = useState<string>(
    'GLTFLoader + DRACOLoader + RGBELoader & High-Order Mathematical Forge Ready'
  );
  const [inspectedTelemetry, setInspectedTelemetry] = useState<InspectedModelTelemetry | null>(
    null
  );

  // Cloud Profile Sync State (Firebase Auth + Firestore)
  const [cloudUser, setCloudUser] = useState<User | null>(null);
  const [cloudSyncNotice, setCloudSyncNotice] = useState<string>('');

  // Nano Banana Pro (gemini-3-pro-image-preview) 4-Map PBR & POM Forge State
  const [pbrPresetId, setPbrPresetId] = useState<NanoBananaPresetId>(NANO_BANANA_PBR_PRESETS[0].id);
  const [pbrCustomPrompt, setPbrCustomPrompt] = useState<string>('');
  const [pbrSynthesizing, setPbrSynthesizing] = useState<boolean>(false);

  useEffect(() => {
    const portraits = generateAllStudioArtworkPortraits('sumi_blood_ink');
    setArtworkMap(portraits);
  }, []);

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setCloudUser(user);
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }
      if (user) {
        unsubProfile = subscribeToSamuraiProfile(user, (data) => {
          if (data && engineRef.current) {
            if (typeof data.primaryWeaponId === 'string') {
              engineRef.current.equipWeapon(data.primaryWeaponId);
            }
            if (typeof data.armorId === 'string') {
              engineRef.current.equipArmor(data.armorId);
            }
            if (typeof data.helmetId === 'string') {
              engineRef.current.equipHelmet(data.helmetId);
            }
            setCloudSyncNotice('Cloud Samurai Profile synchronized.');
          }
        });
      }
    });
    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  useEffect(() => {
    if (!canvasMountRef.current) return;
    const engine = new SamuraiEngine(canvasMountRef.current, (snapshot) => {
      setHud(snapshot);
      if (snapshot.inspectedTelemetry) {
        setInspectedTelemetry(snapshot.inspectedTelemetry);
      }
    });
    engineRef.current = engine;
    engine.inspectTargetSlotTelemetry('samurai');

    const onGlobalKey = (e: KeyboardEvent) => {
      if (e.code === 'Tab' || e.code === 'KeyI') {
        e.preventDefault();
        setArsenalOpen((prev) => !prev);
        setShogunPanelOpen(false);
        setAssetStudioOpen(false);
      } else if (e.code === 'KeyN') {
        setShogunPanelOpen((prev) => !prev);
        setArsenalOpen(false);
        setAssetStudioOpen(false);
      } else if (e.code === 'KeyL') {
        setAssetStudioOpen((prev) => {
          const next = !prev;
          if (next && engineRef.current) {
            engineRef.current.inspectTargetSlotTelemetry('samurai');
          }
          return next;
        });
        setArsenalOpen(false);
        setShogunPanelOpen(false);
      } else if (e.code === 'KeyH') {
        setDockCollapsed((prev) => !prev);
      } else if (e.code === 'KeyM') {
        const nextMuted = !engine.audio.getMuted();
        engine.audio.setMuted(nextMuted);
        setIsMuted(nextMuted);
      }
    };

    window.addEventListener('keydown', onGlobalKey);
    return () => {
      window.removeEventListener('keydown', onGlobalKey);
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const handleRefreshTelemetry = (slot: AssetTargetSlot) => {
    setAssetTargetSlot(slot);
    if (engineRef.current) {
      engineRef.current.inspectTargetSlotTelemetry(slot);
    }
  };

  const handleLoadUrlForSlot = async (slot: AssetTargetSlot, url: string, label?: string) => {
    if (!engineRef.current || !url.trim()) return;
    setAssetLoadingStatus(`Loading ${label || url} into [${slot.toUpperCase()}]...`);
    try {
      const report = await engineRef.current.loadCustomGLTFUrlForSlot(url.trim(), slot, label);
      setInspectedTelemetry(report);
      setAssetLoadingStatus(
        `Hot-swapped [${slot.toUpperCase()}]: ${report.name} (${report.vertexCount.toLocaleString()} verts · ${report.triangleCount.toLocaleString()} tris)`
      );
    } catch {
      setAssetLoadingStatus(
        `CORS/Network fallback triggered for ${label || url} — Parametric Mathematical Surface active.`
      );
    }
  };

  const handleDropOrSelectFile = async (file: File) => {
    if (!engineRef.current) return;
    const isHdr = file.name.toLowerCase().endsWith('.hdr');
    const targetSlot: AssetTargetSlot = isHdr ? 'hdri' : assetTargetSlot;
    setAssetLoadingStatus(`Parsing local 3D file "${file.name}" into [${targetSlot.toUpperCase()}]...`);
    try {
      const report = await engineRef.current.loadDroppedGLTFFileForSlot(file, targetSlot);
      setAssetTargetSlot(targetSlot);
      setInspectedTelemetry(report);
      setAssetLoadingStatus(
        `Loaded local file "${file.name}" into [${targetSlot.toUpperCase()}] (${report.vertexCount.toLocaleString()} verts · ${report.triangleCount.toLocaleString()} tris)`
      );
    } catch {
      setAssetLoadingStatus(`Could not parse "${file.name}". Ensure it is a valid .glb, .gltf, or .hdr file.`);
    }
  };

  const handleSynthesizeNanoBananaPBR = async (presetId: NanoBananaPresetId, customPrompt?: string) => {
    if (!engineRef.current || pbrSynthesizing) return;
    setPbrSynthesizing(true);
    setAssetLoadingStatus(`Synthesizing 4-Map Sobel-Scharr PBR + 16-Step POM Material (${presetId})...`);
    try {
      const bundle = await engineRef.current.generateAndApplyNanoBananaPBR(presetId, customPrompt);
      setAssetLoadingStatus(
        `Applied 4-Map PBR + POM Material: ${bundle.presetId} via ${bundle.sourceModel} (16-step Raymarched Relief)`
      );
    } finally {
      setPbrSynthesizing(false);
    }
  };

  const handleCloudSaveProfile = async () => {
    if (!hud) return;
    try {
      let activeUser = cloudUser;
      if (!activeUser) {
        activeUser = await signInSamuraiWithGoogle();
      }
      if (!activeUser) return;
      await syncSamuraiProfileToCloud(activeUser, {
        bestScore: hud.bestScore,
        koku: hud.koku,
        highestUnlockedStage: hud.highestUnlockedStage,
        primaryWeaponId: hud.primaryWeapon.id,
        secondaryWeaponId: hud.secondaryWeapon.id,
        rangedWeaponId: hud.rangedWeapon.id,
        armorId: hud.equippedArmor.id,
        helmetId: hud.equippedHelmet.id,
      });
      setCloudSyncNotice('Saved Samurai profile & loadout to Cloud.');
    } catch {
      setCloudSyncNotice('Cloud sign-in or sync cancelled.');
    }
  };

  const handleSelectArtTheme = (nextTheme: ArtworkThemeId) => {
    setArtTheme(nextTheme);
    const updated = generateAllStudioArtworkPortraits(nextTheme);
    setArtworkMap((prev) => ({ ...prev, ...updated }));
    const themeObj = ARTWORK_THEMES.find((t) => t.id === nextTheme);
    setArtStudioBanner(
      `Applied "${themeObj?.name} (${themeObj?.kanji})" across all 35 Weapons, 12 Outfits & 10 Boss Portraits.`
    );
  };

  const handleSynthesizeItemArt = async (params: {
    mapKey: string;
    itemId: string;
    title: string;
    kanji: string;
    subtitle: string;
    aiPrompt: string;
    auraMotif: 'emerald_wind' | 'crimson_lightning' | 'ember_smoke' | 'azure_mist' | 'violet_shadow';
    primaryColor: number;
    secondaryColor: number;
  }) => {
    if (synthesizingId) return;
    setSynthesizingId(params.mapKey);
    setArtStudioBanner(`Synthesizing Masterpiece Scroll Portrait for ${params.title} (${params.kanji})...`);
    try {
      const res = await synthesizeLiveAIScrollPortrait({
        itemId: params.itemId,
        title: params.title,
        kanji: params.kanji,
        subtitle: params.subtitle,
        aiPrompt: params.aiPrompt,
        auraMotif: params.auraMotif,
        primaryColor: params.primaryColor,
        secondaryColor: params.secondaryColor,
        themeId: artTheme,
      });
      setArtworkMap((prev) => ({ ...prev, [params.mapKey]: res.dataUrl }));
      setArtStudioBanner(
        `Synthesized 512×512 Masterpiece Scroll for ${params.title} (${
          res.source === 'gemini-imagen' ? 'Google AI Studio Image API' : '3-Point 3D Studio + Ukiyo-e Compositor'
        }). Bound live to HUD!`
      );
    } finally {
      setSynthesizingId(null);
    }
  };

  const handleBatchSynthesizeLoadout = async () => {
    if (!hud || synthesizingId) return;
    setSynthesizingId('batch_loadout');
    setArtStudioBanner('Batch-synthesizing high-resolution scrolls for equipped Loadout...');
    try {
      const itemsToBuild = [
        {
          mapKey: hud.primaryWeapon.id,
          itemId: hud.primaryWeapon.id,
          title: hud.primaryWeapon.name,
          kanji: hud.primaryWeapon.kanji,
          subtitle: hud.primaryWeapon.metricSpecs,
          aiPrompt: hud.primaryWeapon.aiPrompt,
          auraMotif: hud.primaryWeapon.auraMotif,
          primaryColor: hud.primaryWeapon.bladeColor,
          secondaryColor: hud.primaryWeapon.hiltColor,
        },
        {
          mapKey: hud.secondaryWeapon.id,
          itemId: hud.secondaryWeapon.id,
          title: hud.secondaryWeapon.name,
          kanji: hud.secondaryWeapon.kanji,
          subtitle: hud.secondaryWeapon.metricSpecs,
          aiPrompt: hud.secondaryWeapon.aiPrompt,
          auraMotif: hud.secondaryWeapon.auraMotif,
          primaryColor: hud.secondaryWeapon.bladeColor,
          secondaryColor: hud.secondaryWeapon.hiltColor,
        },
        {
          mapKey: hud.rangedWeapon.id,
          itemId: hud.rangedWeapon.id,
          title: hud.rangedWeapon.name,
          kanji: hud.rangedWeapon.kanji,
          subtitle: hud.rangedWeapon.metricSpecs,
          aiPrompt: hud.rangedWeapon.aiPrompt,
          auraMotif: hud.rangedWeapon.auraMotif,
          primaryColor: hud.rangedWeapon.bladeColor,
          secondaryColor: hud.rangedWeapon.hiltColor,
        },
      ];
      for (const entry of itemsToBuild) {
        const res = await synthesizeLiveAIScrollPortrait({
          ...entry,
          themeId: artTheme,
        });
        setArtworkMap((prev) => ({ ...prev, [entry.mapKey]: res.dataUrl }));
      }
      setArtStudioBanner('Equipped Loadout Scrolls synthesized and bound to HUD weapon slots!');
    } finally {
      setSynthesizingId(null);
    }
  };

  const handleConsultTactician = async () => {
    if (!hud || tacticianLoading) return;
    setTacticianLoading(true);
    try {
      const activeWeaponName =
        hud.activeSlot === 'primary'
          ? hud.primaryWeapon.name
          : hud.activeSlot === 'secondary'
            ? hud.secondaryWeapon.name
            : hud.rangedWeapon.name;

      const res = await fetch('/api/ai-tactician', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telemetry: hud.aiSnapshot,
          stageName: hud.stageDef.name,
          bossName: hud.bossName,
          equippedWeapon: activeWeaponName,
          equippedArmor: hud.equippedArmor.name,
          equippedHelmet: hud.equippedHelmet.name,
        }),
      });
      const data = await res.json();
      setTacticianScroll(data);
    } catch {
      setTacticianScroll({
        source: 'local',
        scrollTitle: 'Scroll of the Undefeated Blade',
        enemyCounterDirective: hud.aiSnapshot.adaptationSummary,
        samuraiAdvice: [
          'Use Charged Heavy Attacks (Hold Left-Click) to break enemy Hyper-Armor.',
          'Time Right-Click Deflections or W+Shift Mikiri Counters right as the crimson ring closes.',
          'Infuse your blade with Z/X/C/V/B Elemental Techniques and use [G] Kaginawa Grapple to reposition.',
        ],
      });
    } finally {
      setTacticianLoading(false);
    }
  };

  const handleGenerateLyriaMusic = async () => {
    if (!hud || lyriaLoading) return;
    setLyriaLoading(true);
    setLyriaStatus(
      `Composing with ${lyriaDurationType === 'full' ? 'lyria-3-pro-preview' : 'lyria-3-clip-preview'}...`
    );
    try {
      const res = await fetch('/api/music-gen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stageName: hud.stageDef.name,
          mood: hud.bossActive ? 'epic boss battle' : 'tense samurai duel',
          durationType: lyriaDurationType,
        }),
      });
      const data = await res.json();
      if (data.audioBase64 && engineRef.current) {
        const binary = atob(data.audioBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: data.mimeType || 'audio/wav' });
        const url = URL.createObjectURL(blob);
        engineRef.current.audio.playCustomLyriaTrack(url);
        setLyriaStatus(`Playing Generated Lyria Track (${data.model})`);
      } else {
        setLyriaStatus(data.message || 'Active: Procedural Web Audio Koto & Shakuhachi Synth');
      }
    } catch {
      setLyriaStatus('Active: Procedural Web Audio Koto & Shakuhachi Synth');
    } finally {
      setLyriaLoading(false);
    }
  };

  const activeWeapon = hud
    ? hud.activeSlot === 'primary'
      ? hud.primaryWeapon
      : hud.activeSlot === 'secondary'
        ? hud.secondaryWeapon
        : hud.rangedWeapon
    : WEAPONS[0];

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#181411] select-none">
      {/* Isolated WebGL 3D Canvas Container */}
      <div ref={canvasMountRef} className="absolute inset-0 w-full h-full" />

      {/* Subtle Washi Paper Grain & Ink Vignette Overlay (pointer-events-none, no backdrop-filter) */}
      <div
        className="fixed inset-0 pointer-events-none z-10"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(24,20,17,0) 58%, rgba(12,9,7,0.68) 100%)',
        }}
      />

      {/* Floating Damage & Parry Callouts */}
      {hud && hud.gameState === 'playing' && !hud.customizerMode && (
        <div className="fixed inset-0 pointer-events-none z-20 overflow-hidden">
          {hud.floatingNumbers.map((ft) => (
            <div
              key={ft.id}
              className="absolute font-display font-bold tracking-wider stroke-numeral"
              style={{
                left: `${ft.x}%`,
                top: `${ft.y}%`,
                color: ft.color,
                fontSize: ft.isCrit ? '22px' : '16px',
                transform: 'translate(-50%, -50%)',
              }}
            >
              {ft.text}
            </div>
          ))}
        </div>
      )}

      {/* ====================================================================
          TITLE SCREEN OVERLAY (35% Left Negative Space Lockup + Live 3D World)
          ==================================================================== */}
      {hud && hud.gameState === 'title' && !hud.customizerMode && (
        <main
          className="fixed inset-0 z-30 flex flex-col justify-between p-8 md:p-12 pointer-events-none"
          style={{
            background:
              'linear-gradient(90deg, rgba(16,13,10,0.92) 0%, rgba(16,13,10,0.74) 36%, rgba(16,13,10,0.18) 54%, rgba(16,13,10,0) 70%), linear-gradient(0deg, rgba(16,13,10,0.82) 0%, rgba(16,13,10,0) 18%)',
          }}
        >
          <div className="max-w-xl pointer-events-auto" data-ui-interactive="true">
            {/* Custom Inline SVG Sumi-e Crest & Title Lockup */}
            <div className="flex items-center gap-4 mb-4">
              <svg
                viewBox="0 0 64 64"
                className="w-14 h-14 shrink-0"
                aria-hidden="true"
              >
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="#991b1b"
                  stroke="#f3ebd9"
                  strokeWidth="2.5"
                />
                <path
                  d="M20 44 L44 16 M26 16 L44 44"
                  stroke="#f3ebd9"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <circle cx="32" cy="32" r="6" fill="#fbbf24" />
              </svg>
              <div>
                <p className="text-xs tracking-[0.2em] text-[#d6c7b2]">
                  紙之刃 · KAMI NO WASHI: BLADE OF THE INK
                </p>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[#f3ebd9] font-display">
                  KAMI-NO-YAIBA
                </h1>
              </div>
            </div>

            <p className="text-sm md:text-base text-[#e2d5c1] leading-relaxed mb-4 max-w-md">
              Explore a seamless, infinite 360° Japanese archipelago streamed across an active
              5×5 CDLOD chunk grid (80m × 80m chunks). Master 35 unified single-edged{' '}
              <em>Shinogi-Zukuri</em> Tamahagane blades with two-handed <em>Morote</em> Inverse
              Kinematics and switch cameras anytime with <strong className="text-[#fbbf24]">[V]</strong>.
            </p>

            {/* Infinite 5x5 Chunk World & 3-Mode Camera Perspective Status Bar */}
            <div className="mb-5 p-3 rounded bg-[#18130f]/90 border border-[#4a3b31] flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-[11px] font-bold text-[#fbbf24] tracking-wider">
                  無境開放世界 · SEAMLESS 5×5 CHUNK OPEN WORLD ({hud.openWorldTelemetry.activeChunkCount} ACTIVE CHUNKS)
                </div>
                <div className="text-xs text-[#d6c7b2] font-mono-num">
                  Region: {hud.openWorldTelemetry.currentBiome.name} ({hud.openWorldTelemetry.currentBiome.kanji}) · Camera: {hud.cameraModeLabel}
                </div>
              </div>
              <button
                type="button"
                data-camera-toggle="true"
                onClick={(e) => {
                  e.currentTarget.blur();
                  engineRef.current?.cycleCameraMode();
                }}
                className="px-3 py-1.5 text-xs font-semibold bg-[#292018] hover:bg-[#3a2d22] text-[#fbbf24] border border-[#fbbf24]/80 rounded cursor-pointer whitespace-nowrap"
              >
                [V] Switch CameraMode
              </button>
            </div>

            {/* Primary CTA + Dojo Training Mode + 3D Face Customizer + 35-Weapon Armory */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                data-start="true"
                onClick={(e) => {
                  e.currentTarget.blur();
                  engineRef.current?.startGame();
                }}
                className="px-5 py-3 text-sm font-bold tracking-wider text-[#f3ebd9] bg-[#991b1b] hover:bg-[#b91c1c] border border-[#fbbf24] rounded transition-transform active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
              >
                Enter Open World [Enter / Space]
              </button>

              <button
                type="button"
                data-dojo="true"
                onClick={(e) => {
                  e.currentTarget.blur();
                  engineRef.current?.startDojoTraining();
                }}
                className="px-4 py-3 text-sm font-semibold text-[#fbbf24] bg-[#261e17] hover:bg-[#362a20] border border-[#fbbf24]/70 rounded transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Dojo Training Mode
              </button>

              <button
                type="button"
                data-customizer="true"
                onClick={(e) => {
                  e.currentTarget.blur();
                  engineRef.current?.setCustomizerMode(true);
                }}
                className="px-4 py-3 text-sm font-semibold text-[#38bdf8] bg-[#17222b] hover:bg-[#1e2f3d] border border-[#38bdf8]/70 rounded transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                3D Face &amp; Body Studio [K]
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur();
                  setArsenalOpen(true);
                }}
                className="px-4 py-3 text-sm font-semibold text-[#f3ebd9] bg-[#241d18] hover:bg-[#332922] border border-[#57493d] rounded transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Armory (35) &amp; Outfits (12)
              </button>

              <button
                type="button"
                data-asset-inspector="true"
                onClick={(e) => {
                  e.currentTarget.blur();
                  handleRefreshTelemetry(assetTargetSlot);
                  setAssetStudioOpen(true);
                }}
                className="px-4 py-3 text-sm font-semibold text-[#a7f3d0] bg-[#14261f] hover:bg-[#1b352b] border border-[#34d399]/70 rounded transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                3D Asset Dropper &amp; Inspector [L]
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur();
                  downloadStandaloneSamuraiHTML();
                }}
                className="px-3.5 py-3 text-xs font-medium text-[#d6c7b2] bg-[#1a1512] hover:text-[#f3ebd9] border border-[#3d322a] rounded transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Export Single-File HTML
              </button>
            </div>
          </div>

          {/* Single Flat Borderless Control-Hint Line in Bottom Safe Margin */}
          <div className="text-xs text-[#d6c7b2] tracking-wide">
            WASD Move · [V] 3-Mode Camera (3rd-Person RPG / 1st-Person FPV / Isometric) · LMB 6-Move Combo · RMB Sekiro Deflect · L 3D Asset Dropper · K 3D Face Studio · Tab Armory (35)
          </div>
        </main>
      )}

      {/* ====================================================================
          PLAYING HUD OVERLAY (>= 85% Unobstructed Viewport, Perimeter Clusters)
          ==================================================================== */}
      {hud && hud.gameState !== 'title' && !hud.customizerMode && (
        <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-4 md:p-6">
          {/* TOP ROW: Left Vitality/Posture/Ki Cluster | Center Boss & Elemental Bar | Right AI Telemetry */}
          <div className="flex items-start justify-between gap-4">
            {/* Top-Left Cluster: Brush-Stroke Vitality, Posture, Ki & Armor Integrity */}
            <div className="sumi-bar-frame px-4 py-3 rounded w-72 shrink-0">
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-[11px] font-semibold tracking-wider text-[#d6c7b2]">
                  INOCHI VITALITY · 体力
                </span>
                <span className="text-lg font-bold font-mono-num stroke-numeral text-[#f3ebd9]">
                  {hud.hp} / {hud.maxHp}
                </span>
              </div>
              <div className="w-full h-3 bg-[#0e0b09] border border-[#4a3b31] relative overflow-hidden mb-2">
                <div
                  className="absolute inset-y-0 left-0 bg-[#fbbf24]/50 transition-all duration-150"
                  style={{ width: `${Math.min(100, (hud.ghostHp / hud.maxHp) * 100)}%` }}
                />
                <div
                  className="absolute inset-y-0 left-0 bg-[#dc2626]"
                  style={{ width: `${Math.min(100, (hud.hp / hud.maxHp) * 100)}%` }}
                />
              </div>

              {/* Posture / Stance Meter */}
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-[10px] font-semibold tracking-wider text-[#fbbf24]">
                  POSTURE · 体幹
                </span>
                <span className="text-xs font-mono-num text-[#fbbf24]">
                  {hud.posture} / {hud.maxPosture}
                </span>
              </div>
              <div className="w-full h-2 bg-[#0e0b09] border border-[#4a3b31] relative overflow-hidden mb-2">
                <div
                  className="h-full bg-[#f59e0b]"
                  style={{ width: `${Math.min(100, (hud.posture / hud.maxPosture) * 100)}%` }}
                />
              </div>

              {/* Ki / Stamina Meter */}
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-[10px] font-semibold tracking-wider text-[#38bdf8]">
                  KI SPIRIT · 気力
                </span>
                <span className="text-xs font-mono-num text-[#38bdf8]">
                  {hud.ki} / {hud.maxKi}
                </span>
              </div>
              <div className="w-full h-2 bg-[#0e0b09] border border-[#4a3b31] relative overflow-hidden mb-2">
                <div
                  className="h-full bg-[#38bdf8]"
                  style={{ width: `${Math.min(100, (hud.ki / hud.maxKi) * 100)}%` }}
                />
              </div>

              {/* 6-Move Combat System & Multi-Physics Readout */}
              <div className="flex items-center justify-between text-[10px] text-[#c7b79e] font-mono-num pt-1 border-t border-[#3d322a]">
                <span>
                  Tech: <strong className="text-[#fbbf24]">{hud.lastDodgeMode.toUpperCase()}</strong>
                  {hud.chronosTimer > 0 ? ` · CHRONOS ${hud.chronosTimer}s` : ''}
                </span>
                <span>Armor {hud.armorIntegrity}% · Bisect {hud.lastBisectedTriCount}△</span>
              </div>
              <div className="mt-1 pt-1 border-t border-[#3d322a]/70 flex items-center justify-between text-[10px] font-mono-num">
                <span className="text-[#fca5a5] truncate">
                  {hud.activeCombatMoveDef.name} ({hud.activeCombatMoveDef.kanji})
                </span>
                <span className="text-[#34d399] shrink-0 ml-1">
                  8-Ray · {hud.cannonRigidBodyCount} Bodies
                </span>
              </div>
              <div className="mt-1 pt-1 border-t border-[#3d322a]/70 flex items-center justify-between text-[10px] font-mono-num text-[#a7f3d0]">
                <span className="truncate">
                  CDLOD {hud.openWorldTelemetry.activeChunkCount} Chunks · {hud.openWorldTelemetry.currentBiome.kanji}
                </span>
                <span className="text-[#38bdf8] shrink-0 ml-1">
                  POM {hud.activePbrBundle?.pomSteps ?? 16}st
                </span>
              </div>
            </div>

            {/* Top-Center: Compact Biome Banner & Boss Health Bar */}
            <div className="flex flex-col items-center max-w-xl w-full">
              <div className="sumi-bar-frame px-3.5 py-1.5 rounded text-center mb-1.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
                <div className="whitespace-nowrap">
                  <p className="text-xs font-semibold text-[#fbbf24] tracking-wide whitespace-nowrap">
                    {hud.isDojoMode
                      ? 'Dojo Training Mode · 稽古道場'
                      : `${hud.openWorldTelemetry.currentBiome.name} · ${hud.openWorldTelemetry.currentBiome.kanji} (${hud.openWorldTelemetry.activeChunkCount} Chunks)`}
                  </p>
                  <p className="text-[10px] text-[#d6c7b2] font-mono-num whitespace-nowrap">
                    {hud.isDojoMode
                      ? `Score ${hud.score} · Combo ${hud.comboCount}x · Honor ${hud.koku} 石`
                      : `Score ${hud.score} · Combo ${hud.comboCount}x · Honor ${hud.koku} 石 · Foes ${hud.enemiesRemaining}`}
                  </p>
                </div>
                {hud.zanshinReady && (
                  <button
                    type="button"
                    data-ui-interactive="true"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      engineRef.current?.triggerZanshinFinisherOrThrowable();
                    }}
                    className="pointer-events-auto px-2 py-0.5 text-[10px] font-bold bg-[#dc2626] text-[#fef3c7] border border-[#fbbf24] rounded cursor-pointer whitespace-nowrap shrink-0"
                  >
                    [F] 残心 ZANSHIN
                  </button>
                )}
                <button
                  type="button"
                  data-ui-interactive="true"
                  data-camera-hud-toggle="true"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    engineRef.current?.cycleCameraMode();
                  }}
                  className="pointer-events-auto px-2 py-0.5 text-[10px] font-semibold bg-[#17222b] hover:bg-[#1e2f3d] text-[#38bdf8] border border-[#38bdf8]/70 rounded cursor-pointer whitespace-nowrap shrink-0"
                >
                  [V] {hud.cameraModeLabel}
                </button>
                <button
                  type="button"
                  data-ui-interactive="true"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    engineRef.current?.triggerKaginawaGrapple();
                  }}
                  className="pointer-events-auto px-2 py-0.5 text-[10px] font-semibold bg-[#292018] hover:bg-[#3a2d22] text-[#fbbf24] border border-[#fbbf24]/60 rounded cursor-pointer whitespace-nowrap shrink-0"
                >
                  [G] 鉤縄 Grapple
                </button>
                <button
                  type="button"
                  data-ui-interactive="true"
                  data-dojo-trainer-toggle="true"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    engineRef.current?.toggleDojoOverlay();
                  }}
                  className={`pointer-events-auto px-2 py-0.5 text-[10px] font-semibold border rounded cursor-pointer whitespace-nowrap shrink-0 ${
                    hud.dojoSnapshot.trainerOpen
                      ? 'bg-[#991b1b] text-[#fef3c7] border-[#fbbf24]'
                      : 'bg-[#1a241e] hover:bg-[#233229] text-[#a7f3d0] border-[#34d399]/60'
                  }`}
                >
                  [T] 稽古 Combo Dojo ({hud.dojoSnapshot.unlockedScrolls.length}/7)
                </button>
                {hud.isDojoMode && (
                  <button
                    type="button"
                    data-ui-interactive="true"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      engineRef.current?.startGame();
                    }}
                    className="pointer-events-auto px-2 py-0.5 text-[10px] font-semibold bg-[#991b1b] hover:bg-[#b91c1c] text-[#f3ebd9] border border-[#fbbf24] rounded cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Enter Campaign
                  </button>
                )}
              </div>

              {/* Bilingual Japanese Voice & Battle Callout Subtitle Banner */}
              {hud.activeDialogueSubtitle && (
                <div className="sumi-bar-frame px-3.5 py-1.5 rounded w-full border-[#fbbf24]/70 mb-1.5 text-center">
                  <div className="text-[10px] text-[#fbbf24] font-semibold tracking-wider">
                    {hud.activeDialogueSubtitle.speaker} · {hud.activeDialogueSubtitle.japaneseKanji}
                  </div>
                  <div className="text-xs font-bold text-[#f3ebd9]">
                    “{hud.activeDialogueSubtitle.romaji}”
                  </div>
                  <div className="text-[11px] text-[#c7b79e] italic">
                    {hud.activeDialogueSubtitle.english}
                  </div>
                </div>
              )}

              {hud.bossActive && (
                <div className="sumi-bar-frame px-3.5 py-1.5 rounded w-full border-[#dc2626] flex items-center gap-2.5">
                  {artworkMap[`boss_${hud.stageDef.boss.id}`] && (
                    <img
                      src={artworkMap[`boss_${hud.stageDef.boss.id}`]}
                      alt={hud.bossName}
                      className="w-9 h-9 rounded border border-[#fbbf24] object-cover shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between mb-0.5">
                      <div className="truncate">
                        <span className="text-xs font-bold font-display text-[#f3ebd9] mr-2">
                          {hud.bossName}
                        </span>
                        <span className="text-[11px] text-[#fca5a5]">{hud.bossKanji}</span>
                      </div>
                      <span className="text-[11px] font-mono-num text-[#f3ebd9] shrink-0 ml-2">
                        {hud.bossHp} / {hud.bossMaxHp}
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-[#0e0b09] border border-[#7f1d1d] overflow-hidden mb-0.5">
                      <div
                        className="h-full bg-[#dc2626]"
                        style={{
                          width: `${Math.min(100, (hud.bossHp / Math.max(1, hud.bossMaxHp)) * 100)}%`,
                        }}
                      />
                    </div>
                    <div className="w-full h-1 bg-[#0e0b09] overflow-hidden">
                      <div
                        className="h-full bg-[#fbbf24]"
                        style={{
                          width: `${Math.min(100, (hud.bossPosture / Math.max(1, hud.bossMaxPosture)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Top-Right Cluster: Live AI Adaptation Telemetry + Compact Utility Buttons */}
            <div className="flex flex-col items-end gap-2 shrink-0">
              <div className="flex items-center gap-1.5 pointer-events-auto" data-ui-interactive="true">
                <button
                  type="button"
                  tabIndex={-1}
                  data-asset-inspector="true"
                  aria-label="Open Live 3D Asset Inspector and Dropper"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    handleRefreshTelemetry(assetTargetSlot);
                    setAssetStudioOpen((p) => !p);
                    setArsenalOpen(false);
                    setShogunPanelOpen(false);
                  }}
                  className="px-2.5 py-2 sumi-bar-frame rounded text-xs font-medium text-[#34d399] hover:border-[#34d399] cursor-pointer whitespace-nowrap shrink-0"
                >
                  3D Assets [L]
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    engineRef.current?.setCustomizerMode(true);
                  }}
                  className="px-2.5 py-2 sumi-bar-frame rounded text-xs font-medium text-[#38bdf8] hover:border-[#38bdf8] cursor-pointer whitespace-nowrap shrink-0"
                >
                  3D Face [K]
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label="Open Arsenal Customization"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    setArsenalOpen((p) => !p);
                    setShogunPanelOpen(false);
                    setAssetStudioOpen(false);
                  }}
                  className="px-2.5 py-2 sumi-bar-frame rounded text-xs font-medium text-[#f3ebd9] hover:border-[#fbbf24] cursor-pointer whitespace-nowrap shrink-0"
                >
                  Armory (35) [Tab]
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label="Open Shogun AI Tactician and Lyria Music"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    setShogunPanelOpen((p) => !p);
                    setArsenalOpen(false);
                    setAssetStudioOpen(false);
                  }}
                  className="px-2.5 py-2 sumi-bar-frame rounded text-xs font-medium text-[#fbbf24] hover:border-[#fbbf24] cursor-pointer whitespace-nowrap shrink-0"
                >
                  Shogun AI [N]
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={isMuted ? 'Unmute Audio' : 'Mute Audio'}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    if (engineRef.current) {
                      const next = !engineRef.current.audio.getMuted();
                      engineRef.current.audio.setMuted(next);
                      setIsMuted(next);
                    }
                  }}
                  className="w-9 h-9 sumi-bar-frame rounded flex items-center justify-center text-xs text-[#f3ebd9] hover:border-[#fbbf24] cursor-pointer"
                >
                  {isMuted ? '🔇' : '🔊'}
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label="Pause Game"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    engineRef.current?.togglePause();
                  }}
                  className="w-9 h-9 sumi-bar-frame rounded flex items-center justify-center text-xs font-bold text-[#f3ebd9] hover:border-[#fbbf24] cursor-pointer"
                >
                  II
                </button>
              </div>

              {/* Live Adaptive AI Telemetry Panel */}
              <div className="sumi-bar-frame px-3.5 py-2.5 rounded w-72 text-xs">
                <div className="flex items-center justify-between border-b border-[#3d322a] pb-1 mb-1.5">
                  <span className="font-semibold text-[#fbbf24]">
                    AI ADAPTATION STATE
                  </span>
                  <span className="font-mono-num text-[11px] text-[#d6c7b2]">
                    Tier {hud.aiSnapshot.learningTier.toFixed(2)}x
                  </span>
                </div>
                <p className="text-[11px] text-[#f3ebd9] font-medium mb-0.5">
                  {hud.aiSnapshot.activePostureStance}
                </p>
                <p className="text-[11px] text-[#fbbf24] font-semibold tracking-wide mb-1.5">
                  {hud.aiSnapshot.activeCounterCallout}
                </p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-[#c7b79e] font-mono-num">
                  <div>Melee Spam: {Math.round(hud.aiSnapshot.meleeSpamRate * 100)}%</div>
                  <div>Auto-Parry: {Math.round(hud.aiSnapshot.autoParryProb * 100)}%</div>
                  <div>Ranged Rel: {Math.round(hud.aiSnapshot.rangedDependency * 100)}%</div>
                  <div>Zig-Zag Dash: {Math.round(hud.aiSnapshot.zigZagSprintProb * 100)}%</div>
                  <div>Parry Acc: {Math.round(hud.aiSnapshot.parryTimingAccuracy * 100)}%</div>
                  <div>
                    Dodge: {hud.aiSnapshot.preferredDodgeVector.toUpperCase()} (
                    {Math.round(hud.aiSnapshot.dodgePredictProb * 100)}%)
                  </div>
                </div>
                <div className="mt-1.5 pt-1 border-t border-[#3d322a] text-[10px] font-mono-num text-[#a7f3d0] truncate">
                  T_player = [
                  {[
                    hud.aiSnapshot.meleeSpamRate,
                    hud.aiSnapshot.rangedDependency,
                    hud.aiSnapshot.dodgePredictProb,
                    hud.aiSnapshot.parryTimingAccuracy,
                    hud.aiSnapshot.jumpFrequency,
                  ]
                    .map((v: number) => v.toFixed(2))
                    .join(', ')}
                  ]
                </div>
              </div>
            </div>
          </div>

          {/* ====================================================================
              INTERACTIVE COMBO DOJO & HOLOGRAPHIC GHOST MASTER TRAINER ([T] Key)
              ==================================================================== */}
          {hud.dojoSnapshot.trainerOpen && (
            <aside
              aria-label="Interactive Combo Dojo and Martial Arts Trainer"
              data-ui-interactive="true"
              className="pointer-events-auto self-start sumi-bar-frame rounded p-3.5 w-80 md:w-96 text-xs text-[#f3ebd9] border border-[#fbbf24]/70 my-1"
            >
              <div className="flex items-center justify-between border-b border-[#3d322a] pb-2 mb-2">
                <div>
                  <div className="text-[10px] font-bold tracking-wider text-[#fbbf24]">
                    稽古道場 · HOLOGRAPHIC GHOST MASTER DOJO
                  </div>
                  <div className="text-xs font-bold font-display">
                    Step-by-Step 7-Move Curriculum ({hud.dojoSnapshot.unlockedScrolls.length}/7 Mastered)
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => engineRef.current?.toggleGhostSlowMotion()}
                    className="px-2 py-0.5 text-[10px] bg-[#241d18] hover:bg-[#332922] border border-[#fbbf24]/60 text-[#fbbf24] rounded cursor-pointer"
                  >
                    Ghost {hud.dojoSnapshot.ghostMasterSlowMoSpeed}×
                  </button>
                  <button
                    type="button"
                    onClick={() => engineRef.current?.toggleDojoOverlay(false)}
                    className="px-2 py-0.5 text-[10px] bg-[#991b1b] text-[#f3ebd9] rounded cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Active Lesson Prompt & Key Sequence */}
              <div className="p-2 rounded bg-[#14100d] border border-[#3d322a] mb-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-[#fbbf24]">
                    Lesson {hud.dojoSnapshot.activeLesson.stepNumber}:{' '}
                    {hud.dojoSnapshot.activeLesson.name} ({hud.dojoSnapshot.activeLesson.kanji})
                  </span>
                  <span className="font-mono-num text-[11px] text-[#34d399]">
                    {hud.dojoSnapshot.lessonProgress[hud.dojoSnapshot.activeLesson.id]?.repsCompleted ?? 0}/
                    {hud.dojoSnapshot.activeLesson.requiredReps} [✓]
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1 mb-1">
                  {hud.dojoSnapshot.activeLesson.keySequencePrompts.map((badge: string, bIdx: number) => (
                    <span
                      key={bIdx}
                      className="px-1.5 py-0.5 text-[10px] font-mono-num font-bold bg-[#292018] text-[#fef3c7] border border-[#fbbf24]/60 rounded"
                    >
                      {badge}
                    </span>
                  ))}
                  <span className="text-[10px] text-[#38bdf8] ml-auto font-mono-num">
                    DPS: {hud.dojoSnapshot.liveDps}
                  </span>
                </div>
                <p className="text-[11px] text-[#c7b79e] leading-snug">
                  {hud.dojoSnapshot.activeLesson.timingHint}
                </p>
              </div>

              {/* Visual Rhythm & Frame-Window Timing Bar */}
              <div className="mb-2">
                <div className="flex items-center justify-between text-[10px] font-mono-num mb-1">
                  <span className="text-[#d6c7b2]">
                    FRAME TIMING BAR: <strong className="text-[#fbbf24]">{hud.dojoSnapshot.currentPhase.toUpperCase()}</strong>
                  </span>
                  <span className="text-[#a7f3d0] truncate max-w-[160px]">
                    {hud.dojoSnapshot.lastTimingGrade}
                  </span>
                </div>
                <div className="w-full h-3 bg-[#0e0b09] border border-[#4a3b31] rounded overflow-hidden relative flex">
                  <div className="h-full bg-[#ef4444]/60" style={{ width: '25%' }} title="Startup Windup" />
                  <div className="h-full bg-[#f59e0b]/80" style={{ width: '37%' }} title="Active Blade Hit" />
                  <div className="h-full bg-[#10b981]/90" style={{ width: '20%' }} title="Golden Cancel Window" />
                  <div className="h-full bg-[#3b82f6]/50" style={{ width: '18%' }} title="Recovery" />
                  <div
                    className="absolute inset-y-0 w-1.5 bg-white shadow"
                    style={{
                      left: `${Math.min(98, Math.round(hud.dojoSnapshot.frameCursorNormalized * 100))}%`,
                    }}
                  />
                </div>
              </div>

              {/* 7-Lesson Selector Strip with Completion Checkmarks */}
              <div className="grid grid-cols-2 gap-1 max-h-28 overflow-y-auto pr-0.5">
                {DOJO_CURRICULUM_LESSONS.map((lesson, idx) => {
                  const prog = hud.dojoSnapshot.lessonProgress[lesson.id as DojoLessonId];
                  const isCurrent = hud.dojoSnapshot.activeLessonIndex === idx;
                  return (
                    <button
                      key={lesson.id}
                      type="button"
                      onClick={() => engineRef.current?.selectDojoLesson(idx)}
                      className={`px-2 py-1 rounded text-left text-[10px] border flex items-center justify-between cursor-pointer ${
                        isCurrent
                          ? 'bg-[#991b1b]/85 border-[#fbbf24] text-[#fef3c7]'
                          : prog?.mastered
                            ? 'bg-[#14261f] border-[#34d399]/60 text-[#a7f3d0]'
                            : 'bg-[#181310] border-[#3d322a] text-[#c7b79e]'
                      }`}
                    >
                      <span className="truncate">
                        {prog?.mastered ? '[✓] ' : `${lesson.stepNumber}. `}
                        {lesson.name}
                      </span>
                      <span className="font-mono-num ml-1 shrink-0">
                        {prog?.repsCompleted ?? 0}/{lesson.requiredReps}
                      </span>
                    </button>
                  );
                })}
              </div>
            </aside>
          )}

          {/* BOTTOM COLLAPSIBLE WEAPON, NINJUTSU & 5 ELEMENTAL INFUSIONS DOCK */}
          <div className="self-center flex flex-col items-center pointer-events-auto" data-ui-interactive="true">
            <div className="flex items-center gap-1 mb-0.5">
              {ELEMENTAL_INFUSIONS.filter((inf) => inf.id !== 'none').map((inf) => {
                const active = hud.activeInfusion === inf.id;
                return (
                  <button
                    key={inf.id}
                    type="button"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      engineRef.current?.toggleElementalInfusion(inf.id);
                    }}
                    className={`px-2 py-0.5 rounded-t text-[10px] font-semibold border border-b-0 transition-colors cursor-pointer whitespace-nowrap ${
                      active
                        ? 'bg-[#991b1b] text-[#fef3c7] border-[#fbbf24]'
                        : 'bg-[#181411] text-[#c7b79e] border-[#4a3b31] hover:text-[#f3ebd9]'
                    }`}
                  >
                    [{inf.hotkey}] {inf.kanji.split('・')[0]} {inf.name.split(' ')[0]}
                  </button>
                );
              })}
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  setDockCollapsed((c) => !c);
                }}
                className="px-2.5 py-0.5 text-[10px] bg-[#181411] text-[#d6c7b2] border border-b-0 border-[#4a3b31] rounded-t cursor-pointer hover:text-[#f3ebd9]"
              >
                {dockCollapsed ? '▴ Dock [H]' : '▾ Hide [H]'}
              </button>
            </div>

            {!dockCollapsed && (
              <div className="sumi-bar-frame px-4 py-2 rounded flex flex-wrap items-center gap-2.5 max-w-[95vw]">
                {/* Primary Bladed Slot */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    engineRef.current?.equipWeapon(hud.primaryWeapon.id);
                  }}
                  className={`px-2.5 py-1.5 rounded text-left border transition-colors cursor-pointer flex items-center gap-2.5 ${
                    hud.activeSlot === 'primary'
                      ? 'bg-[#991b1b]/80 border-[#fbbf24] text-[#f3ebd9]'
                      : 'bg-[#1a1411] border-[#3d322a] text-[#c7b79e]'
                  }`}
                >
                  {artworkMap[hud.primaryWeapon.id] && (
                    <img
                      src={artworkMap[hud.primaryWeapon.id]}
                      alt={hud.primaryWeapon.name}
                      className="w-9 h-9 rounded border border-[#fbbf24]/70 object-cover shrink-0"
                    />
                  )}
                  <div>
                    <div className="text-[10px] text-[#fbbf24]">[Q/E] Primary Blade</div>
                    <div className="text-xs font-semibold whitespace-nowrap">
                      {hud.primaryWeapon.name} ({hud.primaryWeapon.kanji})
                    </div>
                  </div>
                </button>

                {/* Secondary Polearm/Heavy Slot */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    engineRef.current?.equipWeapon(hud.secondaryWeapon.id);
                  }}
                  className={`px-2.5 py-1.5 rounded text-left border transition-colors cursor-pointer flex items-center gap-2.5 ${
                    hud.activeSlot === 'secondary'
                      ? 'bg-[#991b1b]/80 border-[#fbbf24] text-[#f3ebd9]'
                      : 'bg-[#1a1411] border-[#3d322a] text-[#c7b79e]'
                  }`}
                >
                  {artworkMap[hud.secondaryWeapon.id] && (
                    <img
                      src={artworkMap[hud.secondaryWeapon.id]}
                      alt={hud.secondaryWeapon.name}
                      className="w-9 h-9 rounded border border-[#38bdf8]/70 object-cover shrink-0"
                    />
                  )}
                  <div>
                    <div className="text-[10px] text-[#38bdf8]">[Q/E] Polearm / Heavy</div>
                    <div className="text-xs font-semibold whitespace-nowrap">
                      {hud.secondaryWeapon.name} ({hud.secondaryWeapon.kanji})
                    </div>
                  </div>
                </button>

                {/* Ranged Slot */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    engineRef.current?.equipWeapon(hud.rangedWeapon.id);
                  }}
                  className={`px-2.5 py-1.5 rounded text-left border transition-colors cursor-pointer flex items-center gap-2.5 ${
                    hud.activeSlot === 'ranged'
                      ? 'bg-[#991b1b]/80 border-[#fbbf24] text-[#f3ebd9]'
                      : 'bg-[#1a1411] border-[#3d322a] text-[#c7b79e]'
                  }`}
                >
                  {artworkMap[hud.rangedWeapon.id] && (
                    <img
                      src={artworkMap[hud.rangedWeapon.id]}
                      alt={hud.rangedWeapon.name}
                      className="w-9 h-9 rounded border border-[#4ade80]/70 object-cover shrink-0"
                    />
                  )}
                  <div>
                    <div className="text-[10px] text-[#4ade80]">[Q/E] Ranged</div>
                    <div className="text-xs font-semibold whitespace-nowrap">
                      {hud.rangedWeapon.name} ({hud.rangedWeapon.kanji})
                    </div>
                  </div>
                </button>

                {/* Throwable Ninjutsu Quick-Tool ([F / R] Key) */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    engineRef.current?.triggerThrowableTool();
                  }}
                  className="px-2.5 py-1.5 rounded text-left bg-[#241c17] border border-[#78350f] hover:border-[#fbbf24] text-[#f3ebd9] cursor-pointer flex items-center gap-2.5"
                >
                  {artworkMap[hud.equippedThrowable.id] && (
                    <img
                      src={artworkMap[hud.equippedThrowable.id]}
                      alt={hud.equippedThrowable.name}
                      className="w-9 h-9 rounded border border-[#fbbf24]/70 object-cover shrink-0"
                    />
                  )}
                  <div>
                    <div className="text-[10px] text-[#fbbf24] font-mono-num">
                      [F/R] Ninjutsu · Stock {hud.throwableStock}/{hud.equippedThrowable.maxStock}
                      {hud.throwableCooldown > 0 ? ` (${hud.throwableCooldown}s)` : ''}
                    </div>
                    <div className="text-xs font-semibold whitespace-nowrap">
                      {hud.equippedThrowable.name}
                    </div>
                  </div>
                </button>

                {/* Active Armor & Kabuto Summary */}
                <div className="hidden xl:flex items-center gap-2 pl-2 border-l border-[#3d322a] text-xs text-[#d6c7b2]">
                  {artworkMap[`armor_${hud.equippedArmor.id}`] && (
                    <img
                      src={artworkMap[`armor_${hud.equippedArmor.id}`]}
                      alt={hud.equippedArmor.name}
                      className="w-8 h-8 rounded border border-[#fbbf24]/50 object-cover"
                    />
                  )}
                  <div>
                    <div>
                      Outfit: <strong className="text-[#f3ebd9]">{hud.equippedArmor.name}</strong> · Def{' '}
                      <span className="font-mono-num">{hud.computedStats.defensePercent}%</span>
                    </div>
                    <div>
                      Kabuto: <strong className="text-[#f3ebd9]">{hud.equippedHelmet.name}</strong> · Atk{' '}
                      <span className="font-mono-num">{hud.computedStats.attackPower}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ====================================================================
          INTERACTIVE 3D CHARACTER & FACE CUSTOMIZATION STUDIO ([K] Key / Button)
          Docked on Right so Live 3D Zoomed-In Samurai Face is Clear on Left!
          ==================================================================== */}
      {hud && hud.customizerMode && (
        <aside
          aria-label="3D Samurai Face and Body Customization Studio"
          className="fixed inset-y-0 right-0 z-40 w-full max-w-md washi-card border-l border-[#fbbf24]/60 p-5 flex flex-col justify-between overflow-y-auto text-[#f3ebd9]"
          data-ui-interactive="true"
        >
          <div>
            <div className="flex items-center justify-between border-b border-[#3d322a] pb-3 mb-3">
              <div>
                <p className="text-[10px] tracking-[0.2em] text-[#38bdf8]">
                  64×64 ANATOMICAL SSS SKIN &amp; CRANIAL RIG
                </p>
                <h2 className="text-lg font-bold font-display text-[#f3ebd9]">
                  3D Face &amp; Body Customization Studio
                </h2>
              </div>
              <button
                type="button"
                onClick={() => engineRef.current?.setCustomizerMode(false)}
                className="px-3 py-1.5 text-xs font-bold bg-[#991b1b] hover:bg-[#b91c1c] border border-[#fbbf24] rounded cursor-pointer"
              >
                Done [K / Esc]
              </button>
            </div>

            {/* Camera Orbit & Helmet Toggle */}
            <div className="flex items-center justify-between gap-2 mb-4 bg-[#14100d] p-2.5 rounded border border-[#3d322a]">
              <button
                type="button"
                onClick={() => engineRef.current?.rotateCustomizerView(-0.4)}
                className="px-2.5 py-1 text-xs bg-[#261e18] hover:bg-[#362b22] rounded border border-[#4a3b31] cursor-pointer"
              >
                ⟲ Rotate Left
              </button>
              <button
                type="button"
                onClick={() =>
                  engineRef.current?.updateAppearance({
                    hideHelmetInGameplay: !hud.appearance.hideHelmetInGameplay,
                  })
                }
                className="px-2.5 py-1 text-xs font-semibold bg-[#292018] text-[#fbbf24] rounded border border-[#fbbf24]/50 cursor-pointer"
              >
                {hud.appearance.hideHelmetInGameplay ? 'Show Kabuto Helmet' : 'Hide Kabuto Helmet'}
              </button>
              <button
                type="button"
                onClick={() => engineRef.current?.rotateCustomizerView(0.4)}
                className="px-2.5 py-1 text-xs bg-[#261e18] hover:bg-[#362b22] rounded border border-[#4a3b31] cursor-pointer"
              >
                Rotate Right ⟳
              </button>
            </div>

            {/* 8 Morphological Sliders */}
            <div className="space-y-2.5 mb-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-[#d6c7b2] flex justify-between">
                    <span>Jawline Width</span>
                    <span className="font-mono-num text-[#fbbf24]">
                      {hud.appearance.jawWidth.toFixed(2)}×
                    </span>
                  </span>
                  <input
                    type="range"
                    min="0.8"
                    max="1.3"
                    step="0.02"
                    value={hud.appearance.jawWidth}
                    onChange={(e) =>
                      engineRef.current?.updateAppearance({ jawWidth: Number(e.target.value) })
                    }
                    className="w-full accent-[#fbbf24]"
                  />
                </label>

                <label className="block">
                  <span className="text-[#d6c7b2] flex justify-between">
                    <span>Cheekbones</span>
                    <span className="font-mono-num text-[#fbbf24]">
                      {hud.appearance.cheekboneProminence.toFixed(2)}×
                    </span>
                  </span>
                  <input
                    type="range"
                    min="0.8"
                    max="1.3"
                    step="0.02"
                    value={hud.appearance.cheekboneProminence}
                    onChange={(e) =>
                      engineRef.current?.updateAppearance({
                        cheekboneProminence: Number(e.target.value),
                      })
                    }
                    className="w-full accent-[#fbbf24]"
                  />
                </label>

                <label className="block">
                  <span className="text-[#d6c7b2] flex justify-between">
                    <span>Chin Length</span>
                    <span className="font-mono-num text-[#fbbf24]">
                      {hud.appearance.chinLength.toFixed(2)}×
                    </span>
                  </span>
                  <input
                    type="range"
                    min="0.85"
                    max="1.25"
                    step="0.02"
                    value={hud.appearance.chinLength}
                    onChange={(e) =>
                      engineRef.current?.updateAppearance({ chinLength: Number(e.target.value) })
                    }
                    className="w-full accent-[#fbbf24]"
                  />
                </label>

                <label className="block">
                  <span className="text-[#d6c7b2] flex justify-between">
                    <span>Nose Bridge</span>
                    <span className="font-mono-num text-[#fbbf24]">
                      {hud.appearance.noseBridgeHeight.toFixed(2)}×
                    </span>
                  </span>
                  <input
                    type="range"
                    min="0.8"
                    max="1.3"
                    step="0.02"
                    value={hud.appearance.noseBridgeHeight}
                    onChange={(e) =>
                      engineRef.current?.updateAppearance({
                        noseBridgeHeight: Number(e.target.value),
                      })
                    }
                    className="w-full accent-[#fbbf24]"
                  />
                </label>

                <label className="block">
                  <span className="text-[#d6c7b2] flex justify-between">
                    <span>Brow Angle</span>
                    <span className="font-mono-num text-[#fbbf24]">
                      {hud.appearance.browAngle.toFixed(2)}
                    </span>
                  </span>
                  <input
                    type="range"
                    min="-0.3"
                    max="0.3"
                    step="0.02"
                    value={hud.appearance.browAngle}
                    onChange={(e) =>
                      engineRef.current?.updateAppearance({ browAngle: Number(e.target.value) })
                    }
                    className="w-full accent-[#fbbf24]"
                  />
                </label>

                <label className="block">
                  <span className="text-[#d6c7b2] flex justify-between">
                    <span>Eye Size &amp; Tilt</span>
                    <span className="font-mono-num text-[#fbbf24]">
                      {hud.appearance.eyeSizeTilt.toFixed(2)}×
                    </span>
                  </span>
                  <input
                    type="range"
                    min="0.85"
                    max="1.25"
                    step="0.02"
                    value={hud.appearance.eyeSizeTilt}
                    onChange={(e) =>
                      engineRef.current?.updateAppearance({ eyeSizeTilt: Number(e.target.value) })
                    }
                    className="w-full accent-[#fbbf24]"
                  />
                </label>

                <label className="block">
                  <span className="text-[#d6c7b2] flex justify-between">
                    <span>Body Height</span>
                    <span className="font-mono-num text-[#fbbf24]">
                      {hud.appearance.bodyHeight.toFixed(2)}m
                    </span>
                  </span>
                  <input
                    type="range"
                    min="1.65"
                    max="2.0"
                    step="0.02"
                    value={hud.appearance.bodyHeight}
                    onChange={(e) =>
                      engineRef.current?.updateAppearance({ bodyHeight: Number(e.target.value) })
                    }
                    className="w-full accent-[#fbbf24]"
                  />
                </label>

                <label className="block">
                  <span className="text-[#d6c7b2] flex justify-between">
                    <span>Muscularity</span>
                    <span className="font-mono-num text-[#fbbf24]">
                      {hud.appearance.muscularity.toFixed(2)}×
                    </span>
                  </span>
                  <input
                    type="range"
                    min="0.85"
                    max="1.35"
                    step="0.02"
                    value={hud.appearance.muscularity}
                    onChange={(e) =>
                      engineRef.current?.updateAppearance({ muscularity: Number(e.target.value) })
                    }
                    className="w-full accent-[#fbbf24]"
                  />
                </label>
              </div>
            </div>

            {/* 8 Skin Complexions */}
            <div className="mb-3">
              <p className="text-xs font-semibold text-[#fbbf24] mb-1">
                Subsurface Scattering (SSS) Skin Complexion (8)
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {SKIN_COMPLEXIONS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => engineRef.current?.updateAppearance({ skinComplexion: s.id })}
                    className={`px-2 py-1 text-[11px] rounded border text-left cursor-pointer ${
                      hud.appearance.skinComplexion === s.id
                        ? 'bg-[#991b1b] border-[#fbbf24] text-[#f3ebd9]'
                        : 'bg-[#1a1411] border-[#3d322a] text-[#c7b79e]'
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>

            {/* 10 Hairstyles & 12 Eye Iris Colors (Heterochromia) */}
            <div className="grid grid-cols-2 gap-2.5 mb-3 text-xs">
              <label className="block">
                <span className="text-[#fbbf24] font-semibold block mb-1">
                  3D Hairstyle (10)
                </span>
                <select
                  value={hud.appearance.hairstyle}
                  onChange={(e) =>
                    engineRef.current?.updateAppearance({
                      hairstyle: e.target.value as typeof hud.appearance.hairstyle,
                    })
                  }
                  className="w-full bg-[#1a1411] border border-[#4a3b31] rounded px-2 py-1.5 text-xs text-[#f3ebd9]"
                >
                  {HAIRSTYLES.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.kanji})
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-[#fbbf24] font-semibold block mb-1">
                  Facial Hair (5)
                </span>
                <select
                  value={hud.appearance.facialHair}
                  onChange={(e) =>
                    engineRef.current?.updateAppearance({
                      facialHair: e.target.value as typeof hud.appearance.facialHair,
                    })
                  }
                  className="w-full bg-[#1a1411] border border-[#4a3b31] rounded px-2 py-1.5 text-xs text-[#f3ebd9]"
                >
                  {FACIAL_HAIRS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-[#fbbf24] font-semibold block mb-1">
                  Left Eye Iris (12)
                </span>
                <select
                  value={hud.appearance.leftEyeColor}
                  onChange={(e) =>
                    engineRef.current?.updateAppearance({
                      leftEyeColor: e.target.value as typeof hud.appearance.leftEyeColor,
                    })
                  }
                  className="w-full bg-[#1a1411] border border-[#4a3b31] rounded px-2 py-1.5 text-xs text-[#f3ebd9]"
                >
                  {EYE_IRIS_COLORS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-[#fbbf24] font-semibold block mb-1">
                  Right Eye Iris (Heterochromia)
                </span>
                <select
                  value={hud.appearance.rightEyeColor}
                  onChange={(e) =>
                    engineRef.current?.updateAppearance({
                      rightEyeColor: e.target.value as typeof hud.appearance.rightEyeColor,
                    })
                  }
                  className="w-full bg-[#1a1411] border border-[#4a3b31] rounded px-2 py-1.5 text-xs text-[#f3ebd9]"
                >
                  {EYE_IRIS_COLORS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-[#fbbf24] font-semibold block mb-1">
                  Scars &amp; Eyepatch (5)
                </span>
                <select
                  value={hud.appearance.scarOrEyepatch}
                  onChange={(e) =>
                    engineRef.current?.updateAppearance({
                      scarOrEyepatch: e.target.value as typeof hud.appearance.scarOrEyepatch,
                    })
                  }
                  className="w-full bg-[#1a1411] border border-[#4a3b31] rounded px-2 py-1.5 text-xs text-[#f3ebd9]"
                >
                  {SCAR_ACCESSORIES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-[#fbbf24] font-semibold block mb-1">
                  Irezumi Tattoos &amp; Paint (4)
                </span>
                <select
                  value={hud.appearance.tattooOrPaint}
                  onChange={(e) =>
                    engineRef.current?.updateAppearance({
                      tattooOrPaint: e.target.value as typeof hud.appearance.tattooOrPaint,
                    })
                  }
                  className="w-full bg-[#1a1411] border border-[#4a3b31] rounded px-2 py-1.5 text-xs text-[#f3ebd9]"
                >
                  {TATTOO_PAINTS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#3d322a]">
            <button
              type="button"
              onClick={() => engineRef.current?.updateAppearance(DEFAULT_CHARACTER_APPEARANCE)}
              className="px-3 py-2 text-xs bg-[#241d18] hover:bg-[#332922] border border-[#4a3b31] rounded cursor-pointer"
            >
              Reset Default
            </button>
            <button
              type="button"
              onClick={() => engineRef.current?.setCustomizerMode(false)}
              className="flex-1 py-2 text-xs font-bold bg-[#991b1b] hover:bg-[#b91c1c] border border-[#fbbf24] rounded cursor-pointer"
            >
              Save &amp; Return to Battle
            </button>
          </div>
        </aside>
      )}

      {/* ====================================================================
          ARMORY, FORGE & UKIYO-E / AI ARTWORK STUDIO MODAL ([Tab] or [I])
          ==================================================================== */}
      {arsenalOpen && hud && (
        <dialog
          open
          aria-label="Equipment, Armor, and Ukiyo-e AI Artwork Studio"
          className="fixed inset-0 z-40 w-full h-full bg-black/80 flex items-center justify-center p-4"
          data-ui-interactive="true"
        >
          <div className="washi-card rounded-lg max-w-6xl w-full max-h-[90vh] flex flex-col overflow-hidden text-[#f3ebd9]">
            <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-4 border-b border-[#3d322a]">
              <div>
                <h2 className="text-xl font-bold font-display text-[#f3ebd9]">
                  Samurai Armory (35 Weapons), 12 Outfit Sets &amp; Ukiyo-e AI Art Studio
                </h2>
                <p className="text-xs text-[#c7b79e]">
                  Active: {activeWeapon.name} · {hud.equippedArmor.name} · {hud.equippedHelmet.name} —
                  Atk {hud.computedStats.attackPower} · Posture Break {hud.computedStats.postureBreakPower} ·
                  Defense {hud.computedStats.defensePercent}% · Honor {hud.koku} 石
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleBatchSynthesizeLoadout}
                  disabled={Boolean(synthesizingId)}
                  className="px-3 py-1.5 text-xs font-semibold bg-[#78350f] hover:bg-[#92400e] border border-[#fbbf24] rounded text-[#fef3c7] cursor-pointer disabled:opacity-50"
                >
                  {synthesizingId === 'batch_loadout'
                    ? 'Synthesizing Loadout...'
                    : 'Batch Synthesize Equipped Loadout'}
                </button>
                <button
                  type="button"
                  onClick={() => downloadStandaloneSamuraiHTML()}
                  className="px-3 py-1.5 text-xs font-semibold bg-[#29201a] hover:bg-[#3a2e25] border border-[#fbbf24]/50 rounded text-[#fbbf24] cursor-pointer"
                >
                  Download Single-File HTML
                </button>
                <button
                  type="button"
                  onClick={() => setArsenalOpen(false)}
                  className="px-4 py-1.5 text-xs font-semibold bg-[#991b1b] hover:bg-[#b91c1c] rounded text-[#f3ebd9] cursor-pointer"
                >
                  Close [Tab]
                </button>
              </div>
            </div>

            {/* Artistic Theme Selector & Pipeline Status Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-2.5 bg-[#1b1511] border-b border-[#3d322a]">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-semibold text-[#fbbf24] mr-1">
                  Scroll Art Theme:
                </span>
                {ARTWORK_THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => handleSelectArtTheme(theme.id)}
                    className={`px-2.5 py-1 text-xs rounded cursor-pointer transition-colors ${
                      artTheme === theme.id
                        ? 'bg-[#fbbf24] text-[#181411] font-bold'
                        : 'bg-[#261e18] text-[#d6c7b2] hover:text-[#f3ebd9]'
                    }`}
                  >
                    {theme.name} ({theme.kanji})
                  </button>
                ))}
              </div>
              <span className="text-[11px] text-[#d6c7b2] font-mono-num">
                {artStudioBanner}
              </span>
            </div>

            {/* Category Tabs */}
            <div className="flex flex-wrap items-center gap-2 px-6 py-2.5 bg-[#14100d] border-b border-[#3d322a]">
              {(
                [
                  ['weapons', '30 Primary, Polearm, Exotic & Siege Weapons'],
                  ['throwables', '5 Tactical Ninja Tools (F / R Key)'],
                  ['armor', '12 Complete Mix-and-Match Outfit Sets'],
                  ['helmets', '5 Kabuto Helmets, Woven Kasa & Maedate'],
                  ['compendium_studio', '35-Weapon Master Compendium & AI Studio'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setArsenalTab(key)}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer whitespace-nowrap ${
                    arsenalTab === key
                      ? 'bg-[#991b1b] text-[#f3ebd9] border border-[#fbbf24]'
                      : 'bg-[#211a15] text-[#c7b79e] hover:text-[#f3ebd9]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Item Grid with 2D Ukiyo-e + 3D Studio Artwork Cards */}
            <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {arsenalTab === 'weapons' &&
                WEAPONS.map((w) => {
                  const isEquipped =
                    hud.primaryWeapon.id === w.id ||
                    hud.secondaryWeapon.id === w.id ||
                    hud.rangedWeapon.id === w.id;
                  return (
                    <div
                      key={w.id}
                      className={`p-3.5 rounded border flex flex-col justify-between ${
                        isEquipped
                          ? 'bg-[#2b1917] border-[#fbbf24]'
                          : 'bg-[#1c1612] border-[#3d322a]'
                      }`}
                    >
                      <div>
                        <div className="flex gap-3 mb-2.5">
                          {artworkMap[w.id] && (
                            <img
                              src={artworkMap[w.id]}
                              alt={w.name}
                              className="w-20 h-20 rounded border border-[#fbbf24]/80 object-cover shrink-0"
                            />
                          )}
                          <div className="min-w-0">
                            <span className="text-[10px] text-[#fbbf24] font-mono-num uppercase">
                              {w.wazamonoGrade} · {w.category}
                            </span>
                            <h3 className="text-sm font-bold text-[#f3ebd9] leading-tight">
                              #{w.index}. {w.name} ({w.kanji})
                            </h3>
                            <p className="text-[11px] text-[#fbbf24] font-mono-num mt-0.5">
                              {w.metricSpecs}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-[#d6c7b2] mb-2">{w.description}</p>
                        <div className="text-[11px] text-[#c7b79e] font-mono-num mb-3">
                          Dmg {w.damage} · Posture {w.postureDamage} · Reach {w.reach}m · Speed {w.speed}/s
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => engineRef.current?.equipWeapon(w.id)}
                          className={`flex-1 py-1.5 text-xs font-semibold rounded cursor-pointer ${
                            isEquipped
                              ? 'bg-[#fbbf24] text-[#181411]'
                              : 'bg-[#991b1b] hover:bg-[#b91c1c] text-[#f3ebd9]'
                          }`}
                        >
                          {isEquipped ? 'Equipped' : `Equip ${w.name.split(' ')[0]}`}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleSynthesizeItemArt({
                              mapKey: w.id,
                              itemId: w.id,
                              title: w.name,
                              kanji: w.kanji,
                              subtitle: w.metricSpecs,
                              aiPrompt: w.aiPrompt,
                              auraMotif: w.auraMotif,
                              primaryColor: w.bladeColor,
                              secondaryColor: w.hiltColor,
                            })
                          }
                          disabled={Boolean(synthesizingId)}
                          className="px-2.5 py-1.5 text-[11px] font-semibold bg-[#292018] hover:bg-[#3b2d22] border border-[#fbbf24]/60 text-[#fbbf24] rounded cursor-pointer whitespace-nowrap"
                        >
                          {synthesizingId === w.id ? 'Painting...' : 'AI Scroll Art'}
                        </button>
                      </div>
                    </div>
                  );
                })}

              {arsenalTab === 'throwables' &&
                THROWABLES.map((t) => {
                  const isEquipped = hud.equippedThrowable.id === t.id;
                  return (
                    <div
                      key={t.id}
                      className={`p-4 rounded border flex flex-col justify-between ${
                        isEquipped
                          ? 'bg-[#2b1917] border-[#fbbf24]'
                          : 'bg-[#1c1612] border-[#3d322a]'
                      }`}
                    >
                      <div>
                        <div className="flex gap-3 mb-2.5">
                          {artworkMap[t.id] && (
                            <img
                              src={artworkMap[t.id]}
                              alt={t.name}
                              className="w-20 h-20 rounded border border-[#fbbf24]/80 object-cover shrink-0"
                            />
                          )}
                          <div>
                            <span className="text-[10px] text-[#fbbf24] font-mono-num">
                              {t.wazamonoGrade}
                            </span>
                            <h3 className="text-sm font-bold text-[#f3ebd9]">
                              #{t.index}. {t.name} ({t.kanji})
                            </h3>
                            <p className="text-[11px] text-[#fbbf24] font-mono-num mt-0.5">
                              {t.metricSpecs}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-[#d6c7b2] mb-3">{t.description}</p>
                        <div className="text-[11px] text-[#c7b79e] font-mono-num mb-3">
                          Dmg {t.damage} · Posture {t.postureDamage} · Stock {t.maxStock} · Count {t.countPerThrow}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => engineRef.current?.equipThrowable(t.id)}
                          className={`flex-1 py-1.5 text-xs font-semibold rounded cursor-pointer ${
                            isEquipped
                              ? 'bg-[#fbbf24] text-[#181411]'
                              : 'bg-[#991b1b] hover:bg-[#b91c1c] text-[#f3ebd9]'
                          }`}
                        >
                          {isEquipped ? 'Equipped Ninjutsu' : `Equip ${t.name.split(' ')[0]}`}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleSynthesizeItemArt({
                              mapKey: t.id,
                              itemId: t.id,
                              title: t.name,
                              kanji: t.kanji,
                              subtitle: t.metricSpecs,
                              aiPrompt: t.aiPrompt,
                              auraMotif: t.auraMotif,
                              primaryColor: t.color,
                              secondaryColor: 0x991b1b,
                            })
                          }
                          disabled={Boolean(synthesizingId)}
                          className="px-2.5 py-1.5 text-[11px] font-semibold bg-[#292018] hover:bg-[#3b2d22] border border-[#fbbf24]/60 text-[#fbbf24] rounded cursor-pointer whitespace-nowrap"
                        >
                          {synthesizingId === t.id ? 'Painting...' : 'AI Scroll Art'}
                        </button>
                      </div>
                    </div>
                  );
                })}

              {arsenalTab === 'armor' &&
                ARMORS.map((a) => {
                  const isEquipped = hud.equippedArmor.id === a.id;
                  const mapKey = `armor_${a.id}`;
                  return (
                    <div
                      key={a.id}
                      className={`p-4 rounded border flex flex-col justify-between ${
                        isEquipped
                          ? 'bg-[#2b1917] border-[#fbbf24]'
                          : 'bg-[#1c1612] border-[#3d322a]'
                      }`}
                    >
                      <div>
                        <div className="flex gap-3 mb-2.5">
                          {artworkMap[mapKey] && (
                            <img
                              src={artworkMap[mapKey]}
                              alt={a.name}
                              className="w-20 h-20 rounded border border-[#fbbf24]/80 object-cover shrink-0"
                            />
                          )}
                          <div>
                            <h3 className="text-sm font-bold text-[#f3ebd9]">
                              {a.name} ({a.kanji})
                            </h3>
                            <p className="text-xs text-[#fbbf24]">{a.roleClue}</p>
                            <p className="text-[11px] text-[#c7b79e] font-mono-num mt-0.5">
                              {a.metricSpecs}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-[#d6c7b2] mb-3">{a.description}</p>
                        <div className="text-[11px] text-[#c7b79e] font-mono-num mb-3">
                          Defense {Math.round(a.defense * 100)}% · Speed {(a.speedMultiplier * 100).toFixed(0)}% ·
                          Ki Regen {(a.kiRegenMultiplier * 100).toFixed(0)}%
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => engineRef.current?.equipArmor(a.id)}
                          className={`flex-1 py-1.5 text-xs font-semibold rounded cursor-pointer ${
                            isEquipped
                              ? 'bg-[#fbbf24] text-[#181411]'
                              : 'bg-[#991b1b] hover:bg-[#b91c1c] text-[#f3ebd9]'
                          }`}
                        >
                          {isEquipped ? 'Equipped Outfit' : `Wear ${a.name.split(' ')[0]}`}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleSynthesizeItemArt({
                              mapKey,
                              itemId: a.id,
                              title: a.name,
                              kanji: a.kanji,
                              subtitle: a.metricSpecs,
                              aiPrompt: a.aiPrompt,
                              auraMotif: 'crimson_lightning',
                              primaryColor: a.primaryColor,
                              secondaryColor: a.accentColor,
                            })
                          }
                          disabled={Boolean(synthesizingId)}
                          className="px-2.5 py-1.5 text-[11px] font-semibold bg-[#292018] hover:bg-[#3b2d22] border border-[#fbbf24]/60 text-[#fbbf24] rounded cursor-pointer whitespace-nowrap"
                        >
                          {synthesizingId === mapKey ? 'Painting...' : 'AI Scroll Art'}
                        </button>
                      </div>
                    </div>
                  );
                })}

              {arsenalTab === 'helmets' &&
                HELMETS.map((h) => {
                  const isEquipped = hud.equippedHelmet.id === h.id;
                  const mapKey = `helmet_${h.id}`;
                  return (
                    <div
                      key={h.id}
                      className={`p-4 rounded border flex flex-col justify-between ${
                        isEquipped
                          ? 'bg-[#2b1917] border-[#fbbf24]'
                          : 'bg-[#1c1612] border-[#3d322a]'
                      }`}
                    >
                      <div>
                        <div className="flex gap-3 mb-2.5">
                          {artworkMap[mapKey] && (
                            <img
                              src={artworkMap[mapKey]}
                              alt={h.name}
                              className="w-20 h-20 rounded border border-[#fbbf24]/80 object-cover shrink-0"
                            />
                          )}
                          <div>
                            <h3 className="text-sm font-bold text-[#f3ebd9]">
                              {h.name} ({h.kanji})
                            </h3>
                            <p className="text-xs text-[#fbbf24]">{h.roleClue}</p>
                            <p className="text-[11px] text-[#c7b79e] font-mono-num mt-0.5">
                              {h.metricSpecs}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-[#d6c7b2] mb-3">{h.description}</p>
                        <div className="text-[11px] text-[#c7b79e] font-mono-num mb-3">
                          Posture Guard +{Math.round(h.postureDefenseBonus * 100)}% · Crit Dmg +
                          {Math.round(h.critDamageBonus * 100)}% · Ki Cost -
                          {Math.round(h.kiCostReduction * 100)}%
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => engineRef.current?.equipHelmet(h.id)}
                          className={`flex-1 py-1.5 text-xs font-semibold rounded cursor-pointer ${
                            isEquipped
                              ? 'bg-[#fbbf24] text-[#181411]'
                              : 'bg-[#991b1b] hover:bg-[#b91c1c] text-[#f3ebd9]'
                          }`}
                        >
                          {isEquipped ? 'Equipped Helmet' : `Don ${h.name.split(' ')[0]}`}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleSynthesizeItemArt({
                              mapKey,
                              itemId: h.id,
                              title: h.name,
                              kanji: h.kanji,
                              subtitle: h.metricSpecs,
                              aiPrompt: h.aiPrompt,
                              auraMotif: 'ember_smoke',
                              primaryColor: h.primaryColor,
                              secondaryColor: h.crestColor,
                            })
                          }
                          disabled={Boolean(synthesizingId)}
                          className="px-2.5 py-1.5 text-[11px] font-semibold bg-[#292018] hover:bg-[#3b2d22] border border-[#fbbf24]/60 text-[#fbbf24] rounded cursor-pointer whitespace-nowrap"
                        >
                          {synthesizingId === mapKey ? 'Painting...' : 'AI Scroll Art'}
                        </button>
                      </div>
                    </div>
                  );
                })}

              {arsenalTab === 'compendium_studio' &&
                TWENTY_AUTHENTIC_ARSENAL.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded border bg-[#1c1612] border-[#3d322a] flex flex-col justify-between"
                  >
                    <div className="flex gap-3 mb-2">
                      {artworkMap[item.id] && (
                        <img
                          src={artworkMap[item.id]}
                          alt={item.name}
                          className="w-24 h-24 rounded border border-[#fbbf24] object-cover shrink-0"
                        />
                      )}
                      <div>
                        <span className="text-[10px] text-[#fbbf24] font-mono-num">
                          #{item.catalogNumber}/35 · {item.classLabel}
                        </span>
                        <h3 className="text-sm font-bold text-[#f3ebd9]">
                          {item.name} ({item.kanji})
                        </h3>
                        <p className="text-[11px] text-[#d6c7b2] font-mono-num mt-1">
                          {item.metricSpecs}
                        </p>
                        <p className="text-[10px] text-[#c7b79e] mt-1 line-clamp-2">
                          Prompt: {item.aiPrompt}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleSynthesizeItemArt({
                          mapKey: item.id,
                          itemId: item.id,
                          title: item.name,
                          kanji: item.kanji,
                          subtitle: item.metricSpecs,
                          aiPrompt: item.aiPrompt,
                          auraMotif: item.auraMotif,
                          primaryColor:
                            item.weaponRef?.bladeColor ?? item.throwableRef?.color ?? 0xe2e8f0,
                          secondaryColor: item.weaponRef?.hiltColor ?? 0x991b1b,
                        })
                      }
                      disabled={Boolean(synthesizingId)}
                      className="w-full py-1.5 text-xs font-semibold bg-[#991b1b] hover:bg-[#b91c1c] border border-[#fbbf24] text-[#f3ebd9] rounded cursor-pointer"
                    >
                      {synthesizingId === item.id
                        ? 'Synthesizing Scroll Portrait...'
                        : 'Synthesize AI Scroll Art (Imagen / 3D Studio)'}
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </dialog>
      )}

      {/* ====================================================================
          SHOGUN AI TACTICIAN & LYRIA MUSIC MODAL ([N] Key)
          ==================================================================== */}
      {shogunPanelOpen && hud && (
        <dialog
          open
          aria-label="Shogun AI Tactician and Lyria Music Sanctuary"
          className="fixed inset-0 z-40 w-full h-full bg-black/75 flex items-center justify-center p-4"
          data-ui-interactive="true"
        >
          <div className="washi-card rounded-lg max-w-2xl w-full p-6 text-[#f3ebd9]">
            <div className="flex items-center justify-between border-b border-[#3d322a] pb-3 mb-4">
              <div>
                <h2 className="text-lg font-bold font-display text-[#fbbf24]">
                  Shogun High-Thinking Tactician &amp; Lyria Koto Composer
                </h2>
                <p className="text-xs text-[#c7b79e]">
                  Powered by gemini-4-argon (ThinkingLevel.HIGH) &amp; lyria-3-clip-preview / lyria-3-pro-preview
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShogunPanelOpen(false)}
                className="px-3 py-1 text-xs font-semibold bg-[#991b1b] rounded cursor-pointer"
              >
                Close [N]
              </button>
            </div>

            <div className="mb-6 p-4 rounded bg-[#14100d] border border-[#3d322a]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[#f3ebd9]">
                  01. Deep Combat Telemetry Analysis (gemini-4-argon)
                </h3>
                <button
                  type="button"
                  onClick={handleConsultTactician}
                  disabled={tacticianLoading}
                  className="px-4 py-1.5 text-xs font-semibold bg-[#991b1b] hover:bg-[#b91c1c] border border-[#fbbf24] rounded cursor-pointer disabled:opacity-50"
                >
                  {tacticianLoading ? 'Contemplating Strategy...' : 'Consult Shogun Tactician'}
                </button>
              </div>

              {tacticianScroll ? (
                <div className="text-xs space-y-2 text-[#e2d5c1]">
                  <p className="font-bold text-[#fbbf24]">{tacticianScroll.scrollTitle}</p>
                  <p>{tacticianScroll.enemyCounterDirective}</p>
                  <ul className="list-disc pl-4 space-y-1 text-[#d6c7b2]">
                    {tacticianScroll.samuraiAdvice.map((tip, i) => (
                      <li key={i}>{tip}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-xs text-[#c7b79e]">
                  Analyze your current Melee Spam ({Math.round(hud.aiSnapshot.meleeSpamRate * 100)}%),
                  Ranged Dependency ({Math.round(hud.aiSnapshot.rangedDependency * 100)}%), and Parry
                  Accuracy ({Math.round(hud.aiSnapshot.parryTimingAccuracy * 100)}%) against{' '}
                  {hud.bossName}.
                </p>
              )}
            </div>

            <div className="p-4 rounded bg-[#14100d] border border-[#3d322a]">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h3 className="text-sm font-semibold text-[#f3ebd9]">
                  02. Samurai Soundtrack Synthesis (Lyria 3)
                </h3>
                <div className="flex items-center gap-2">
                  <select
                    aria-label="Select Music Track Length"
                    value={lyriaDurationType}
                    onChange={(e) => setLyriaDurationType(e.target.value as 'clip' | 'full')}
                    className="bg-[#211a15] text-xs text-[#f3ebd9] border border-[#4a3b31] rounded px-2.5 py-1.5"
                  >
                    <option value="clip">Short Clip (30s · lyria-3-clip-preview)</option>
                    <option value="full">Full Track (lyria-3-pro-preview)</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleGenerateLyriaMusic}
                    disabled={lyriaLoading}
                    className="px-4 py-1.5 text-xs font-semibold bg-[#991b1b] hover:bg-[#b91c1c] border border-[#fbbf24] rounded cursor-pointer disabled:opacity-50"
                  >
                    {lyriaLoading ? 'Generating Audio...' : 'Generate Soundtrack'}
                  </button>
                </div>
              </div>
              <p className="text-xs text-[#d6c7b2]">{lyriaStatus}</p>
            </div>
          </div>
        </dialog>
      )}

      {/* ====================================================================
          PAUSE / VICTORY / GAME OVER SINGLE FOCUSED STATUS MODAL CARD
          ==================================================================== */}
      {hud &&
        (hud.gameState === 'paused' ||
          hud.gameState === 'gameover' ||
          hud.gameState === 'victory') && (
          <dialog
            open
            aria-label="Game Status Modal"
            className="fixed inset-0 z-50 w-full h-full bg-black/75 flex items-center justify-center p-4"
            data-ui-interactive="true"
          >
            <div className="washi-card rounded-lg max-w-md w-full p-7 text-center text-[#f3ebd9]">
              <p className="text-xs tracking-[0.2em] text-[#fbbf24] mb-1">
                {hud.gameState === 'paused'
                  ? 'MEDITATION · 一時停止'
                  : hud.gameState === 'victory'
                    ? 'SHOGUNATE VANQUISHED · 天下無双'
                    : 'HONORABLE FALL · 討死'}
              </p>
              <h2 className="text-3xl font-bold font-display mb-4">
                {hud.gameState === 'paused'
                  ? 'Battle Paused'
                  : hud.gameState === 'victory'
                    ? 'Campaign Victory'
                    : 'Defeated in Battle'}
              </h2>

              <div className="grid grid-cols-3 gap-2.5 mb-6 text-left">
                <div className="p-3 rounded bg-[#14100d] border border-[#3d322a]">
                  <div className="text-[10px] text-[#c7b79e]">SCORE / BEST</div>
                  <div className="text-sm font-bold font-mono-num text-[#fbbf24]">
                    {hud.score} / {hud.bestScore}
                  </div>
                </div>
                <div className="p-3 rounded bg-[#14100d] border border-[#3d322a]">
                  <div className="text-[10px] text-[#c7b79e]">HONOR KOKU</div>
                  <div className="text-sm font-bold font-mono-num text-[#f3ebd9]">
                    {hud.koku} 石 · Stg {hud.stageIndex + 1}/10
                  </div>
                </div>
                <div className="p-3 rounded bg-[#14100d] border border-[#3d322a]">
                  <div className="text-[10px] text-[#c7b79e]">TIME / DMG</div>
                  <div className="text-sm font-bold font-mono-num text-[#f87171]">
                    {hud.clearTimeSec}s · {hud.damageTakenRun}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                {hud.gameState === 'paused' ? (
                  <button
                    type="button"
                    onClick={() => engineRef.current?.togglePause()}
                    className="w-full py-3 text-sm font-bold bg-[#991b1b] hover:bg-[#b91c1c] border border-[#fbbf24] rounded cursor-pointer"
                  >
                    Resume Battle [Esc / P]
                  </button>
                ) : (
                  <button
                    type="button"
                    data-start="true"
                    onClick={() => engineRef.current?.restartStage()}
                    className="w-full py-3 text-sm font-bold bg-[#991b1b] hover:bg-[#b91c1c] border border-[#fbbf24] rounded cursor-pointer"
                  >
                    {hud.gameState === 'victory' ? 'Play Campaign Again' : 'Try Again [R]'}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => engineRef.current?.restartStage()}
                  className="w-full py-2.5 text-xs font-semibold bg-[#241d18] hover:bg-[#332922] border border-[#4a3b31] rounded cursor-pointer"
                >
                  Restart Current Province
                </button>

                <button
                  type="button"
                  onClick={() => engineRef.current?.returnToTitle()}
                  className="w-full py-2.5 text-xs font-medium text-[#d6c7b2] hover:text-[#f3ebd9] cursor-pointer"
                >
                  Return to Title Screen
                </button>
              </div>
            </div>
          </dialog>
        )}

      {/* ====================================================================
          LIVE 3D ASSET INSPECTOR & URL/FILE DROPPER STUDIO ([L] Key / Button)
          ==================================================================== */}
      {assetStudioOpen && hud && (
        <dialog
          open
          aria-label="Live 3D Asset Inspector and GLTF HDRI Dropper Studio"
          className="fixed inset-0 z-50 w-full h-full bg-black/80 flex items-center justify-center p-4"
          data-ui-interactive="true"
        >
          <div className="washi-card rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden text-[#f3ebd9] border border-[#34d399]/70">
            <div className="px-6 py-4 border-b border-[#3d322a] flex items-center justify-between">
              <div>
                <p className="text-[10px] tracking-[0.2em] text-[#34d399]">
                  THREE.JS GLTFLOADER + DRACOLOADER + RGBELOADER &amp; PARAMETRIC FORGE
                </p>
                <h2 className="text-xl font-bold font-display">
                  Live 3D Asset Inspector &amp; URL / File Dropper Studio
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCloudSaveProfile}
                  className="px-3 py-1.5 text-xs font-semibold bg-[#172554] hover:bg-[#1e3a8a] border border-[#38bdf8] text-[#e0f2fe] rounded cursor-pointer"
                >
                  {cloudUser ? `Sync Cloud (${cloudUser.displayName?.split(' ')[0] || 'Saved'})` : 'Sign In & Cloud Sync'}
                </button>
                {cloudUser && (
                  <button
                    type="button"
                    onClick={() => signOutSamurai()}
                    className="px-2.5 py-1.5 text-xs bg-[#241d18] border border-[#4a3b31] text-[#c7b79e] rounded cursor-pointer"
                  >
                    Sign Out
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setAssetStudioOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-bold bg-[#991b1b] hover:bg-[#b91c1c] border border-[#fbbf24] rounded cursor-pointer"
                >
                  Close [L / Esc]
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              {/* Status Banner */}
              <div className="px-3.5 py-2 rounded bg-[#121c17] border border-[#34d399]/50 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-[#a7f3d0] font-mono-num">{assetLoadingStatus}</span>
                {cloudSyncNotice && (
                  <span className="text-[#38bdf8] font-semibold">{cloudSyncNotice}</span>
                )}
              </div>

              {/* Target Slot Selector + Live Telemetry Readout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded bg-[#14100d] border border-[#3d322a] space-y-3">
                  <div className="text-xs font-bold text-[#fbbf24]">
                    1. Select Target 3D Hot-Swap Slot
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        ['samurai', 'Samurai Rig (.glb / .gltf)'],
                        ['weapon', 'Primary Weapon (.glb / .gltf)'],
                        ['boss', 'Active Enemy / Boss (.glb)'],
                        ['hdri', 'Poly Haven Environment (.hdr)'],
                      ] as const
                    ).map(([slotKey, label]) => (
                      <button
                        key={slotKey}
                        type="button"
                        onClick={() => handleRefreshTelemetry(slotKey)}
                        className={`p-2.5 rounded text-xs font-semibold text-left border cursor-pointer ${
                          assetTargetSlot === slotKey
                            ? 'bg-[#14261f] border-[#34d399] text-[#a7f3d0]'
                            : 'bg-[#1c1612] border-[#3d322a] text-[#c7b79e] hover:text-[#f3ebd9]'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Drag & Drop Local File Zone */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const file = e.dataTransfer?.files?.[0];
                      if (file) {
                        void handleDropOrSelectFile(file);
                      }
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className="p-4 rounded border-2 border-dashed border-[#34d399]/60 hover:border-[#fbbf24] bg-[#171310] text-center cursor-pointer transition-colors"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".glb,.gltf,.hdr"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          void handleDropOrSelectFile(file);
                        }
                      }}
                    />
                    <p className="text-xs font-bold text-[#a7f3d0]">
                      Drag &amp; Drop any local .glb, .gltf, or .hdr file here
                    </p>
                    <p className="text-[11px] text-[#c7b79e] mt-0.5">
                      Or click to browse from your computer to hot-swap [{assetTargetSlot.toUpperCase()}] in real time
                    </p>
                  </div>

                  {/* Paste Custom CORS URL */}
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={customAssetUrlInput}
                      onChange={(e) => setCustomAssetUrlInput(e.target.value)}
                      placeholder="https://raw.githubusercontent.com/.../model.glb or .hdr"
                      className="flex-1 bg-[#1c1612] border border-[#4a3b31] rounded px-3 py-1.5 text-xs text-[#f3ebd9]"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        void handleLoadUrlForSlot(
                          assetTargetSlot,
                          customAssetUrlInput,
                          'Custom Remote Asset'
                        )
                      }
                      className="px-3.5 py-1.5 text-xs font-bold bg-[#991b1b] hover:bg-[#b91c1c] border border-[#fbbf24] rounded cursor-pointer whitespace-nowrap"
                    >
                      Hot-Swap URL
                    </button>
                  </div>
                </div>

                {/* Live 3D Mesh & Multi-Physics Telemetry Panel */}
                <div className="p-4 rounded bg-[#14100d] border border-[#3d322a] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-[#3d322a] pb-1.5 mb-2.5">
                      <span className="text-xs font-bold text-[#34d399]">
                        2. Live 3D Mesh &amp; Physics Telemetry [{assetTargetSlot.toUpperCase()}]
                      </span>
                      <span className="text-[11px] font-mono-num text-[#fbbf24]">
                        {inspectedTelemetry?.sourceUrlOrFile || 'procedural://mathematical-samurai-rig'}
                      </span>
                    </div>

                    {inspectedTelemetry && (
                      <div className="grid grid-cols-2 gap-2 text-xs font-mono-num">
                        <div className="p-2 rounded bg-[#1c1612] border border-[#2e241d]">
                          <div className="text-[10px] text-[#c7b79e]">ACTIVE ASSET</div>
                          <div className="font-bold text-[#f3ebd9] truncate">
                            {inspectedTelemetry.name}
                          </div>
                        </div>
                        <div className="p-2 rounded bg-[#1c1612] border border-[#2e241d]">
                          <div className="text-[10px] text-[#c7b79e]">VERTICES / TRIANGLES</div>
                          <div className="font-bold text-[#a7f3d0]">
                            {inspectedTelemetry.vertexCount.toLocaleString()} /{' '}
                            {inspectedTelemetry.triangleCount.toLocaleString()}
                          </div>
                        </div>
                        <div className="p-2 rounded bg-[#1c1612] border border-[#2e241d]">
                          <div className="text-[10px] text-[#c7b79e]">SKINNED MESHES / BONES</div>
                          <div className="font-bold text-[#38bdf8]">
                            {inspectedTelemetry.skinnedMeshCount} / {inspectedTelemetry.boneCount} Bones
                          </div>
                        </div>
                        <div className="p-2 rounded bg-[#1c1612] border border-[#2e241d]">
                          <div className="text-[10px] text-[#c7b79e]">BOUNDING BOX (M)</div>
                          <div className="font-bold text-[#fbbf24]">
                            {inspectedTelemetry.boundingBoxMeters.x} ×{' '}
                            {inspectedTelemetry.boundingBoxMeters.y} ×{' '}
                            {inspectedTelemetry.boundingBoxMeters.z}m
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-[#3d322a] grid grid-cols-3 gap-2 text-[11px] font-mono-num text-[#d6c7b2]">
                    <div>Cannon-es 60Hz: {hud.cannonRigidBodyCount} bodies</div>
                    <div>Verlet Cloth: {hud.verletClothNodeCount} nodes</div>
                    <div>Zandatsu Tris: {hud.lastBisectedTriCount}</div>
                  </div>
                </div>
              </div>

              {/* Verified CORS-Safe 3D Asset Presets & 6-Move Combat Reference */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded bg-[#14100d] border border-[#3d322a]">
                  <div className="text-xs font-bold text-[#fbbf24] mb-2.5">
                    3. Verified CORS-Safe Khronos glTF &amp; Poly Haven HDRI Presets
                  </div>
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {VERIFIED_3D_ASSET_PRESETS.map((preset) => (
                      <div
                        key={preset.id}
                        className="p-2.5 rounded bg-[#1c1612] border border-[#3d322a] flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[#f3ebd9] truncate">
                            {preset.name}{' '}
                            <span className="text-[10px] text-[#34d399] font-mono-num">
                              [{preset.slot.toUpperCase()}]
                            </span>
                          </div>
                          <div className="text-[11px] text-[#c7b79e] truncate">
                            {preset.description}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            void handleLoadUrlForSlot(preset.slot, preset.url, preset.name)
                          }
                          className="px-2.5 py-1 text-xs font-semibold bg-[#991b1b] hover:bg-[#b91c1c] border border-[#fbbf24] text-[#f3ebd9] rounded cursor-pointer shrink-0"
                        >
                          Load Preset
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded bg-[#14100d] border border-[#3d322a]">
                  <div className="text-xs font-bold text-[#fbbf24] mb-2.5">
                    4. 6-Move Cubic Hermite Spline Combat System &amp; 8-Ray Blade Hitbox
                  </div>
                  <div className="space-y-1.5 text-xs">
                    {Object.values(SIX_COMBAT_MOVES).map((m: CombatMoveDefinition) => (
                      <div
                        key={m.id}
                        className="p-2 rounded bg-[#1c1612] border border-[#2e241d] flex items-center justify-between"
                      >
                        <div>
                          <span className="font-bold text-[#f3ebd9]">
                            Move {m.moveNumber}: {m.name} ({m.kanji})
                          </span>
                          <span className="text-[11px] text-[#c7b79e] ml-2">[{m.inputLabel}]</span>
                        </div>
                        <span className="text-[11px] font-mono-num text-[#fbbf24]">
                          {m.damageMultiplier}x Dmg · {m.postureDamageMultiplier}x Posture
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 5. Nano Banana Pro (gemini-3-pro-image-preview) 4-Map PBR & POM Texture Forge */}
              <div className="p-4 rounded bg-[#14100d] border border-[#38bdf8]/60 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold text-[#38bdf8]">
                      5. Nano Banana Pro (gemini-3-pro-image-preview) 4-Map Sobel-Scharr PBR &amp; 16-Step POM Forge
                    </div>
                    <div className="text-[11px] text-[#c7b79e]">
                      Converts generated 2D textures into Albedo (sRGB), Tangent-Space Scharr Normal Map, Parallax Height Map, and Laplacian Roughness/Cavity Map in real time.
                    </div>
                  </div>
                  <span className="text-[11px] font-mono-num text-[#a7f3d0]">
                    Active: {hud.activePbrBundle?.title} ({hud.activePbrBundle?.sourceModel})
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {NANO_BANANA_PBR_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      disabled={pbrSynthesizing}
                      onClick={() => {
                        setPbrPresetId(preset.id);
                        void handleSynthesizeNanoBananaPBR(preset.id, preset.prompt);
                      }}
                      className={`p-2 rounded text-left text-xs border cursor-pointer ${
                        pbrPresetId === preset.id
                          ? 'bg-[#172554] border-[#38bdf8] text-[#e0f2fe]'
                          : 'bg-[#1c1612] border-[#3d322a] text-[#c7b79e] hover:text-[#f3ebd9]'
                      }`}
                    >
                      <div className="font-bold truncate">
                        {preset.name} ({preset.kanji})
                      </div>
                      <div className="text-[10px] text-[#38bdf8] font-mono-num">
                        Slot: {preset.targetCategory.toUpperCase()} · POM {preset.pomDepthScale}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={pbrCustomPrompt}
                    onChange={(e) => setPbrCustomPrompt(e.target.value)}
                    placeholder="Custom Nano Banana Pro PBR prompt (e.g. Folded Damascus meteorite blade with gold Kintsugi veins)..."
                    className="flex-1 bg-[#1c1612] border border-[#4a3b31] rounded px-3 py-1.5 text-xs text-[#f3ebd9]"
                  />
                  <button
                    type="button"
                    disabled={pbrSynthesizing}
                    onClick={() =>
                      void handleSynthesizeNanoBananaPBR(pbrPresetId, pbrCustomPrompt || undefined)
                    }
                    className="px-3.5 py-1.5 text-xs font-bold bg-[#1d4ed8] hover:bg-[#2563eb] border border-[#38bdf8] text-[#f3ebd9] rounded cursor-pointer whitespace-nowrap disabled:opacity-50"
                  >
                    {pbrSynthesizing ? 'Forging 4-Map PBR...' : 'Synthesize 4-Map PBR + POM'}
                  </button>
                </div>

                {hud.activePbrBundle && (
                  <div className="grid grid-cols-4 gap-2 pt-1">
                    {[
                      ['1. Albedo (sRGB)', hud.activePbrBundle.albedoUrl],
                      ['2. Scharr Normal (XYZ)', hud.activePbrBundle.normalUrl],
                      ['3. Parallax Height (H)', hud.activePbrBundle.heightUrl],
                      ['4. Cavity / Roughness', hud.activePbrBundle.roughnessUrl],
                    ].map(([label, url]) => (
                      <div
                        key={label}
                        className="p-1.5 rounded bg-[#1c1612] border border-[#2e241d] text-center"
                      >
                        {url && (
                          <img
                            src={url}
                            alt={label}
                            className="w-full h-16 object-cover rounded border border-[#4a3b31] mb-1"
                          />
                        )}
                        <div className="text-[10px] font-mono-num text-[#d6c7b2] truncate">
                          {label}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}
