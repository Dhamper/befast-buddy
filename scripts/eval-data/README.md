# Evaluation datasets

Downloaded files are gitignored (hundreds of MB each) — fetch them yourself:

```sh
mkdir -p scripts/eval-data
curl -L -o scripts/eval-data/torgo-shard0.parquet \
  https://huggingface.co/datasets/abnerh/TORGO-database/resolve/main/data/train-00000-of-00004.parquet
curl -L -o scripts/eval-data/torgo-shard3.parquet \
  https://huggingface.co/datasets/abnerh/TORGO-database/resolve/main/data/train-00003-of-00004.parquet
```

## TORGO (dysarthric speech), used by `scripts/evaluate-speech.ts`

https://huggingface.co/datasets/abnerh/TORGO-database — no gate, CC-licensed for
academic use, cite Rudzicz et al. 4 shards, ~390MB each, 16,552 rows total.

Quirks found while building the harness:

- **Shards are grouped by label, not shuffled.** Shard 0 is 100% `healthy`,
  shard 3 is 100% `dysarthria` (didn't check 1/2). Sample from both ends.
- **A handful of rows have a corrupt WAV header** — one byte short in the
  RIFF chunk-size field, which shifts everything after it. `scripts/lib/wav.ts`'s
  decoder throws on these; `evaluate-speech.ts` catches per-row and skips
  rather than aborting the whole run.
- **The declared `data` chunk size can exceed the actual bytes present**
  (an unfinalised size field from however TORGO's WAVs were originally
  captured). The decoder clamps to the buffer's actual length.
- **Includes both isolated single words and full sentences** ("short words
  and restricted sentence" per the dataset card). `evaluate-speech.ts` filters
  to sentences (>=4 words) — this matches how the app actually uses this sign
  (reading a fixed multi-word phrase), and Whisper-tiny hallucinates badly on
  isolated words regardless.
- **Audio is mono 16-bit PCM at ~16,125 Hz**, not the 16,000 Hz Whisper
  expects — `resampleLinear` in `scripts/lib/wav.ts` handles the ~0.8% correction.

## Results so far (Speech)

Runs of `bun run scripts/evaluate-speech.ts 50 [model]` (~95 samples after a
few corrupt-header rows were skipped), evenly sampled across both TORGO shards:

| Variant | Model | AUC |
|---|---|---|
| Sentences, both array + head mic | whisper-tiny.en | 0.487 |
| Sentences, head mic only (ruling out array-mic room noise/reverb as a confound) | whisper-tiny.en | 0.484 |
| Sentences, both mics | whisper-base.en | 0.597 |
| Sentences, both mics | whisper-small.en | 0.539 |

**Reading this honestly**: there is no clean "bigger model = better signal"
trend here — tiny (0.487) → base (0.597) → small (0.539) is not monotonic.
With n≈95 per run, an AUC anywhere in roughly 0.49–0.60 is plausibly the same
underlying effect viewed through sampling noise. The defensible conclusion
from three model sizes is: **a weak, uncertain signal that a bigger sample
size would be needed to pin down — not a validated result, and not a clean
story of "ASR quality is all that mattered" either.** All three offline
Whisper sizes badly mistranscribe *both* healthy and dysarthric TORGO
speakers on this Harvard-sentence material often enough to swamp much of
whatever dysarthria-specific signal word-accuracy might carry (see the
per-sample logs — "healthy" transcripts routinely come back as "You",
repeated-character hallucinations, or unrelated short phrases).

Stopping the model-size sweep here rather than trying more sizes: three
points already show the noise is on the same order as any trend, and picking
whichever model looks best after enough tries would be fishing, not evidence.

None of this confirms or rules out whether the app's *actual* pipeline (the
browser's Web Speech API — generally far more capable than any of these
offline Whisper sizes — on close, deliberate near-field speech, against a
short target phrase read on-demand rather than TORGO's fixed Harvard
sentences) would do better. It specifically means none of these offline
substitutes give a confident answer either way yet; a larger sample (all
16,552 TORGO rows, not a ~50-per-class slice) is the next lever, not a
different model size.

## Facial palsy (not yet integrated)

No dataset was found that's both directly downloadable and has usable
severity/laterality labels. Options checked:

- **YouTube Facial Palsy (YFP) database** — https://sites.google.com/view/yfp-database
  — the realistic option. 32 videos of 21 patients, per-region (eyes/mouth)
  severity labels from a 3-clinician consensus. Requires emailing the
  maintainers from an institutional (`.edu`-equivalent) address and signing a
  research-use, no-redistribution agreement; password issued in 3–7 business
  days. A ready-to-send request is below.
- **PalsyNet** (Hugging Face, `jasir/palsynet-data`) — gate-free, but only 2
  patients and no structured labels. Not usable as an eval set on its own.
- **Kaggle "Facial_Droop_and_Facial_Paralysis_image"** — **do not use.**
  Removed from Kaggle in July 2026 for copyright infringement: it contained
  celebrity photos misrepresented as stroke patients with no confirmed
  diagnoses, and had already been used in a since-retracted paper. See
  https://retractionwatch.com/2026/07/29/kaggle-removes-problematic-stroke-dataset-for-copyright-infringement/
- **IEEE DataPort "Facial Paralysis Dataset"** — appears to be precomputed
  dense-trajectory features, not raw video; requires an IEEE account; not
  independently verified as usable for this project's feature extraction.

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
