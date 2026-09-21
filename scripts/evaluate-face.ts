/**
 * Offline accuracy check for the Face (F) sign's scoring approach against
 * PalsyNet (facial palsy videos, https://huggingface.co/datasets/jasir/palsynet-data).
 *
 * Unlike the Speech harness, this runs the app's *actual* MediaPipe pipeline
 * unmodified — @mediapipe/tasks-vision needs a real `document`, which plain
 * Node/Bun doesn't have, so this drives a real headless Chromium tab via
 * Playwright instead of substituting anything. faceAsymmetry() from
 * src/lib/faceFeatures.ts is transpiled with Bun.build and injected into the
 * page, so it's the exact same scoring function the app ships, not a copy.
 *
 * Usage:
 *   bun run scripts/evaluate-face.ts [samplesPerClass]
 *
 * Expects scripts/eval-data/palsynet/{affected,unaffected}-N.mp4 already
 * downloaded — see scripts/eval-data/README.md.
 */
import { chromium } from "playwright";
import { readdirSync } from "fs";
import type { Blendshape, FaceAsymmetry } from "../src/lib/faceFeatures";
import {
  rocCurve,
  auc,
  metricsAt,
  thresholdForSensitivity,
  type LabeledScore,
} from "../src/lib/evaluation";
import { FACE_ASYM_POSITIVE, FACE_ASYM_UNCERTAIN } from "../src/lib/scoring";

declare global {
  interface Window {
    landmarker: {
      detect: (v: HTMLVideoElement) => { faceBlendshapes?: { categories: Blendshape[] }[] };
    };
    faceFeatures: { faceAsymmetry: (categories: Blendshape[]) => FaceAsymmetry };
  }
}

const VIDEO_DIR = "./scripts/eval-data/palsynet";
// PalsyNet clips run 30-150s of someone slowly performing facial movements
// (smile, raise eyebrows, ...) a few times — that's a much slower signal
// than 0.3s resolution would suggest, and at ~100s average duration, a fine
// step would mean 15,000+ detect() calls across 49 videos.
const SEEK_STEP_S = 1.5;
const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

async function buildFaceFeaturesScript(): Promise<string> {
  const result = await Bun.build({ entrypoints: ["./src/lib/faceFeatures.ts"], format: "esm" });
  const code = await result.outputs[0]!.text();
  // The app's actual module, minus its `export {...}` tail (browser globals
  // instead, since this runs as a plain injected <script>, not an ES module).
  return code.replace(/export\s*{[^}]*};?\s*$/, "") + "\nwindow.faceFeatures = { faceAsymmetry };";
}

function stridePick<T>(items: T[], count: number): T[] {
  const stride = Math.max(1, Math.floor(items.length / count));
  const picked: T[] = [];
  for (let i = 0; i < items.length && picked.length < count; i += stride) picked.push(items[i]!);
  return picked;
}

async function main() {
  const samplesPerClass = Number(process.argv[2] ?? 30);
  const files = readdirSync(VIDEO_DIR).filter((f) => f.endsWith(".mp4"));
  const affected = stridePick(
    files.filter((f) => f.startsWith("affected-")),
    samplesPerClass,
  );
  const unaffected = stridePick(
    files.filter((f) => f.startsWith("unaffected-")),
    samplesPerClass,
  );
  const videos = [...affected, ...unaffected];
  console.log(`Evaluating ${affected.length} affected + ${unaffected.length} unaffected clips.`);

  const faceFeaturesScript = await buildFaceFeaturesScript();

  const server = Bun.serve({
    port: 0,
    fetch(req) {
      const name = new URL(req.url).pathname.slice(1);
      if (files.includes(name)) return new Response(Bun.file(`${VIDEO_DIR}/${name}`));
      return new Response(`<!doctype html><video id="v" muted playsinline></video>`, {
        headers: { "Content-Type": "text/html" },
      });
    },
  });

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`http://localhost:${server.port}/`);
  await page.addScriptTag({ content: faceFeaturesScript });
  // One FaceLandmarker for the whole run, not one per video — model load is
  // ~1-3s of its own and there's no reason to pay it 49 times.
  await page.evaluate(
    async ({ wasmUrl, modelUrl }) => {
      const vision = await import(
        /* @vite-ignore */ "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/vision_bundle.mjs"
      );
      const fileset = await vision.FilesetResolver.forVisionTasks(wasmUrl);
      window.landmarker = await vision.FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: modelUrl, delegate: "CPU" },
        runningMode: "IMAGE",
        outputFaceBlendshapes: true,
        numFaces: 1,
      });
    },
    { wasmUrl: WASM_URL, modelUrl: MODEL_URL },
  );

  const results: (LabeledScore & { file: string })[] = [];
  for (const [i, file] of videos.entries()) {
    try {
      const peak = await page.evaluate(
        async ({ file, seekStep }) => {
          const landmarker = window.landmarker;
          const v = document.getElementById("v") as HTMLVideoElement;
          v.src = "/" + file;
          await new Promise<void>((resolve, reject) => {
            if (v.readyState >= 1) return resolve();
            v.onloadedmetadata = () => resolve();
            v.onerror = () => reject(new Error(v.error?.message ?? "video load error"));
          });

          let peakIndex = 0;
          for (let t = 0; t < v.duration; t += seekStep) {
            await new Promise<void>((resolve) => {
              v.onseeked = () => resolve();
              v.currentTime = t;
            });
            const res = landmarker.detect(v);
            const categories = res.faceBlendshapes?.[0]?.categories;
            if (categories) {
              const { index } = window.faceFeatures.faceAsymmetry(categories);
              peakIndex = Math.max(peakIndex, index);
            }
          }
          return peakIndex;
        },
        { file, seekStep: SEEK_STEP_S },
      );

      results.push({ score: peak, positive: file.startsWith("affected-"), id: file, file });
      console.log(
        `[${i + 1}/${videos.length}] ${file.padEnd(20)} peak asymmetry index = ${peak.toFixed(3)}`,
      );
    } catch (e) {
      console.warn(`[${i + 1}/${videos.length}] SKIPPED (${file}): ${(e as Error).message}`);
    }
  }

  await browser.close();
  server.stop();

  console.log("\n=== Accuracy of the scoring approach (peak facial asymmetry index) ===");
  const curve = rocCurve(results);
  console.log(
    `AUC: ${auc(curve).toFixed(3)} (0.5 = no better than chance, 1.0 = perfect separation)`,
  );

  console.log("\nCurrent app thresholds:");
  console.log(
    `  "positive" cut (index >= ${FACE_ASYM_POSITIVE}):`,
    metricsAt(results, FACE_ASYM_POSITIVE),
  );
  console.log(
    `  "uncertain" cut (index >= ${FACE_ASYM_UNCERTAIN}):`,
    metricsAt(results, FACE_ASYM_UNCERTAIN),
  );

  const calibrated = thresholdForSensitivity(results, 0.9);
  console.log("\nBest threshold for >=90% sensitivity:");
  console.log(calibrated ?? "No threshold in this sample reaches 90% sensitivity.");
}

main();
