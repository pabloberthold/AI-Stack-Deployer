import { ref, computed, onMounted } from 'vue'
import { MODELS_CATALOG as FALLBACK_CATALOG } from '../data/modelsCatalog.js'

const KNOWN_REPOS = [
  { repo: 'Qwen/Qwen2.5-Coder-32B-Instruct-GGUF', brand: 'qwen', paramSize: 32 },
  { repo: 'Qwen/Qwen2.5-Coder-14B-Instruct-GGUF', brand: 'qwen', paramSize: 14 },
  { repo: 'Qwen/Qwen2.5-Coder-7B-Instruct-GGUF', brand: 'qwen', paramSize: 7 },
  { repo: 'Qwen/Qwen2.5-Coder-3B-Instruct-GGUF', brand: 'qwen', paramSize: 3 },
  { repo: 'Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF', brand: 'qwen', paramSize: 1.5 },
  { repo: 'Qwen/Qwen2.5-72B-Instruct-GGUF', brand: 'qwen', paramSize: 72 },
  { repo: 'Qwen/Qwen2.5-32B-Instruct-GGUF', brand: 'qwen', paramSize: 32 },
  { repo: 'Qwen/Qwen2.5-14B-Instruct-GGUF', brand: 'qwen', paramSize: 14 },
  { repo: 'Qwen/Qwen2.5-7B-Instruct-GGUF', brand: 'qwen', paramSize: 7 },
  { repo: 'Qwen/Qwen2.5-3B-Instruct-GGUF', brand: 'qwen', paramSize: 3 },
  { repo: 'Qwen/Qwen2.5-1.5B-Instruct-GGUF', brand: 'qwen', paramSize: 1.5 },
  { repo: 'Qwen/Qwen2.5-0.5B-Instruct-GGUF', brand: 'qwen', paramSize: 0.5 },
  { repo: 'Qwen/Qwen2.5-Math-7B-Instruct-GGUF', brand: 'qwen', paramSize: 7 },
  { repo: 'unsloth/DeepSeek-R1-Distill-Qwen-1.5B-GGUF', brand: 'deepseek', paramSize: 1.5 },
  { repo: 'unsloth/DeepSeek-R1-Distill-Qwen-7B-GGUF', brand: 'deepseek', paramSize: 7 },
  { repo: 'unsloth/DeepSeek-R1-Distill-Llama-8B-GGUF', brand: 'deepseek', paramSize: 8 },
  { repo: 'unsloth/DeepSeek-R1-Distill-Qwen-14B-GGUF', brand: 'deepseek', paramSize: 14 },
  { repo: 'unsloth/DeepSeek-R1-Distill-Qwen-32B-GGUF', brand: 'deepseek', paramSize: 32 },
  { repo: 'unsloth/DeepSeek-R1-Distill-Llama-70B-GGUF', brand: 'deepseek', paramSize: 70 },
  { repo: 'TheBloke/deepseek-coder-6.7b-instruct-GGUF', brand: 'deepseek', paramSize: 6.7 },
  { repo: 'TheBloke/deepseek-coder-1.3b-instruct-GGUF', brand: 'deepseek', paramSize: 1.3 },
  { repo: 'unsloth/DeepSeek-V2.5-Lite-Instruct-GGUF', brand: 'deepseek', paramSize: 25 },
  { repo: 'google/gemma-2-2b-it-GGUF', brand: 'gemma', paramSize: 2 },
  { repo: 'google/gemma-2-9b-it-GGUF', brand: 'gemma', paramSize: 9 },
  { repo: 'google/gemma-2-27b-it-GGUF', brand: 'gemma', paramSize: 27 },
  { repo: 'google/codegemma-7b-it-GGUF', brand: 'gemma', paramSize: 7 },
  { repo: 'google/codegemma-2b-GGUF', brand: 'gemma', paramSize: 2 },
  { repo: 'unsloth/Llama-3.2-1B-Instruct-GGUF', brand: 'llama', paramSize: 1 },
  { repo: 'unsloth/Llama-3.2-3B-Instruct-GGUF', brand: 'llama', paramSize: 3 },
  { repo: 'unsloth/Llama-3.1-8B-Instruct-GGUF', brand: 'llama', paramSize: 8 },
  { repo: 'unsloth/Llama-3.3-70B-Instruct-GGUF', brand: 'llama', paramSize: 70 },
  { repo: 'unsloth/Meta-Llama-3-8B-Instruct-GGUF', brand: 'llama', paramSize: 8 },
  { repo: 'unsloth/Llama-3-Guard-3-8B-GGUF', brand: 'llama', paramSize: 8 },
  { repo: 'TheBloke/Mistral-7B-Instruct-v0.3-GGUF', brand: 'other', paramSize: 7 },
  { repo: 'TheBloke/Mixtral-8x7B-Instruct-v0.1-GGUF', brand: 'other', paramSize: 45 },
  { repo: 'microsoft/Phi-3.5-mini-instruct-GGUF', brand: 'other', paramSize: 3.8 },
  { repo: 'microsoft/Phi-3-medium-128k-instruct-GGUF', brand: 'other', paramSize: 14 },
  { repo: 'CohereForAI/aya-23-8B-GGUF', brand: 'other', paramSize: 8 },
  { repo: 'TheBloke/Command-R-Plus-GGUF', brand: 'other', paramSize: 104 },
  { repo: 'NousResearch/Hermes-3-Llama-3.1-8B-GGUF', brand: 'other', paramSize: 8 },
  { repo: 'NousResearch/Hermes-3-Llama-3.1-70B-GGUF', brand: 'other', paramSize: 70 },
  { repo: 'TheBloke/Nemotron-Mini-4B-Instruct-GGUF', brand: 'other', paramSize: 4 },
  { repo: 'TheBloke/granite-3.0-8b-instruct-GGUF', brand: 'other', paramSize: 8 },
  { repo: 'TheBloke/granite-3.0-2b-instruct-GGUF', brand: 'other', paramSize: 2 },
  { repo: 'hugging-quants/SmolLM2-135M-Instruct-GGUF', brand: 'other', paramSize: 0.15 },
  { repo: 'hugging-quants/SmolLM2-360M-Instruct-GGUF', brand: 'other', paramSize: 0.38 },
  { repo: 'hugging-quants/SmolLM2-1.7B-Instruct-GGUF', brand: 'other', paramSize: 1.7 },
  { repo: 'tiiuae/Falcon3-7B-Instruct-GGUF', brand: 'other', paramSize: 7 },
  { repo: 'tiiuae/Falcon3-1B-Instruct-GGUF', brand: 'other', paramSize: 1.2 },
  { repo: 'TheBloke/OpenHermes-2.5-Mistral-7B-GGUF', brand: 'other', paramSize: 7 },
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
  if (name.includes('q3_k_l')) return 'Q3_K_L'
  if (name.includes('q3_k_s')) return 'Q3_K_S'
  if (name.includes('q4_k_m')) return 'Q4_K_M'
  if (name.includes('q4_k_s')) return 'Q4_K_S'
  if (name.includes('q5_k_m')) return 'Q5_K_M'
  if (name.includes('q5_k_s')) return 'Q5_K_S'
  if (name.includes('q6_k')) return 'Q6_K'
  if (name.includes('q8_0')) return 'Q8_0'
  if (name.includes('q4_0')) return 'Q4_0'
  if (name.includes('q4_1')) return 'Q4_1'
  if (name.includes('q5_0')) return 'Q5_0'
  if (name.includes('q5_1')) return 'Q5_1'
  if (name.includes('f16')) return 'F16'
  return 'GGUF'
}

async function fetchRepoSiblings(repoName, signal) {
  const res = await fetch(`https://huggingface.co/api/models/${repoName}`, { signal })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${repoName}`)
  const data = await res.json()
  return (data.siblings || []).filter(s => s.rfilename.endsWith('.gguf'))
}

function deriveBaseName(repo) {
  const parts = repo.split('/')[1]
  return parts
    .replace(/-GGUF$/, '')
    .replace(/-Instruct$/, '')
}

export function useModelCatalog() {
  const catalog = ref([...FALLBACK_CATALOG])
  const loading = ref(true)
  const error = ref(null)
  const fetched = ref(false)

  async function buildCatalog(signal) {
    loading.value = true
    error.value = null

    const results = []

    const fetches = KNOWN_REPOS.map(async (entry) => {
      try {
        const siblings = await fetchRepoSiblings(entry.repo, signal)
        const baseName = deriveBaseName(entry.repo)
        siblings.forEach(s => {
          const quant = extractQuant(s.rfilename)
          results.push({
            label: `${baseName} (${quant})`,
            value: s.rfilename,
            brand: entry.brand,
            size: prettySize(s.size),
            paramSize: entry.paramSize,
            repo: entry.repo,
          })
        })
      } catch {
        // repo fetch failed - will use fallback for this repo
      }
    })

    await Promise.allSettled(fetches)

    if (signal?.aborted) return

    if (results.length > 10) {
      results.sort((a, b) => {
        const brandOrder = { qwen: 0, deepseek: 1, gemma: 2, llama: 3, other: 4 }
        return (brandOrder[a.brand] || 99) - (brandOrder[b.brand] || 99)
      })
      catalog.value = results
      fetched.value = true
      try {
        sessionStorage.setItem('ai-stack-catalog', JSON.stringify(results))
        sessionStorage.setItem('ai-stack-catalog-ts', String(Date.now()))
      } catch { /* storage full, ignore */ }
    }
  }

  async function fetchCatalog() {
    const cached = sessionStorage.getItem('ai-stack-catalog')
    const cachedTs = sessionStorage.getItem('ai-stack-catalog-ts')
    const fiveMin = 5 * 60 * 1000

    if (cached && cachedTs && (Date.now() - Number(cachedTs)) < fiveMin) {
      try {
        catalog.value = JSON.parse(cached)
        fetched.value = true
        loading.value = false
        return
      } catch { /* invalid cache, refetch */ }
    }

    await buildCatalog()
    loading.value = false
  }

  onMounted(fetchCatalog)

  function filterByBrand(brand) {
    return catalog.value.filter(m => m.brand === brand)
  }

  function findModel(value) {
    return catalog.value.find(m => m.value === value) || null
  }

  return { catalog, loading, error, fetched, filterByBrand, findModel }
}
