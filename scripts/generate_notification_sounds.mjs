import fs from 'node:fs';
import path from 'node:path';

const outputDir = path.resolve('assets/sounds');
fs.mkdirSync(outputDir, { recursive: true });
const sampleRate = 44100;

function wave(kind, phase) {
  const x = ((phase / (Math.PI * 2)) % 1 + 1) % 1;
  if (kind === 'square') return x < 0.5 ? 1 : -1;
  if (kind === 'triangle') return 1 - 4 * Math.abs(x - 0.5);
  if (kind === 'saw') return 2 * x - 1;
  return Math.sin(phase);
}

function envelope(t, duration, attack = 0.018, release = 0.12) {
  const a = Math.min(1, t / attack);
  const r = Math.min(1, Math.max(0, (duration - t) / release));
  return Math.max(0, Math.min(a, r));
}

function note(freq, duration, options = {}) {
  const count = Math.max(1, Math.round(duration * sampleRate));
  const samples = new Float64Array(count);
  const kind = options.kind ?? 'sine';
  const gain = options.gain ?? 0.72;
  const vibrato = options.vibrato ?? 0;
  const sweep = options.sweep ?? 0;
  for (let i = 0; i < count; i += 1) {
    const t = i / sampleRate;
    const swept = freq + sweep * (t / Math.max(duration, 0.001));
    const modulated = swept * (1 + vibrato * Math.sin(2 * Math.PI * 6 * t));
    const phase = 2 * Math.PI * modulated * t;
    const fundamental = wave(kind, phase);
    const harmonic = 0.22 * Math.sin(phase * 2.01) + 0.10 * Math.sin(phase * 3.02);
    samples[i] = (fundamental + harmonic) * gain * envelope(t, duration, options.attack, options.release);
  }
  return samples;
}

function silence(duration) { return new Float64Array(Math.max(1, Math.round(duration * sampleRate))); }
function noise(duration, gain = 0.18) {
  const count = Math.max(1, Math.round(duration * sampleRate));
  const samples = new Float64Array(count);
  let seed = 0x5f3759df;
  for (let i = 0; i < count; i += 1) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const random = (seed / 0xffffffff) * 2 - 1;
    const t = i / sampleRate;
    samples[i] = random * gain * envelope(t, duration, 0.005, 0.08);
  }
  return samples;
}
function mix(...tracks) {
  const length = Math.max(...tracks.map((track) => track.length));
  const result = new Float64Array(length);
  for (const track of tracks) for (let i = 0; i < track.length; i += 1) result[i] += track[i];
  return result;
}
function concat(...parts) {
  const result = new Float64Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) { result.set(part, offset); offset += part.length; }
  return result;
}
function normalize(samples, peak = 0.88) {
  let max = 0;
  for (const value of samples) max = Math.max(max, Math.abs(value));
  const scale = max > 0 ? peak / max : 1;
  const pcm = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i += 1) pcm[i] = Math.max(-32767, Math.min(32767, Math.round(samples[i] * scale * 32767)));
  return pcm;
}
function writeWav(filename, samples) {
  const pcm = normalize(samples);
  const dataBytes = pcm.length * 2;
  const buffer = Buffer.alloc(44 + dataBytes);
  buffer.write('RIFF', 0); buffer.writeUInt32LE(36 + dataBytes, 4); buffer.write('WAVE', 8); buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22); buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28); buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34); buffer.write('data', 36); buffer.writeUInt32LE(dataBytes, 40);
  for (let i = 0; i < pcm.length; i += 1) buffer.writeInt16LE(pcm[i], 44 + i * 2);
  fs.writeFileSync(path.join(outputDir, filename), buffer);
  console.log(`${filename}: ${(pcm.length / sampleRate).toFixed(2)} sn`);
}

const sounds = {
  'gate_chime.wav': concat(note(659.25, 0.24), note(783.99, 0.24), note(987.77, 0.46)),
  'gate_pulse.wav': concat(note(155.56, 0.22, { kind: 'square' }), silence(0.10), note(196.00, 0.36, { kind: 'square' })),
  'gate_alert.wav': concat(note(880, 0.30, { kind: 'saw', sweep: -250 }), silence(0.06), note(988, 0.34, { kind: 'saw', sweep: -300 }), silence(0.06), note(1174.66, 0.44, { kind: 'saw', sweep: -350 })),
  'gate_bell.wav': mix(note(523.25, 1.10, { gain: 0.66, release: 0.80 }), note(1046.50, 0.85, { gain: 0.32, release: 0.65 }), note(1567.98, 0.62, { gain: 0.17, release: 0.48 })),
  'gate_siren.wav': concat(note(610, 0.58, { kind: 'triangle', sweep: 470, vibrato: 0.018 }), note(1080, 0.58, { kind: 'triangle', sweep: -470, vibrato: 0.018 }), note(610, 0.58, { kind: 'triangle', sweep: 470, vibrato: 0.018 })),
  'gate_digital.wav': concat(note(1046.50, 0.11, { kind: 'square' }), silence(0.05), note(1318.51, 0.11, { kind: 'square' }), silence(0.05), note(1567.98, 0.11, { kind: 'square' }), silence(0.05), note(2093.00, 0.30, { kind: 'square' })),
  'gate_turbo.wav': mix(note(130, 1.05, { kind: 'saw', sweep: 1450, gain: 0.68 }), noise(0.42, 0.25)),
};

for (const [filename, samples] of Object.entries(sounds)) writeWav(filename, samples);
