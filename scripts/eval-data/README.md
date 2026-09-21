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

Two runs of `bun run scripts/evaluate-speech.ts 50` (~95 samples after a few
corrupt-header rows were skipped), evenly sampled across both TORGO shards:

| Variant | AUC |
|---|---|
| Sentences, both array + head mic | 0.487 |
| Sentences, head mic only (ruling out array-mic room noise/reverb as a confound) | 0.484 |

Both are statistically indistinguishable from chance (0.5). **Reading this
honestly**: with Whisper-tiny standing in for the browser's Web Speech API,
word-accuracy-vs-target-phrase shows no detectable ability to separate TORGO's
healthy and dysarthric speakers at this sample size. Whisper-tiny badly
mistranscribes *both* groups on TORGO's Harvard-sentence material regardless
of speaker health (see the per-sample log — "healthy" transcripts come back
as "You", repeated-character hallucinations, or unrelated short phrases about
as often as "dysarthric" ones do), which swamps whatever signal the word
accuracy metric might otherwise carry.

This does not confirm or rule out whether the app's *actual* pipeline (the
browser's Web Speech API, on close, deliberate near-field speech, against a
short target phrase read on-demand rather than TORGO's fixed Harvard
sentences) would do better — it specifically means this offline substitute
setup isn't a valid stand-in for that. A stronger open ASR model (e.g.
Whisper `base`/`small` instead of `tiny`) is the next thing to try before
concluding the *scoring metric itself* is at fault; that hasn't been done yet.

## Facial palsy (not yet integrated)

No dataset was found that's both directly downloadable and has usable
severity/laterality labels — see the project conclusion / conversation history
for the research summary. The realistic option (YouTube Facial Palsy database,
https://sites.google.com/view/yfp-database) requires emailing the maintainers
from an institutional address and signing a research-use agreement (3–7
business days). PalsyNet on Hugging Face is gate-free but only has 2 patients
and no structured labels — not usable as an eval set on its own.
