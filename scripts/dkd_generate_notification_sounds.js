const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 44100;
const CHANNELS = 1;
const BITS = 16;

function wave(samples) {
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(CHANNELS, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * CHANNELS * (BITS / 8), 28);
  buffer.writeUInt16LE(CHANNELS * (BITS / 8), 32);
  buffer.writeUInt16LE(BITS, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  samples.forEach((sample, index) => buffer.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(sample * 32767))), 44 + index * 2));
  return buffer;
}

function synth(segments) {
  const samples = [];
  for (const segment of segments) {
    const count = Math.round(segment.duration * SAMPLE_RATE);
    for (let index = 0; index < count; index += 1) {
      const time = index / SAMPLE_RATE;
      const attack = Math.min(1, index / Math.max(1, SAMPLE_RATE * 0.018));
      const release = Math.min(1, (count - index) / Math.max(1, SAMPLE_RATE * 0.09));
      const envelope = Math.min(attack, release) * (segment.volume ?? 0.62);
      const primary = segment.frequency ? Math.sin(2 * Math.PI * segment.frequency * time) : 0;
      const harmonic = segment.frequency ? Math.sin(2 * Math.PI * segment.frequency * 2 * time) * 0.24 : 0;
      const low = segment.frequency ? Math.sin(2 * Math.PI * segment.frequency * 0.5 * time) * 0.12 : 0;
      samples.push((primary + harmonic + low) * envelope);
    }
  }
  return wave(samples);
}

const definitions = {
  'gate_bell_v2.wav': [
    { frequency: 932, duration: 0.28, volume: 0.72 },
    { frequency: 0, duration: 0.09 },
    { frequency: 698, duration: 0.34, volume: 0.68 },
    { frequency: 0, duration: 0.08 },
    { frequency: 932, duration: 0.36, volume: 0.66 },
  ],
  'gate_chime_v2.wav': [
    { frequency: 523.25, duration: 0.25, volume: 0.62 },
    { frequency: 659.25, duration: 0.25, volume: 0.64 },
    { frequency: 783.99, duration: 0.30, volume: 0.66 },
    { frequency: 1046.5, duration: 0.46, volume: 0.58 },
  ],
  'gate_digital_v2.wav': [
    { frequency: 1046.5, duration: 0.16, volume: 0.70 },
    { frequency: 0, duration: 0.05 },
    { frequency: 1318.5, duration: 0.18, volume: 0.72 },
    { frequency: 0, duration: 0.05 },
    { frequency: 1567.98, duration: 0.24, volume: 0.68 },
    { frequency: 1174.66, duration: 0.30, volume: 0.60 },
  ],
  'gate_alert_v2.wav': [
    { frequency: 760, duration: 0.25, volume: 0.78 },
    { frequency: 0, duration: 0.08 },
    { frequency: 760, duration: 0.25, volume: 0.78 },
    { frequency: 0, duration: 0.08 },
    { frequency: 960, duration: 0.32, volume: 0.76 },
    { frequency: 0, duration: 0.08 },
    { frequency: 1180, duration: 0.42, volume: 0.72 },
  ],
  'gate_pulse_v2.wav': [
    { frequency: 440, duration: 0.20, volume: 0.68 },
    { frequency: 659.25, duration: 0.20, volume: 0.70 },
    { frequency: 880, duration: 0.22, volume: 0.72 },
    { frequency: 659.25, duration: 0.20, volume: 0.66 },
    { frequency: 987.77, duration: 0.42, volume: 0.62 },
  ],
  'gate_signal_v2.wav': [
    { frequency: 587.33, duration: 0.24, volume: 0.72 },
    { frequency: 0, duration: 0.07 },
    { frequency: 783.99, duration: 0.27, volume: 0.74 },
    { frequency: 0, duration: 0.07 },
    { frequency: 987.77, duration: 0.30, volume: 0.72 },
    { frequency: 0, duration: 0.07 },
    { frequency: 1174.66, duration: 0.48, volume: 0.66 },
  ],
};

function ensureNotificationSounds() {
  const directory = path.join(__dirname, '..', 'assets', 'sounds');
  fs.mkdirSync(directory, { recursive: true });
  for (const [name, segments] of Object.entries(definitions)) {
    const target = path.join(directory, name);
    fs.writeFileSync(target, synth(segments));
  }
}

if (require.main === module) ensureNotificationSounds();
module.exports = { ensureNotificationSounds };
