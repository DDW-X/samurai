import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, ThinkingLevel, Modality } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

function getGenAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// High-Thinking AI Shogun Tactician endpoint using gemini-4-argon + ThinkingLevel.HIGH
app.post('/api/ai-tactician', async (req, res) => {
  try {
    const { telemetry, stageName, bossName, equippedWeapon, equippedArmor, equippedHelmet } = req.body;
    const ai = getGenAIClient();

    if (!ai) {
      // Deterministic tactical scroll when API key is not configured
      const spamPct = Math.round((telemetry?.meleeSpamRate || 0) * 100);
      const rangedPct = Math.round((telemetry?.rangedDependency || 0) * 100);
      const parryPct = Math.round((telemetry?.parryTimingAccuracy || 0) * 100);
      const dodgeDir = telemetry?.preferredDodgeVector || 'back';

      return res.json({
        source: 'heuristic-shogun-scroll',
        scrollTitle: `Tactical Scroll: ${stageName || 'Bamboo Forest'}`,
        enemyCounterDirective:
          spamPct > 55
            ? `${bossName || 'The Enemy Commander'} has observed your aggressive ${spamPct}% melee cadence with ${equippedWeapon || 'Uchigatana'} and shifted into Hyper-Armor Counter-Slash formation.`
            : rangedPct > 45
              ? `${bossName || 'The Enemy Commander'} detected ${rangedPct}% ranged reliance and ordered Zig-Zag Wind-Step approaches with raised blade deflection.`
              : `Enemy vanguard is tracking your ${dodgeDir}-bias footwork and calibrating delayed feints to test your ${parryPct}% parry precision.`,
        samuraiAdvice: [
          `Weave Charged Heavy Strikes (Hold Left-Click) between 2-hit combos to shatter enemy Posture before their Auto-Parry window activates.`,
          `Pair ${equippedWeapon || 'Uchigatana'} with timely Right-Click Deflections to trigger metallic spark stagger and open lethal counters.`,
          `Use Ninjutsu tools (F Key) when enemies commit to windup telegraphs while wearing ${equippedArmor || 'Ronin Haori'} and ${equippedHelmet || 'Suji-Kabuto'}.`,
        ],
      });
    }

    const prompt = `You are the Grand Shogun Tactician in a Sumi-e & Washi-paper Samurai Action-RPG.
Analyze the player's live combat telemetry and current loadout against the stage boss:
- Stage: ${stageName}
- Boss: ${bossName}
- Equipped Weapon: ${equippedWeapon}
- Equipped Armor (Do): ${equippedArmor}
- Equipped Helmet (Kabuto/Menpo): ${equippedHelmet}
- Player Telemetry:
  - Melee Spam Rate: ${Math.round((telemetry?.meleeSpamRate || 0) * 100)}%
  - Ranged Dependency: ${Math.round((telemetry?.rangedDependency || 0) * 100)}%
  - Preferred Dodge Vector: ${telemetry?.preferredDodgeVector || 'neutral'}
  - Parry Timing Accuracy: ${Math.round((telemetry?.parryTimingAccuracy || 0) * 100)}%
  - Jump Frequency: ${Math.round((telemetry?.jumpFrequency || 0) * 100)}%

Return a concise JSON object with:
1. "scrollTitle": A poetic Japanese-inspired tactical title.
2. "enemyCounterDirective": 1-2 sentences explaining how the adaptive AI enemies are mutating their FSM weights to counter this player.
3. "samuraiAdvice": Array of 3 specific, actionable combat tips referencing their equipped weapon, armor, and telemetry.`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-argon',
      contents: prompt,
      config: {
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.HIGH,
        },
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '{}';
    const parsed = JSON.parse(text);
    return res.json({
      source: 'gemini-4-argon',
      scrollTitle: parsed.scrollTitle || `Shogun Tactical Scroll: ${stageName}`,
      enemyCounterDirective: parsed.enemyCounterDirective || 'Enemy forces are adapting to your combat rhythm.',
      samuraiAdvice: Array.isArray(parsed.samuraiAdvice) ? parsed.samuraiAdvice : ['Time your parries carefully.'],
    });
  } catch (err: any) {
    return res.status(200).json({
      source: 'fallback-scroll',
      scrollTitle: 'Scroll of Unbroken Posture',
      enemyCounterDirective:
        'Enemy commanders are reading your strike cadence and adjusting parry thresholds in real time.',
      samuraiAdvice: [
        'Alternate light slashes with charged heavy posture breaks.',
        'Watch for crimson windup telegraphs before deflecting with Right-Click.',
        'Swap between Primary Melee, Secondary Polearm, and Ranged bows with Q and E.',
      ],
      note: err?.message || 'Using local heuristic tactician',
    });
  }
});

// Music Generation endpoint using lyria-3-clip-preview or lyria-3-pro-preview
app.post('/api/music-gen', async (req, res) => {
  try {
    const { stageName, mood, durationType } = req.body;
    const ai = getGenAIClient();

    if (!ai) {
      return res.status(200).json({
        fallbackProcedural: true,
        message: 'Synthesizing live pentatonic Koto, Shakuhachi & Taiko soundtrack via procedural Web Audio engine.',
      });
    }

    const modelName = durationType === 'full' ? 'lyria-3-pro-preview' : 'lyria-3-clip-preview';
    const prompt = `Generate a traditional Japanese samurai action soundtrack featuring Koto harp, breathy Shakuhachi bamboo flute, and resonant Taiko war drums for stage "${stageName || 'Bamboo Forest of Whispers'}" with ${mood || 'tense Sumi-e duel'} atmosphere.`;

    const response = await ai.models.generateContentStream({
      model: modelName,
      contents: prompt,
      config: {
        responseModalities: [Modality.AUDIO],
      },
    });

    let audioBase64 = '';
    let mimeType = 'audio/wav';
    let description = '';

    for await (const chunk of response) {
      const parts = chunk.candidates?.[0]?.content?.parts;
      if (!parts) continue;
      for (const part of parts) {
        if (part.inlineData?.data) {
          if (!audioBase64 && part.inlineData.mimeType) {
            mimeType = part.inlineData.mimeType;
          }
          audioBase64 += part.inlineData.data;
        }
        if (part.text && !description) {
          description = part.text;
        }
      }
    }

    if (!audioBase64) {
      return res.status(200).json({
        fallbackProcedural: true,
        message: 'Lyria stream returned no audio bytes; switched to procedural Koto/Shakuhachi Web Audio synth.',
      });
    }

    return res.json({
      fallbackProcedural: false,
      model: modelName,
      mimeType,
      audioBase64,
      description,
    });
  } catch (err: any) {
    return res.status(200).json({
      fallbackProcedural: true,
      message: `Active procedural Koto & Shakuhachi Web Audio synthesizer (${err?.message || 'Lyria key not attached'}).`,
    });
  }
});

// Pipeline 2: Live Concept-Art Scroll Generator using gemini-3.1-flash-lite-image
app.post('/api/generate-scroll-art', async (req, res) => {
  try {
    const { itemId, prompt, themeId } = req.body;
    const ai = getGenAIClient();

    if (!ai) {
      return res.status(200).json({
        fallbackStudio: true,
        itemId,
        themeId,
        message: 'Synthesizing 512x512 3-Point Studio + Ukiyo-e Woodblock Scroll Portrait.',
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-image',
      contents: prompt,
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        return res.json({
          fallbackStudio: false,
          itemId,
          themeId,
          mimeType: part.inlineData.mimeType || 'image/png',
          imageBase64: part.inlineData.data,
        });
      }
    }

    return res.status(200).json({
      fallbackStudio: true,
      itemId,
      themeId,
      message: 'Image part not returned; using 3D Studio + Ukiyo-e Scroll Compositor.',
    });
  } catch (err: any) {
    return res.status(200).json({
      fallbackStudio: true,
      message: err?.message || 'Using 3D Studio + Ukiyo-e Scroll Compositor.',
    });
  }
});

// Pipeline 3: Nano Banana Pro (gemini-3-pro-image-preview) Seamless PBR Material Synthesizer
app.post('/api/nano-banana-pbr', async (req, res) => {
  try {
    const { presetId, prompt, targetSlot } = req.body;
    const ai = getGenAIClient();

    if (!ai) {
      return res.status(200).json({
        fallbackProcedural: true,
        presetId,
        targetSlot,
        model: 'procedural-sobel-scharr-pbr',
        message: 'Synthesizing deterministic 4-map PBR bundle (Albedo, Scharr Normal, Parallax Height, Cavity/Roughness).',
      });
    }

    const pbrPrompt =
      prompt ||
      'Seamless tileable 4K PBR texture of folded Tamahagane Damascus steel with wavy Hamon temper line, orthographic top-down flat surface lighting, micro-scratches, high-frequency surface relief.';

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: pbrPrompt,
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        return res.json({
          fallbackProcedural: false,
          presetId,
          targetSlot,
          model: 'gemini-3-pro-image-preview',
          mimeType: part.inlineData.mimeType || 'image/png',
          imageBase64: part.inlineData.data,
        });
      }
    }

    return res.status(200).json({
      fallbackProcedural: true,
      presetId,
      targetSlot,
      model: 'procedural-sobel-scharr-pbr',
      message: 'Nano Banana Pro returned no image bytes; using deterministic Sobel-Scharr 4-map PBR generator.',
    });
  } catch (err: any) {
    return res.status(200).json({
      fallbackProcedural: true,
      model: 'procedural-sobel-scharr-pbr',
      message: err?.message || 'Using deterministic Sobel-Scharr 4-map PBR generator.',
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Kami-no-Yaiba Samurai ARPG server listening on http://localhost:${PORT}`);
  });
}

startServer();
