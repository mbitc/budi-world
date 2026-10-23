import fs from 'fs';
import path from 'path';
import { NARRATIVE_FRAGMENTS } from './narrative_fragments.js';

const RAW_CYCLES_URL = 'https://raw.githubusercontent.com/mbitc/hype-feed-10c/main/docs/cycles.jsonl';

export async function updateWorldState() {
  const worldStatePath = path.resolve('data/world_state.json');
  if (!fs.existsSync(worldStatePath)) {
    throw new Error(`KLAIDA: Nerastas pasaulio būsenos failas: ${worldStatePath}`);
  }

  const world = JSON.parse(fs.readFileSync(worldStatePath, 'utf8'));
  world.cycle_id += 1;

  // 1. Parenkame naratyvinį fragmentą
  const fragmentIndex = world.cycle_id % NARRATIVE_FRAGMENTS.length;
  const activeFragment = NARRATIVE_FRAGMENTS[fragmentIndex];

  // 2. Nuskaitome naujienų logus iš GitHub
  let selectedFact = { title: "Tylos būsena mazge", load: 0.0 };
  try {
    const response = await fetch(RAW_CYCLES_URL);
    if (response.ok) {
      const fileContent = await response.text();
      const lines = fileContent.trim().split('\n').filter(Boolean);
      if (lines.length > 0) {
        const lastEntry = JSON.parse(lines[lines.length - 1]);
        const allFacts = [...(lastEntry.mainFacts || []), ...(lastEntry.balancing || [])];
        if (allFacts.length > 0) {
          selectedFact = allFacts[world.cycle_id % allFacts.length];
        }
      }
    }
  } catch (err) {
    console.warn(`⚠️ Tinklo klaida skaitant logus: ${err.message}`);
  }

  const load = selectedFact.load ? parseFloat(((selectedFact.load + 1) / 2).toFixed(2)) : 0.5;

  // 3. Charakterių mutacija pagal krūvį
  world.characters.forEach(char => {
    const fatigueDelta = Math.floor((load - 0.4) * 10);
    char.dynamic_state.fatigue = Math.min(100, Math.max(10, char.dynamic_state.fatigue + fatigueDelta));
  });

  // 4. Sukuriame šio ciklo epizodo kontekstą
  world.current_episode = {
    fragment: activeFragment,
    real_world_fact: selectedFact.title,
    emotional_load: load
  };

  world.telemetry = {
    emotional_load: load,
    dominant_sentiment: load > 0.6 ? 'industrial_paranoia' : 'neutral_drift'
  };

  world.last_updated = new Date().toISOString().split('T')[0];
  fs.writeFileSync(worldStatePath, JSON.stringify(world, null, 2));

  return world;
}

/**
 * Kaupia sugeneruotus epizodus į JSONL ir Markdown žurnalus
 */
export function saveCycleToLog(world, storyText) {
  const timestamp = new Date().toISOString();
  
  // 1. Struktūrizuotas įrašas į JSONL logą (data/episodes_log.jsonl)
  const logEntry = {
    timestamp,
    cycle_id: world.cycle_id,
    date: world.last_updated,
    real_world_fact: world.current_episode.real_world_fact,
    fragment_id: world.current_episode.fragment.id,
    fragment_setting: world.current_episode.fragment.setting,
    emotional_load: world.telemetry.emotional_load,
    sentiment: world.telemetry.dominant_sentiment,
    character_states: world.characters.map(c => ({
      id: c.id,
      fatigue: c.dynamic_state.fatigue,
      isolation: c.dynamic_state.isolation_index
    })),
    text: storyText
  };

  fs.mkdirSync('data', { recursive: true });
  fs.appendFileSync('data/episodes_log.jsonl', JSON.stringify(logEntry) + '\n');

  // 2. Skaitomas tekstinis archyvas Markdown formatu (output/episodes_archive.md)
  const mdHeader = fs.existsSync('output/episodes_archive.md') ? '' : '# BUDI SIMULIACIJOS EPIZODŲ ŽURNALAS\n\n';
  const mdEntry = `## [ CIKLAS ${world.cycle_id} ] — ${world.last_updated}
- **Faktas:** "${world.current_episode.real_world_fact}"
- **Fragmentas:** ${world.current_episode.fragment.setting} (\`${world.current_episode.fragment.id}\`)
- **Emocinis krūvis:** ${world.telemetry.emotional_load} | **Sentimentas:** ${world.telemetry.dominant_sentiment}

${storyText}

---

`;

  fs.mkdirSync('output', { recursive: true });
  fs.appendFileSync('output/episodes_archive.md', mdHeader + mdEntry);

  // 3. Išsaugojame trumpą iškarpą į giliojo istorijos buferį world_state.json faile
  const worldStatePath = path.resolve('data/world_state.json');
  if (!world.history) world.history = [];
  
  world.history.push({
    cycle: world.cycle_id,
    fact: world.current_episode.real_world_fact,
    summary: storyText.substring(0, 180) + '...'
  });

  if (world.history.length > 5) world.history.shift();
  fs.writeFileSync(worldStatePath, JSON.stringify(world, null, 2));

  console.log(`📜 Epizodas įrašytas į žurnalus: data/episodes_log.jsonl ir output/episodes_archive.md`);
}
