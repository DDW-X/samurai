# Kami-no-Yaiba: AAA Kami-e Shader, Procedural Geometry & Adaptive AI Upgrade

This upgrade transforms **Kami-no-Yaiba: Sumi-e Samurai ARPG** (both the live WebGL application and the one-click standalone HTML5 export) with multi-band Sumi-e ink-wash GLSL shaders, Sobel/Laplacian brush-stroke outlines, intricate multi-part procedural 3D weapon and armor geometry, and an expanded Adaptive Utility AI with real-time counter-tactic telegraph callouts.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural and aesthetic choices incorporate your confirmed selections from Phase 1:

- **Confirmed Module Scope**: Full-spectrum upgrade across all three modules (**Advanced GLSL Kami-e & Sumi-e Shaders and VFX**, **High-Detail Procedural 3D Weapon & Armor Geometry**, and **Expanded Adaptive Utility AI & Boss Move-Sets**) synchronized with the **Standalone Single-File HTML Exporter**.
- **Confirmed Visual Shader Direction**: **Multi-band ink wash, fibrous Washi paper grain, and calligraphy brush outlines** — combining a 4-tier quantized Sumi-e toon ramp, screen-space Sobel/Laplacian ink edge detection (with automatic hardware/software WebGL fallback), and dynamic black/crimson calligraphy slash ribbons.
- **Confirmed Combat & AI Pacing**: **Dynamic counter-tactics with clear telegraph callouts** — enemies and bosses read rolling player telemetry from `AI_Brain` to execute specialized counter-maneuvers (e.g., *Auto-Parry Riposte*, *Zig-Zag Wind-Dash*, *Anti-Air Rising Slash*, *Hyper-Armor Guard-Crush*) announced via crisp visual rings and floating Kanji/English callouts.

---

## 1. Overview & Core Concept

- **What It Does**: Delivers a deeply detailed, 100% procedural 3D Isometric Samurai Action-RPG where every surface looks crafted from layered Washi parchment and wet Sumi-e brush ink, every one of the 19 weapons and 10 armor/kabuto pieces has bespoke multi-component 3D geometry, and every enemy squad adapts to the player's combat habits in real time.
- **Target Audience / Persona**: Action-RPG players and fans of stylized Japanese ink-and-paper aesthetics (*Okami*, *Sekiro*, *Trek to Yomi*, *Kamishibai* theater) seeking responsive parrying, build customization, and intelligent enemy AI.
- **Key Value**: Zero external asset dependencies (no CORS failures or missing `.gltf` files) paired with both an interactive full-stack studio experience and a self-contained single-file HTML5 download that runs anywhere offline.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Live 3D Title Sanctuary**: Players arrive at a live 3D Washi-paper province vista framed by a left-aligned Sumi-e title crest, province selector (Stages 1–5), **Enter Battle**, **Customize Arsenal (19) & Armor**, and **Export Single-File HTML** actions.
2. **Tactical Isometric Combat & Counter-Telegraphs**: During combat, players move in 8 camera-relative directions (`WASD`), sprint with wind-paper trails (`Shift`), jump and plunge-attack (`Space`), chain 3-step light combos or charged heavy attacks (`Left-Click`), execute timed Sekiro-style deflections (`Right-Click`), quick-swap weapons (`Q`/`E`), and hurl Ninjutsu tools (`F`). When the Adaptive AI triggers a counter-state, enemies display a distinct color-coded ground telegraph ring and a floating tactical callout before striking.
3. **Real-Time 3D Forge & Arsenal Customization (`Tab` / `I`)**: Players inspect and equip all 15 melee/polearm/ranged weapons, 4 Ninjutsu throwables, 5 Do armors, and 5 Kabuto/Menpo helmets, immediately updating the 3D Samurai mesh and combat stats.

### Visual Identity & Theme
- **Aesthetic Direction**: Authentic **Kami-e (Paper Craft) & Sumi-e (Ink Wash)** theater combining Ukiyo-e woodblock color blocking, fibrous Washi parchment bump mapping, and wet-brush ink edges.
- **Color Palette & Mood**:
  - `--background`: Warm Washi Parchment (`#d8ceb8` to `#dfd5c0` in 3D world) & Deep Sumi Charcoal (`#14100d` for ink-wash HUD frames)
  - `--foreground`: Aged Ivory Parchment (`#f3ebd9`) and Muted Hemp (`#d6c7b2`)
  - `--primary`: Vermilion Seal Red (`#991b1b` / `#dc2626`) for Vitality and primary CTAs
  - `--accent`: Gold Leaf (`#fbbf24`) for Posture / Stance gauges and parry sparks, paired with Indigo Spirit (`#38bdf8`) for Ki stamina
- **Typography & Hierarchy**:
  - **Display / Headers**: `Cinzel` serif with wide tracking for chapter banners, boss names, and critical parry callouts.
  - **UI Body**: `Plus Jakarta Sans` for crisp weapon descriptions and tactical prose.
  - **Telemetry & Numerals**: `JetBrains Mono` with `tabular-nums` for Vitality, Posture, Ki, cooldowns, and AI adaptation percentages.
- **Spatial Composition & Viewport Budget**:
  - At least **85% of the 3D viewport** remains completely unobstructed during active gameplay.
  - HUD elements are pinned to perimeter corners (`16px–24px` safe margin) using solid Sumi-e ink wash frames (`rgba(20, 16, 13, 0.9)`) with zero `backdrop-filter` blur over the WebGL canvas.

### Interactive Feedback & Motion
- **Hit-Stop & Directional Camera Shake**: Heavy blows, posture breaks, and perfect deflections trigger a 45ms–90ms frame freeze (hit-stop), directional camera recoil, metallic gold spark bursts, and floating stroke-outlined combat callouts.
- **Sumi-e Slash Ribbons & Ink Splatters**: Weapon swings generate dynamic 3D tapered ribbon meshes with procedural brush-bristle alpha falloff; defeating enemies stamps permanent Sumi-e ink-splatter decals onto the Washi ground plane and releases wind-drifted Sakura petals.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Hybrid GLSL Material Injection + Screen-Space Sobel Ink Post-Processing**
  - *Chosen Approach*: Upgrade the custom `onBeforeCompile` vertex/fragment shader to compute 4-band quantized Sumi-e lighting, procedural paper-fiber micro-normal perturbation, and brushstroke rim darkening on every mesh, complemented by a custom GLSL Sobel/Laplacian Ink Outline & Washi Grain `ShaderPass` on hardware GPUs (while preserving direct single-pass rendering on software WebGL).
  - *Why*: Guarantees authentic woodblock/ink-wash edges and paper texture depth at 60 FPS on hardware GPUs while never stalling headless or integrated software renderers.
  - *Alternatives Considered*: Heavy multi-pass depth/normal buffer composers without a software WebGL guard, which cause severe frame drops on CPU-backed WebGL contexts.

- **Decision 2: High-Detail Articulated Procedural 3D Geometry for All 19 Arsenal Items & 10 Gear Pieces**
  - *Chosen Approach*: Expand the procedural mesh builders to construct curved katana blades with *hamon* temper lines, fuller grooves (*bo-hi*), ornate *tsuba* handguards, silk-wrapped *tsuka* hilts, *kusarigama* multi-link iron chains with sickles and weights, *tanegashima* matchlock barrels with serpentine locks, layered *sode* shoulder guards, *kusazuri* tassets, and sculpted *Hannya*/*Tengu*/*Oni* masks.
  - *Why*: Eliminates primitive blockiness and makes every weapon swap and armor customization immediately recognizable in 3D space without external `.gltf` files.
  - *Alternatives Considered*: Low-poly single-primitive placeholders, which fail the AAA Kami-e craftsmanship standard.

- **Decision 3: Synchronized Dual-Target Architecture (Live Engine + Full Standalone Single-File HTML Rewrite)**
  - *Chosen Approach*: Upgrade the live modular engine and simultaneously upgrade the complete self-contained Single-File HTML5 generator so clicking **Export Single-File HTML** outputs a complete, un-minified, zero-dependency `.html` file containing the upgraded GLSL shaders, all 19 procedural weapon builders, the Adaptive AI Brain, Web Audio synthesizer, and full HUD.
  - *Why*: Directly fulfills the requirement for a complete, playable single-file HTML5 build alongside the interactive AI Studio web app.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### Architecture & Component Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        KAMI-NO-YAIBA APPLICATION SHELL                       │
│  ┌────────────────────┐  ┌────────────────────────┐  ┌────────────────────┐  │
│  │ Title Sanctuary UI │  │ Perimeter Combat HUD   │  │ 19-Item Forge &    │  │
│  │ + Province Select  │  │ + Live AI Brain Matrix │  │ Single-File Export │  │
│  └─────────┬──────────┘  └───────────┬────────────┘  └─────────┬──────────┘  │
└────────────┼─────────────────────────┼─────────────────────────┼─────────────┘
             │                         │                         │
             ▼                         ▼                         ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                     CORE 3D SAMURAI ENGINE & SIMULATION                      │
│                                                                              │
│  ┌─────────────────────────┐  ┌───────────────────┐  ┌────────────────────┐  │
│  │ Kami-e GLSL Shader &    │  │ Procedural 3D     │  │ AdaptiveAIBrain    │  │
│  │ Post-Process Pipeline   │  │ Geometry Factory  │  │ Telemetry & FSM    │  │
│  │ • 4-Band Sumi-e Ramp    │  │ • 15 Weapons      │  │ • Melee Spam Rate  │  │
│  │ • Sobel Ink Outline Pass│  │ • 4 Throwables    │  │ • Ranged Reliance  │  │
│  │ • Washi Fiber Bump Map  │  │ • 5 Do Armors     │  │ • Dodge Vector Bias│  │
│  │ • Calligraphy Trails    │  │ • 5 Kabuto/Menpo  │  │ • Parry Accuracy   │  │
│  └─────────────────────────┘  └───────────────────┘  └────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────┐  ┌─────────────────────────────────┐  │
│  │ 5-Stage Campaign & Boss Director  │  │ Procedural Web Audio Synth      │  │
│  │ • Bamboo Forest → Jinzo           │  │ • Metallic Clash & Parry Ring   │  │
│  │ • Burning Castle → Gen. Takeda    │  │ • Matchlock Boom & Bow Twang    │  │
│  │ • Origami Shrine → Lady Kagerou   │  │ • Pentatonic Koto / Shakuhachi  │  │
│  │ • Blood Battlefield → Oeyama Oni  │  │ • Taiko Boss Phase Percussion   │  │
│  │ • Zen Garden → The Paper Shogun   │  │                                 │  │
│  └───────────────────────────────────┘  └─────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Data Model & State
- **Player Combat & Customization State**: Tracks active slot (`primary` | `secondary` | `ranged`), equipped items across all 19 weapons/throwables and 10 armor/helmet pieces, derived stats (`maxHp`, `maxPosture`, `maxKi`, `attackPower`, `postureBreak`, `moveSpeed`, `critChance`, `stealthBonus`), 3-stage combo counter, charge timer, and active parry window.
- **`AdaptiveAIBrain` Telemetry & Weights**:
  - Rolling 20-second telemetry buffer recording player melee frequency, ranged damage share, directional dodge vectors (`left`, `right`, `back`, `forward`), parry timing accuracy, and jump/plunge rate.
  - Dynamically mutates enemy FSM weights (`autoParryProb`, `hyperArmorProb`, `zigZagSprintProb`, `arrowDeflectProb`, `antiAirSlashProb`, `feintDelayProb`) and broadcasts the active **Counter-Tactic Doctrine** to the HUD.

### Interactive Component & State Mapping
- **Weapon & Armor Forge (`Tab` / `I`)**: Selecting any of the 15 weapons, 4 throwables, 5 armors, or 5 helmets immediately rebuilds the Samurai's 3D articulated rig, swaps the held weapon geometry and sheathed *saya* scabbard, and recalculates posture/agility stats.
- **Combat Telegraph & Counter-Move Execution**:
  - *Standard Strike* (Crimson telegraph arc): Parriable with `Right-Click` within the 260ms deflection window, dealing heavy posture damage and spawning gold spark bursts.
  - *Unblockable Perilous Sweep / Grab* (Gold/Crimson `危` Perilous ring): Requires `Space` jump (enabling a mid-air plunge counter) or directional sidestep.
  - *Adaptive Counter-Maneuver* (Indigo/Amber callout): Triggered when `AI_Brain` detects player habit thresholds (e.g., `ENEMY AUTO-PARRY STANCE`, `ZIG-ZAG WIND DASH`, `ANTI-AIR RISING SLASH`, `DODGE-PREDICT CLEAVE`).
- **Single-File HTML Exporter**: Bundles the complete upgraded GLSL shaders, procedural geometry builders, 19-weapon arsenal, Adaptive AI Brain, 5-stage campaign, and Web Audio synthesizer into a standalone `.html` download.
