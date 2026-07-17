export const OLLAMA_CATALOG = [
  { label: 'Qwen 2.5 (72B)', value: 'qwen2.5:72b', brand: 'qwen', size: '47 GB', paramSize: 72 },
  { label: 'Qwen 2.5 (32B)', value: 'qwen2.5:32b', brand: 'qwen', size: '20 GB', paramSize: 32 },
  { label: 'Qwen 2.5 (14B)', value: 'qwen2.5:14b', brand: 'qwen', size: '9.0 GB', paramSize: 14 },
  { label: 'Qwen 2.5 (7B)', value: 'qwen2.5:7b', brand: 'qwen', size: '4.8 GB', paramSize: 7 },
  { label: 'Qwen 2.5 (3B)', value: 'qwen2.5:3b', brand: 'qwen', size: '2.0 GB', paramSize: 3 },
  { label: 'Qwen 2.5 (1.5B)', value: 'qwen2.5:1.5b', brand: 'qwen', size: '1.0 GB', paramSize: 1.5 },
  { label: 'Qwen 2.5 (0.5B)', value: 'qwen2.5:0.5b', brand: 'qwen', size: '0.4 GB', paramSize: 0.5 },
  { label: 'DeepSeek R1 (70B)', value: 'deepseek-r1:70b', brand: 'deepseek', size: '42 GB', paramSize: 70 },
  { label: 'DeepSeek R1 (32B)', value: 'deepseek-r1:32b', brand: 'deepseek', size: '20 GB', paramSize: 32 },
  { label: 'DeepSeek R1 (14B)', value: 'deepseek-r1:14b', brand: 'deepseek', size: '9.0 GB', paramSize: 14 },
  { label: 'DeepSeek R1 (8B)', value: 'deepseek-r1:8b', brand: 'deepseek', size: '4.9 GB', paramSize: 8 },
  { label: 'DeepSeek R1 (7B)', value: 'deepseek-r1:7b', brand: 'deepseek', size: '4.8 GB', paramSize: 7 },
  { label: 'DeepSeek R1 (1.5B)', value: 'deepseek-r1:1.5b', brand: 'deepseek', size: '1.0 GB', paramSize: 1.5 },
  { label: 'Llama 3.3 (70B)', value: 'llama3.3:70b', brand: 'llama', size: '42 GB', paramSize: 70 },
  { label: 'Llama 3.1 (70B)', value: 'llama3.1:70b', brand: 'llama', size: '42 GB', paramSize: 70 },
  { label: 'Llama 3.1 (8B)', value: 'llama3.1:8b', brand: 'llama', size: '4.9 GB', paramSize: 8 },
  { label: 'Llama 3.2 (3B)', value: 'llama3.2:3b', brand: 'llama', size: '2.0 GB', paramSize: 3 },
  { label: 'Llama 3.2 (1B)', value: 'llama3.2:1b', brand: 'llama', size: '0.7 GB', paramSize: 1 },
  { label: 'Gemma 2 (27B)', value: 'gemma2:27b', brand: 'gemma', size: '18 GB', paramSize: 27 },
  { label: 'Gemma 2 (9B)', value: 'gemma2:9b', brand: 'gemma', size: '6.0 GB', paramSize: 9 },
  { label: 'Gemma 2 (2B)', value: 'gemma2:2b', brand: 'gemma', size: '1.6 GB', paramSize: 2 },
  { label: 'Mistral (7B)', value: 'mistral:7b', brand: 'other', size: '4.4 GB', paramSize: 7 },
  { label: 'Mixtral (8x7B)', value: 'mixtral:8x7b', brand: 'other', size: '26 GB', paramSize: 45 },
  { label: 'Phi-3 Mini (3.8B)', value: 'phi3:mini', brand: 'other', size: '2.4 GB', paramSize: 3.8 },
  { label: 'Phi-3 Medium (14B)', value: 'phi3:medium', brand: 'other', size: '7.9 GB', paramSize: 14 },
  { label: 'CodeGemma (2B)', value: 'codegemma:2b', brand: 'other', size: '1.6 GB', paramSize: 2 },
  { label: 'CodeGemma (7B)', value: 'codegemma:7b', brand: 'other', size: '4.8 GB', paramSize: 7 },
  { label: 'CodeLlama (7B)', value: 'codellama:7b', brand: 'other', size: '4.8 GB', paramSize: 7 },
  { label: 'CodeLlama (13B)', value: 'codellama:13b', brand: 'other', size: '8.0 GB', paramSize: 13 },
  { label: 'CodeLlama (34B)', value: 'codellama:34b', brand: 'other', size: '20 GB', paramSize: 34 },
  { label: 'StableLM 2 (12B)', value: 'stablelm2:12b', brand: 'other', size: '7.8 GB', paramSize: 12 },
  { label: 'Command R (35B)', value: 'command-r:35b', brand: 'other', size: '22 GB', paramSize: 35 },
  { label: 'Falcon 3 (7B)', value: 'falcon3:7b', brand: 'other', size: '4.8 GB', paramSize: 7 },
  { label: 'Falcon 3 (1B)', value: 'falcon3:1b', brand: 'other', size: '0.7 GB', paramSize: 1 },
  { label: 'SmolLM2 (1.7B)', value: 'smollm2:1.7b', brand: 'other', size: '1.2 GB', paramSize: 1.7 },
  { label: 'SmolLM2 (360M)', value: 'smollm2:360m', brand: 'other', size: '0.3 GB', paramSize: 0.36 },
  { label: 'TinyLlama (1.1B)', value: 'tinyllama:1.1b', brand: 'other', size: '0.8 GB', paramSize: 1.1 },
]

export const DEFAULT_MODEL = OLLAMA_CATALOG.find(m => m.value === 'qwen2.5:7b') || OLLAMA_CATALOG[0]

export function filterModelsByBrand(brand) {
  return OLLAMA_CATALOG.filter(m => m.brand === brand)
}

export function findModel(value) {
  return OLLAMA_CATALOG.find(m => m.value === value) || null
}
