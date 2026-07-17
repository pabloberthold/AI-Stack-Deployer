const TYPICAL_LAYER_COUNTS = {
  0.15: 12, 0.38: 18, 1: 16, 1.1: 22, 1.2: 22, 1.3: 22,
  1.5: 28, 1.7: 28, 2: 26, 3: 28, 3.8: 32, 4: 32,
  6.7: 32, 7: 32, 8: 32, 9: 42, 14: 40, 25: 48,
  27: 42, 32: 64, 45: 56, 70: 80, 72: 80, 104: 64,
}

function estimateTotalLayers(paramSize) {
  const keys = Object.keys(TYPICAL_LAYER_COUNTS).map(Number).sort((a, b) => a - b)
  const closest = keys.reduce((prev, curr) =>
    Math.abs(curr - paramSize) < Math.abs(prev - paramSize) ? curr : prev
  )
  return TYPICAL_LAYER_COUNTS[closest] || 40
}

const GB_PER_BILLION_PARAMS = {
  q3: 0.45,
  q4: 0.60,
  q5: 0.75,
  q8: 1.20,
  default: 0.60,
}

function detectQuant(filename) {
  const name = filename.toLowerCase()
  if (name.includes('q3')) return 'q3'
  if (name.includes('q4')) return 'q4'
  if (name.includes('q5')) return 'q5'
  if (name.includes('q8')) return 'q8'
  return 'default'
}

export function calculateGpuLayers(modelParamSize, vramGb, filename) {
  const vram = Math.max(1, Number(vramGb) || 12)
  const pSize = Number(modelParamSize) || 14
  const totalLayers = estimateTotalLayers(pSize)
  const quant = detectQuant(filename || '')

  const gbPerBParam = GB_PER_BILLION_PARAMS[quant]
  const modelWeightGb = pSize * gbPerBParam

  if (vram >= modelWeightGb * 1.2) return -1

  const overhead = Math.min(2, vram * 0.12)
  const availableForLayers = vram - overhead
  const paramsPerLayer = pSize / totalLayers
  const gbPerLayer = paramsPerLayer * gbPerBParam

  return Math.max(0, Math.min(totalLayers, Math.floor(availableForLayers / gbPerLayer)))
}
