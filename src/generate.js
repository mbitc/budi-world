import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import { LITERARY_STYLE_PROMPT } from './literary_core.js';
import { updateWorldState, saveCycleToLog } from './bridge.js';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function runSimulation() {
  console.log('🔄 Paleidžiama Budi pasaulio simuliacija su tekstiniais fragmentais ir logavimu...');
  const world = await updateWorldState();

  const episode = world.current_episode;

  const prompt = `
${LITERARY_STYLE_PROMPT}

LITERATŪRINĖS KELIONĖS BAZĖ (ORIGINALUS TEKSTO FRAGMENTAS):
- Skyrius ir vieta: "${episode.fragment.chapter}" — "${episode.fragment.setting}"
- Įvykių stuburas: "${episode.fragment.text}"

IŠORINIS KATALIZATORIUS (REALI PASAULIO NAUJIENA ŠIAM CIKLUI):
- Fakto antraštė: "${episode.real_world_fact}"
- Emocinis krūvis: ${world.telemetry.emotional_load}

VEIKĖJŲ PILNA CHARAKTERISTIKA IR BŪSENA:
${JSON.stringify(world.characters, null, 2)}

GALIMOS ERDVĖS IR ENTROPIJA:
${JSON.stringify(world.spaces, null, 2)}

UŽDUOTIS:
1. Parašyk 350-500 žodžių epizodą lietuvių kalba, kuris **organiškai sujungia originalaus teksto fragmentą** (jo atmosferą, erdvę, daiktus) **su šios dienos realia naujiena** ("${episode.real_world_fact}").
2. Parodyk pilną veikėjų (Vaurio, Bauderio, Pijaus, Ajos, Garleto P. ar Wau Ku) psichologinę ir fizinę būseną – jų nuovargį, judėjimą erdvėje, daiktų lietimą.
3. Jokio sauso instruktažo – tik sodri, grubi, lėta ir klampi *Askezi* proza.
`;

  async function callGeminiWithRetry(apiCallFn, maxRetries = 3, delayMs = 3000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Vykdome Gemini API užklausą
      return await apiCallFn();
    } catch (error) {
      const status = error?.status || error?.statusCode || error?.response?.status;
      
      // Tikriname, ar klaida laikina (503 Service Unavailable, 429 Rate Limit arba tinklo klaidelė)
      const isTransient = status === 503 || status === 429 || !status;

      if (attempt === maxRetries || !isTransient) {
        console.error(`❌ Gemini API galutinai palūžo po ${maxRetries} bandymų.`);
        throw error;
      }

      // Eksponentinis laukimas: 3s, 6s, 12s...
      const waitTime = delayMs * Math.pow(2, attempt - 1);
      console.warn(`⚠️ Gauta ${status || 'tinklo'} klaida. Bandymas ${attempt}/${maxRetries} nepavyko. Kartojame po ${Math.round(waitTime / 1000)}s...`);
      
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }
}

  const response = await callGeminiWithRetry(async () => { 
    return await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });
  });

  const storyText = response.text.trim();

  // 1. Įrašome epizodą į logus (JSONL ir Markdown)
  saveCycleToLog(world, storyText);

  // 2. Generuojame atskirą HTML peržiūrai
  const htmlContent = `<!DOCTYPE html>
<html lang="lt">
<head>
    <meta charset="UTF-8">
    <title>BUDI // CIKLAS ${world.cycle_id}</title>
    <style>
        body { background: #080c10; color: #a3c2c6; font-family: monospace; padding: 40px; max-width: 800px; margin: 0 auto; line-height: 1.6; }
        h1 { color: #00f3ff; font-size: 1.2rem; border-bottom: 1px solid #00f3ff44; padding-bottom: 10px; }
        .meta { color: #527075; font-size: 0.85rem; margin-bottom: 30px; }
        .content { white-space: pre-line; background: #0d141c; padding: 25px; border-left: 3px solid #00f3ff; }
        .fragment-info { margin-top: 30px; font-size: 0.8rem; color: #527075; border-top: 1px dashed #52707544; padding-top: 15px; }
    </style>
</head>
<body>
    <h1>[ BUDI_SIMULATION // CIKLAS ${world.cycle_id} ]</h1>
    <div class="meta">DATA: ${world.last_updated} | EMOCINIS KRŪVIS: ${world.telemetry.emotional_load} | ŠALTINIS: ${episode.real_world_fact}</div>
    <div class="content">${storyText}</div>
    <div class="fragment-info">
      <strong>Panaudotas teksto fragmentas:</strong> ${episode.fragment.chapter} (${episode.fragment.setting}) — "${episode.fragment.text}"
    </div>
</body>
</html>`;

  fs.mkdirSync('docs', { recursive: true });
  fs.writeFileSync('docs/index.html', htmlContent); 
  console.log('✅ Epizodas sugeneruotas: output/index.html');
}

runSimulation().catch(console.error);
