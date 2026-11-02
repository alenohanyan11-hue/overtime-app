// Draws the app icon (green tile with a white clock) as PNGs into public/.
import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const BG = [29, 107, 87]
const FG = [255, 255, 255]

function crc32(buf) {
  let c = ~0
  for (const b of buf) {
    c ^= b
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax
  const dy = by - ay
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(px - ax - t * dx, py - ay - t * dy)
}

function icon(size, padded) {
  const c = size / 2
  const scale = padded ? 0.7 : 0.82 // maskable icons keep content inside the safe zone
  const r = (size / 2) * scale * 0.78
  const stroke = size * 0.06
  const raw = Buffer.alloc(size * (size * 3 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0
    for (let x = 0; x < size; x++) {
      const px = x + 0.5
      const py = y + 0.5
      const d = Math.hypot(px - c, py - c)
      const ring = Math.abs(d - r) < stroke / 2
      const hourHand = distToSegment(px, py, c, c, c, c - r * 0.55) < stroke / 2
      const minuteHand = distToSegment(px, py, c, c, c + r * 0.6, c) < stroke / 2
      const color = ring || hourHand || minuteHand ? FG : BG
      raw.set(color, y * (size * 3 + 1) + 1 + x * 3)
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

writeFileSync('public/icon-192.png', icon(192, false))
writeFileSync('public/icon-512.png', icon(512, false))
writeFileSync('public/icon-maskable-512.png', icon(512, true))
writeFileSync('public/apple-touch-icon.png', icon(180, false))
