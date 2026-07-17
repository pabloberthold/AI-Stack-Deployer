export function validatePort(value) {
  const num = Number(value)
  if (!value || value === '') return { valid: true, value: '' }
  if (!Number.isInteger(num) || num < 1 || num > 65535) {
    return { valid: false, message: 'El puerto debe estar entre 1 y 65535' }
  }
  return { valid: true, value: num }
}

export function validateCpuThreads(value) {
  if (!value || value === '') return { valid: true, value: '' }
  const num = Number(value)
  if (!Number.isInteger(num) || num < 1) {
    return { valid: false, message: 'Debe ser un número entero positivo' }
  }
  if (num > 128) {
    return { valid: false, message: 'Máximo 128 hilos' }
  }
  return { valid: true, value: num }
}

export function validateRam(value) {
  if (!value || value === '') return { valid: true, value: '' }
  const num = Number(value)
  if (num < 1 || num > 2048) {
    return { valid: false, message: 'La RAM debe estar entre 1 y 2048 GB' }
  }
  return { valid: true, value: num }
}

export function validateVram(value) {
  if (!value || value === '') return { valid: true, value: '' }
  const num = Number(value)
  if (num < 1 || num > 256) {
    return { valid: false, message: 'La VRAM debe estar entre 1 y 256 GB' }
  }
  return { valid: true, value: num }
}

export function validateSubnets(value) {
  if (!value || value === '') return { valid: true, value: '' }
  const parts = value.split(',').map(s => s.trim()).filter(Boolean)
  const subnetRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/
  const invalid = parts.filter(p => !subnetRegex.test(p))
  if (invalid.length > 0) {
    return { valid: false, message: `Subred inválida: ${invalid[0]}. Formato: 192.168.1.0/24` }
  }
  return { valid: true, value: parts.join(', ') }
}

export function validateNotEmpty(value, fieldName) {
  if (!value || !value.trim()) {
    return { valid: false, message: `${fieldName} es requerido` }
  }
  return { valid: true, value: value.trim() }
}
