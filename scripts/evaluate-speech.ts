/**
 * Offline accuracy check for the Speech (S) sign's scoring approach against
 * TORGO (dysarthric speech corpus, https://huggingface.co/datasets/abnerh/TORGO-database).
 *
 * The app's own word-accuracy function (transcriptAccuracy from src/lib/scoring.ts)
 * is exercised exactly as shipped. What's substituted is the ASR itself: the app
 * uses the browser's Web Speech API, which can't run outside a live browser tab,
 * so this script uses a local Whisper model (via @huggingface/transformers) as a
 * stand-in transcriber. The question being tested is narrower than "does the app
 * detect dysarthria" — it's "does word-accuracy-vs-target correlate with dysarthria
 * at all", using whatever transcript a reasonable ASR produces.
 *
 * Usage:
 *   bun run scripts/evaluate-speech.ts [samplesPerClass] [whisperModel]
 *
 * e.g. bun run scripts/evaluate-speech.ts 50 Xenova/whisper-base.en
 *
 * Expects scripts/eval-data/torgo-shard0.parquet (all "healthy") and
 * torgo-shard3.parquet (all "dysarthria") already downloaded — see
 * scripts/eval-data/README.md.
 */
import { parquetReadObjects } from "hyparquet";
import { readFileSync } from "fs";
import { pipeline } from "@huggingface/transformers";
import {
  transcriptAccuracy,
  SPEECH_ACCURACY_POSITIVE,
  SPEECH_ACCURACY_UNCERTAIN,
} from "../src/lib/scoring";
import {
  rocCurve,
  auc,
  metricsAt,
  thresholdForSensitivity,
  type LabeledScore,
} from "../src/lib/evaluation";
import { decodeWavPcm, resampleLinear, toBytes } from "./lib/wav";

const TARGET_SAMPLE_RATE = 16000;

type TorgoRow = {
  audio: { bytes: unknown; path: string };
  transcription: string;
  speech_status: string;
  gender: string;
  duration: number;
};

async function loadShard(path: string, count: number): Promise<TorgoRow[]> {
  const buf = readFileSync(path);
  const arrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const all = (await parquetReadObjects({ file: arrayBuffer })) as TorgoRow[];
  // Evenly spaced picks, not the first N, so a handful of speakers/sessions
  // grouped at the start of the shard don't dominate the sample.
  // Restricted to multi-word sentences, matching how the app actually uses
  // this sign (reading a fixed phrase, not isolated words) — Whisper-tiny
  // also hallucinates badly on TORGO's single-word clips regardless.
  // (Restricting further to the close head-worn mic, ruling out the
  // far-field array mic's room noise/reverb as the culprit, was tried and
  // made no difference to the result below — so both mic types are kept.)
  const sentences = all.filter((r) => r.transcription.trim().split(/\s+/).length >= 4);
  const stride = Math.max(1, Math.floor(sentences.length / count));
  const picked: TorgoRow[] = [];
  for (let i = 0; i < sentences.length && picked.length < count; i += stride) {
    picked.push(sentences[i]!);
  }
  return picked;
}

async function main() {
  const samplesPerClass = Number(process.argv[2] ?? 15);
  const whisperModel = process.argv[3] ?? "Xenova/whisper-tiny.en";
  console.log(`Loading ${samplesPerClass} samples per class from TORGO shards...`);

  const [healthy, dysarthric] = await Promise.all([
    loadShard("./scripts/eval-data/torgo-shard0.parquet", samplesPerClass),
    loadShard("./scripts/eval-data/torgo-shard3.parquet", samplesPerClass),
  ]);
  const rows = [...healthy, ...dysarthric];
  console.log(`Loaded ${healthy.length} healthy + ${dysarthric.length} dysarthric clips.`);

  console.log(`Loading ${whisperModel}...`);
  const transcriber = await pipeline("automatic-speech-recognition", whisperModel, {
    dtype: "fp32",
  });

  const results: (LabeledScore & { reference: string; recognized: string; gender: string })[] = [];
  for (const [i, row] of rows.entries()) {
    try {
      const wav = decodeWavPcm(toBytes(row.audio.bytes));
      const audio = resampleLinear(wav.samples, wav.sampleRate, TARGET_SAMPLE_RATE);
      const output = (await transcriber(audio)) as { text: string };
      // Whisper occasionally loops into a long repeated-token hallucination on
      // ambiguous audio; transcriptAccuracy's LCS is O(target*said), so an
      // unbounded "said" length would blow up cost for a garbage result that
      // was never going to score well anyway.
      const recognized = output.text.trim().split(/\s+/).slice(0, 50).join(" ");
      const accuracy = transcriptAccuracy(row.transcription, recognized);
      const score = 1 - accuracy;
      results.push({
        score,
        positive: row.speech_status === "dysarthria",
        id: row.audio.path,
        reference: row.transcription,
        recognized,
        gender: row.gender,
      });
      console.log(
        `[${i + 1}/${rows.length}] ${row.speech_status.padEnd(10)} acc=${accuracy.toFixed(2)}  "${row.transcription}" -> "${recognized.slice(0, 80)}"`,
      );
    } catch (e) {
      console.warn(
        `[${i + 1}/${rows.length}] SKIPPED (${row.audio.path}): ${(e as Error).message}`,
      );
    }
  }

  console.log("\n=== Accuracy of the scoring approach (word-accuracy vs. target) ===");
  const curve = rocCurve(results);
  console.log(
    `AUC: ${auc(curve).toFixed(3)} (0.5 = no better than chance, 1.0 = perfect separation)`,
  );

  const appPositiveThreshold = 1 - SPEECH_ACCURACY_POSITIVE;
  const appUncertainThreshold = 1 - SPEECH_ACCURACY_UNCERTAIN;
  console.log("\nCurrent app thresholds, reinterpreted as this script's score:");
  console.log(
    `  "positive" cut (accuracy < ${SPEECH_ACCURACY_POSITIVE}):`,
    metricsAt(results, appPositiveThreshold),
  );
  console.log(
    `  "uncertain" cut (accuracy < ${SPEECH_ACCURACY_UNCERTAIN}):`,
    metricsAt(results, appUncertainThreshold),
  );

  const calibrated = thresholdForSensitivity(results, 0.9);
  console.log(
    "\nBest threshold for >=90% sensitivity (CONCLUSION.md's recommended calibration approach):",
  );
  console.log(calibrated ?? "No threshold in this sample reaches 90% sensitivity.");
}

main();
