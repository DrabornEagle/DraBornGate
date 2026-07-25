const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 22050;
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
      const attack = Math.min(1, index / Math.max(1, SAMPLE_RATE * 0.015));
      const release = Math.min(1, (count - index) / Math.max(1, SAMPLE_RATE * 0.045));
      const envelope = Math.min(attack, release) * (segment.volume ?? 0.38);
      const value = segment.frequency ? Math.sin(2 * Math.PI * segment.frequency * time) * envelope : 0;
      samples.push(value);
    }
  }
  return wave(samples);
}

const definitions = {
  'gate_bell.wav': [
    { frequency: 880, duration: 0.18, volume: 0.42 }, { frequency: 0, duration: 0.07 }, { frequency: 660, duration: 0.18, volume: 0.38 },
  ],
  'gate_chime.wav': [
    { frequency: 523.25, duration: 0.16, volume: 0.34 }, { frequency: 659.25, duration: 0.16, volume: 0.34 }, { frequency: 783.99, duration: 0.24, volume: 0.32 },
  ],
  'gate_digital.wav': [
    { frequency: 1046.5, duration: 0.10, volume: 0.36 }, { frequency: 0, duration: 0.04 }, { frequency: 1318.5, duration: 0.13, volume: 0.34 },
  ],
  'gate_alert.wav': [
    { frequency: 740, duration: 0.17, volume: 0.42 }, { frequency: 0, duration: 0.05 }, { frequency: 740, duration: 0.17, volume: 0.42 }, { frequency: 0, duration: 0.05 }, { frequency: 920, duration: 0.20, volume: 0.40 },
  ],
};

function ensureNotificationSounds() {
  const directory = path.join(__dirname, '..', 'assets', 'sounds');
  fs.mkdirSync(directory, { recursive: true });
  for (const [name, segments] of Object.entries(definitions)) {
    const target = path.join(directory, name);
    if (!fs.existsSync(target) || fs.statSync(target).size < 1000) fs.writeFileSync(target, synth(segments));
  }
}

if (require.main === module) ensureNotificationSounds();
module.exports = { ensureNotificationSounds };
