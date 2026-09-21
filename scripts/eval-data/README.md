# Evaluation datasets

Downloaded files are gitignored (hundreds of MB each) — fetch them yourself:

```sh
mkdir -p scripts/eval-data scripts/eval-data/palsynet

# TORGO (all 4 shards — labels aren't evenly split per shard, see below)
for n in 0 1 2 3; do
  curl -L -o scripts/eval-data/torgo-shard$n.parquet \
    "https://huggingface.co/datasets/abnerh/TORGO-database/resolve/main/data/train-0000$n-of-00004.parquet"
done

# PalsyNet (49 videos, ~270MB total)
for i in $(seq 1 27); do
  curl -sL -o scripts/eval-data/palsynet/affected-$i.mp4 \
    "https://huggingface.co/datasets/jasir/palsynet-data/resolve/main/data/affected/$i.mp4"
done
for i in $(seq 1 22); do
  curl -sL -o scripts/eval-data/palsynet/unaffected-$i.mp4 \
    "https://huggingface.co/datasets/jasir/palsynet-data/resolve/main/data/unaffected/$i.mp4"
done
```

## TORGO (dysarthric speech), used by `scripts/evaluate-speech.ts`

https://huggingface.co/datasets/abnerh/TORGO-database — no gate, CC-licensed for
academic use, cite Rudzicz et al. 4 shards, ~390MB each, 16,552 rows total.

Quirks found while building the harness:

- **Labels aren't evenly split per shard.** Shards 0 and 1 are 100% `healthy`,
  shard 3 is 100% `dysarthria`, shard 2 is mixed (2,702 healthy / 1,436
  dysarthria). `evaluate-speech.ts` pools all 4 shards before sampling by class.
- **A handful of rows have a corrupt WAV header** — one byte short in the
  RIFF chunk-size field, which shifts everything after it. `scripts/lib/wav.ts`'s
  decoder throws on these; `evaluate-speech.ts` catches per-row and skips
  rather than aborting the whole run.
- **The declared `data` chunk size can exceed the actual bytes present**
  (an unfinalised size field from however TORGO's WAVs were originally
  captured). The decoder clamps to the buffer's actual length.
- **Includes both isolated single words and full sentences** ("short words
  and restricted sentence" per the dataset card). Of the full 16,552 rows,
  only 4,134 are sentence-length (2,835 healthy / 1,299 dysarthria) — the rest
  are single words, which `evaluate-speech.ts` filters out (>=4 words kept).
  This matches how the app actually uses this sign (reading a fixed
  multi-word phrase), and Whisper hallucinates badly on isolated words regardless.
- **Audio is mono 16-bit PCM at ~16,125 Hz**, not the 16,000 Hz Whisper
  expects — `resampleLinear` in `scripts/lib/wav.ts` handles the ~0.8% correction.

## Results so far (Speech)

The app's own word-accuracy function (`transcriptAccuracy`) runs unmodified;
what's substituted is the ASR, since the app's browser Web Speech API can't
run outside a live tab. Runs of `bun run scripts/evaluate-speech.ts N [model]`,
sampled across all 4 TORGO shards:

| n | Model | AUC |
|---|---|---|
| ~95 | whisper-tiny.en | 0.487 |
| ~95 (head mic only, ruling out array-mic room noise as a confound) | whisper-tiny.en | 0.484 |
| ~95 | whisper-base.en | 0.597 |
| ~95 | whisper-small.en | 0.539 |
| **562** (all available sentence clips, up to 300/class) | **whisper-base.en** | **0.608** |

**Reading this honestly**: at n≈95, tiny (0.487) → base (0.597) → small
(0.539) wasn't a monotonic trend — plausibly the same weak effect seen
through sampling noise rather than three decisive answers. The n=562 run with
`whisper-base.en` (chosen as the best performer at n≈95, not re-swept across
models to avoid fishing) landed at essentially the same place as its n≈95
result (0.597 → 0.608), which is reassuring: it's consistent with a real,
if modest, effect rather than noise that would have moved substantially with
5x the sample. **A weak, non-clinically-useful but real-looking signal —
AUC 0.608 is well short of the ~0.8+ a usable screening test would want.**

All Whisper sizes badly mistranscribe *both* healthy and dysarthric TORGO
speakers on this Harvard-sentence material often enough to swamp much of
whatever dysarthria-specific signal word-accuracy might otherwise carry (see
the per-sample logs — "healthy" transcripts routinely come back as "You",
repeated-character hallucinations, or unrelated short phrases). None of this
confirms or rules out whether the app's *actual* pipeline (the browser's Web
Speech API — generally far more capable than any of these offline Whisper
sizes — on close, deliberate near-field speech, against a short target
phrase read on-demand rather than TORGO's fixed Harvard sentences) would do
better. It means this offline substitute gives a weak positive signal, not a
confident answer about the shipped app.

## PalsyNet (facial palsy video), used by `scripts/evaluate-face.ts`

https://huggingface.co/datasets/jasir/palsynet-data — gate-free, CC-BY-4.0.
**Correction to earlier research in this file**: this was previously
documented as "only 2 patient videos, no structured labels" — that was
wrong. It actually has **49 labelled videos** (27 `affected` / 22
`unaffected`), curated from public YouTube footage of people with and
without Bell's palsy, ~270MB total, clips averaging ~100s (30-150s range).
Verify counts yourself before trusting either version: `curl -s
https://huggingface.co/api/datasets/jasir/palsynet-data` and count the
`data/affected/*` and `data/unaffected/*` entries in `siblings`.

Unlike the Speech harness, `evaluate-face.ts` runs the app's *actual*,
unmodified pipeline — `@mediapipe/tasks-vision` needs a real `document`,
which plain Node/Bun doesn't have (confirmed: it throws `ReferenceError:
document is not defined` on `FaceLandmarker.createFromOptions`), so this
drives a real headless Chromium tab via Playwright instead of substituting
anything. `faceAsymmetry()` from `src/lib/faceFeatures.ts` is transpiled
with `Bun.build` and injected into the page — the exact function the app
ships, not a reimplementation. One `FaceLandmarker` instance and one page
are reused across all videos; each video is seeked through at 1.5s
intervals (clips run long enough that finer resolution would mean 15,000+
`detect()` calls for little benefit) and scored by peak asymmetry index
over the whole clip.

## Results so far (Face)

`bun run scripts/evaluate-face.ts 30` (all 49 videos — the class sizes are
27 and 22, both under the 30 cap):

| n | AUC |
|---|---|
| 49 (all of PalsyNet) | **0.468** |

**Indistinguishable from chance, using the app's real unmodified scoring
function** — no ASR-style substitution needed here, which makes this a
cleaner test than the Speech result in one sense. At the app's current
"positive" threshold (index ≥ 0.3): sensitivity 63%, specificity 27%,
barely above coin-flip on both axes.

**Caveat that keeps this from being a clean verdict on the metric itself**:
PalsyNet's clips are unstructured YouTube footage of people talking (often
interviews or testimonials), not the app's specific directed protocol —
hold neutral, then smile, then raise both eyebrows. `faceAsymmetry()` is
tuned around exactly that three-step elicitation; taking the peak index
over ~100s of a person just talking may or may not touch the same
expressions, at unpredictable head angles and lighting compared to someone
following the app's on-screen instructions. This is the Face-side analogue
of the Speech harness substituting Whisper for the Web Speech API: a real,
honestly negative result, but on a different elicitation protocol than the
app itself uses — not proof the app's approach fails on its own protocol.

## Other facial-palsy datasets considered

- **YouTube Facial Palsy (YFP) database** — https://sites.google.com/view/yfp-database
  — has per-region (eyes/mouth) severity labels from a 3-clinician
  consensus (32 videos, 21 patients) rather than PalsyNet's binary label,
  so it's the better dataset if/when access comes through. Requires emailing
  the maintainers from an institutional address and signing a research-use,
  no-redistribution agreement; password issued in 3–7 business days. A
  ready-to-send request is below.
- **Kaggle "Facial_Droop_and_Facial_Paralysis_image"** — **do not use.**
  Removed from Kaggle in July 2026 for copyright infringement: it contained
  celebrity photos misrepresented as stroke patients with no confirmed
  diagnoses, and had already been used in a since-retracted paper. See
  https://retractionwatch.com/2026/07/29/kaggle-removes-problematic-stroke-dataset-for-copyright-infringement/
- **IEEE DataPort "Facial Paralysis Dataset"** — appears to be precomputed
  dense-trajectory features, not raw video; requires an IEEE account; not
  independently verified as usable for this project's feature extraction.
- **`QuanDuc/FacialPalsyData` (Hugging Face)** — https://huggingface.co/datasets/QuanDuc/FacialPalsyData
  — structurally the best-labelled option found: 14,391 images split by
  region (Eye / Eyebrow / Mouth) and by 4-level severity (Mild / Moderate /
  Moderate-severe / Severe), gated but accessible via a self-serve "agree to
  share contact info" click (no email/institution needed) rather than YFP's
  multi-day process. **But treat with real suspicion before using it**: no
  license, no README describing collection methodology or how severity was
  graded, no stated patient consent, zero citing papers found, and the
  uploader account was created days before this was written with only this
  one upload and no other footprint. That's the same red-flag shape as the
  Kaggle dataset above (unverifiable provenance), just not yet confirmed
  either way — it may be perfectly legitimate research data with sparse
  metadata, or it may not be. **Also has no healthy/normal images at all**
  (every category is a palsy severity grade), so it can only support a
  severity-correlation check among affected samples, not a PalsyNet-style
  affected-vs-unaffected AUC. If access is requested and granted, inspect the
  images themselves for consistency (watermarks, mixed provenance, obviously
  stock/celebrity photos) before relying on any result from it.
- **MEEI Facial Palsy Standard Set** (Massachusetts Eye and Ear / Sir Charles
  Bell Society) — real, peer-reviewed (Greene et al., *Laryngoscope* 2020),
  well-documented, and the only one found with true healthy controls (65
  photo/video sets, 10 normal + palsy patients, flaccid and synkinetic
  equally represented). **Not realistically accessible for this project**:
  distributed only to Sir Charles Bell Society members, and membership is
  restricted to healthcare professionals (or trainees with a program
  director's letter) — https://www.sircharlesbell.com/. Documented here so
  nobody re-discovers this dead end.

### Draft request email for YFP access

Requires sending from an institutional (university) email address — this
step can't be done on the project's behalf. Cc both contacts listed on the
database's homepage.

```
To: avlabdba@gmail.com
Cc: jison@mail.ntust.edu.tw
Subject: Research access request — YouTube Facial Palsy (YFP) Database

Dear Prof. Hsu and AVLab team,

I am [name], [role/program] at [institution], requesting research access to
the YouTube Facial Palsy (YFP) Database for a non-commercial student project
evaluating facial-asymmetry measurement methods for a stroke-symptom
screening prototype (BEFAST AI: https://github.com/Dhamper/befast-buddy).

The dataset would be used only to test whether an existing facial-asymmetry
metric (derived from MediaPipe face-landmark blendshapes) correlates with the
per-region palsy severity labels in YFP — no redistribution, no commercial
use, and no re-publication of the underlying video/image data.

I agree to the database's research-use terms and can sign whatever agreement
is required. Please let me know the next steps.

Thank you,
[name]
[institutional email / affiliation]
```
