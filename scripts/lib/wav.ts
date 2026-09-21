/** Minimal RIFF/WAV PCM decoder — just enough for TORGO's mono 16-bit clips. */

export type DecodedWav = {
  sampleRate: number;
  channels: number;
  /** Mono, normalised to [-1, 1]. */
  samples: Float32Array;
};

/** hyparquet returns parquet BYTE_ARRAY columns as binary strings, not Uint8Array. */
export function toBytes(value: unknown): Uint8Array {
  if (value instanceof Uint8Array) return value;
  if (typeof value === "string") return Uint8Array.from(value, (c) => c.charCodeAt(0) & 0xff);
  return new Uint8Array(value as ArrayBufferLike);
}

export function decodeWavPcm(bytes: Uint8Array): DecodedWav {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (offset: number) => String.fromCharCode(...bytes.slice(offset, offset + 4));
  if (tag(0) !== "RIFF" || tag(8) !== "WAVE") throw new Error("Not a RIFF/WAVE file");

  let offset = 12;
  let sampleRate = 0;
  let channels = 0;
  let bitsPerSample = 0;
  let dataOffset = -1;
  let dataLength = 0;

  while (offset + 8 <= bytes.length) {
    const chunkId = tag(offset);
    const chunkSize = dv.getUint32(offset + 4, true);
    const body = offset + 8;
    if (chunkId === "fmt ") {
      channels = dv.getUint16(body + 2, true);
      sampleRate = dv.getUint32(body + 4, true);
      bitsPerSample = dv.getUint16(body + 14, true);
    } else if (chunkId === "data") {
      dataOffset = body;
      dataLength = chunkSize;
    }
    offset = body + chunkSize + (chunkSize % 2);
  }

  if (dataOffset < 0) throw new Error("No data chunk found");
  if (bitsPerSample !== 16) throw new Error(`Unsupported bit depth: ${bitsPerSample}`);

  // TORGO's WAV headers declare a data-chunk size larger than the bytes
  // actually present (an unfinalised size field from how they were
  // originally captured) — clamp to what the buffer actually holds.
  dataLength = Math.min(dataLength, bytes.length - dataOffset);
  const frameCount = Math.floor(dataLength / 2 / channels);
  const mono = new Float32Array(frameCount);
  for (let i = 0; i < frameCount; i++) {
    let sum = 0;
    for (let c = 0; c < channels; c++) {
      sum += dv.getInt16(dataOffset + (i * channels + c) * 2, true);
    }
    mono[i] = sum / channels / 32768;
  }
  return { sampleRate, channels, samples: mono };
}

/** Linear-interpolation resample — adequate for TORGO's ~16.1kHz -> Whisper's 16kHz. */
export function resampleLinear(
  samples: Float32Array,
  fromRate: number,
  toRate: number,
): Float32Array {
  if (fromRate === toRate) return samples;
  const ratio = fromRate / toRate;
  const outLength = Math.round(samples.length / ratio);
  const out = new Float32Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const srcPos = i * ratio;
    const i0 = Math.floor(srcPos);
    const i1 = Math.min(i0 + 1, samples.length - 1);
    const frac = srcPos - i0;
    out[i] = samples[i0]! * (1 - frac) + samples[i1]! * frac;
  }
  return out;
}
