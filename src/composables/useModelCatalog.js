import { ref, onMounted } from 'vue'
import { OLLAMA_CATALOG as FALLBACK_CATALOG } from '../data/modelsCatalog.js'

const MAX_MODEL_BYTES = 15 * 1024 * 1024 * 1024

const KNOWN_REPOS = [
  { repo: 'Qwen/Qwen2.5-Coder-32B-Instruct-GGUF', brand: 'qwen', paramSize: 32 },
  { repo: 'Qwen/Qwen2.5-Coder-14B-Instruct-GGUF', brand: 'qwen', paramSize: 14 },
  { repo: 'Qwen/Qwen2.5-Coder-7B-Instruct-GGUF', brand: 'qwen', paramSize: 7 },
  { repo: 'Qwen/Qwen2.5-14B-Instruct-GGUF', brand: 'qwen', paramSize: 14 },
  { repo: 'Qwen/Qwen2.5-7B-Instruct-GGUF', brand: 'qwen', paramSize: 7 },
  { repo: 'Qwen/Qwen2.5-3B-Instruct-GGUF', brand: 'qwen', paramSize: 3 },
  { repo: 'Qwen/Qwen2.5-1.5B-Instruct-GGUF', brand: 'qwen', paramSize: 1.5 },
  { repo: 'unsloth/DeepSeek-R1-Distill-Qwen-14B-GGUF', brand: 'deepseek', paramSize: 14 },
  { repo: 'unsloth/DeepSeek-R1-Distill-Qwen-7B-GGUF', brand: 'deepseek', paramSize: 7 },
  { repo: 'unsloth/DeepSeek-R1-Distill-Llama-8B-GGUF', brand: 'deepseek', paramSize: 8 },
  { repo: 'unsloth/DeepSeek-R1-Distill-Qwen-1.5B-GGUF', brand: 'deepseek', paramSize: 1.5 },
  { repo: 'TheBloke/deepseek-coder-6.7b-instruct-GGUF', brand: 'deepseek', paramSize: 6.7 },
  { repo: 'google/gemma-2-9b-it-GGUF', brand: 'gemma', paramSize: 9 },
  { repo: 'google/gemma-2-2b-it-GGUF', brand: 'gemma', paramSize: 2 },
  { repo: 'google/codegemma-7b-it-GGUF', brand: 'gemma', paramSize: 7 },
  { repo: 'unsloth/Llama-3.2-3B-Instruct-GGUF', brand: 'llama', paramSize: 3 },
  { repo: 'unsloth/Llama-3.2-1B-Instruct-GGUF', brand: 'llama', paramSize: 1 },
  { repo: 'unsloth/Llama-3.1-8B-Instruct-GGUF', brand: 'llama', paramSize: 8 },
  { repo: 'TheBloke/Mistral-7B-Instruct-v0.3-GGUF', brand: 'other', paramSize: 7 },
  { repo: 'microsoft/Phi-3.5-mini-instruct-GGUF', brand: 'other', paramSize: 3.8 },
  { repo: 'microsoft/Phi-3-medium-128k-instruct-GGUF', brand: 'other', paramSize: 14 },
  { repo: 'CohereForAI/aya-23-8B-GGUF', brand: 'other', paramSize: 8 },
  { repo: 'hugging-quants/SmolLM2-1.7B-Instruct-GGUF', brand: 'other', paramSize: 1.7 },
  { repo: 'tiiuae/Falcon3-7B-Instruct-GGUF', brand: 'other', paramSize: 7 },
  { repo: 'TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF', brand: 'other', paramSize: 1.1 },
]

function prettySize(bytes) {
  if (!bytes) return '? GB'
  const gb = bytes / (1024 * 1024 * 1024)
  return `${gb.toFixed(1)} GB`
}

function extractQuant(filename) {
  const name = filename.toLowerCase()
  if (name.includes('q2_k')) return 'Q2_K'
  if (name.includes('q3_k_m')) return 'Q3_K_M'
  if (name.includes('q4_k_m')) return 'Q4_K_M'
  if (name.includes('q4_k_s')) return 'Q4_K_S'
  if (name.includes('q5_k_m')) return 'Q5_K_M'
  if (name.includes('q5_k_s')) return 'Q5_K_S'
  if (name.includes('q6_k')) return 'Q6_K'
  if (name.includes('q8_0')) return 'Q8_0'
  if (name.includes('q4_0')) return 'Q4_0'
  if (name.includes('f16')) return 'F16'
  return 'GGUF'
}

async function fetchRepoSiblings(repoName) {
  const res = await fetch(`https://huggingface.co/api/models/${repoName}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  return (data.siblings || []).filter(s => s.rfilename.endsWith('.gguf'))
}

function deriveBaseName(repo) {
  const parts = repo.split('/')[1]
  return parts.replace(/-GGUF$/, '').replace(/-Instruct$/, '')
}

export function useModelCatalog() {
  const ollamaCatalog = ref([...FALLBACK_CATALOG])
  const hfModels = ref([])
  const loading = ref(true)
  const error = ref(null)

  const catalog = ref([...FALLBACK_CATALOG])

  async function buildCatalog() {
    loading.value = true
    error.value = null
    const results = []

    const fetches = KNOWN_REPOS.map(async (entry) => {
      try {
        const siblings = await fetchRepoSiblings(entry.repo)
        const baseName = deriveBaseName(entry.repo)
        siblings.forEach(s => {
          if (s.size && s.size > MAX_MODEL_BYTES) return
          const quant = extractQuant(s.rfilename)
          results.push({
            label: `${baseName} (${quant})`,
            value: s.rfilename,
            brand: entry.brand,
            size: prettySize(s.size),
            paramSize: entry.paramSize,
            repo: entry.repo,
            source: 'hf',
          })
        })
      } catch { /* skip failed repos */ }
    })

    await Promise.allSettled(fetches)

    if (results.length > 5) {
      const seen = new Set()
      const deduped = results.filter(r => {
        const key = `${r.brand}-${r.paramSize}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      hfModels.value = deduped.sort((a, b) => a.paramSize - b.paramSize)
      catalog.value = [...FALLBACK_CATALOG, ...hfModels.value]
      try {
        sessionStorage.setItem('ai-stack-hf-models', JSON.stringify(hfModels.value))
      } catch { /* ignore */ }
    }
  }

  async function fetchCatalog() {
    const cached = sessionStorage.getItem('ai-stack-hf-models')
    const fiveMin = 5 * 60 * 1000
    const cachedTs = sessionStorage.getItem('ai-stack-hf-models-ts')

    if (cached && cachedTs && (Date.now() - Number(cachedTs)) < fiveMin) {
      try {
        const parsed = JSON.parse(cached)
        hfModels.value = parsed
        catalog.value = [...FALLBACK_CATALOG, ...parsed]
        loading.value = false
        return
      } catch { /* invalid cache */ }
    }

    await buildCatalog()
    try {
      sessionStorage.setItem('ai-stack-hf-models-ts', String(Date.now()))
    } catch { /* ignore */ }
    loading.value = false
  }

  onMounted(fetchCatalog)

  function filterByBrand(brand) {
    return catalog.value.filter(m => m.brand === brand)
  }

  function findModel(value) {
    return catalog.value.find(m => m.value === value) || null
  }

  return { catalog, loading, error, filterByBrand, findModel }
}
