<script setup>
import { ref } from 'vue'

const props = defineProps({
  modelName: String,
  customModelMode: Boolean,
  customModelRepo: String,
  customModelFile: String,
  filterByBrand: { type: Function, required: true },
  loading: Boolean,
})

const emit = defineEmits([
  'update:modelName',
  'update:customModelMode',
  'update:customModelRepo',
  'update:customModelFile',
  'model-verified',
])

const verifyingModel = ref(false)
const verificationStatus = ref('')

const toggleCustomModelMode = () => {
  emit('update:customModelMode', !props.customModelMode)
  verificationStatus.value = ''
}

const verifyHuggingFaceModel = async () => {
  const repo = props.customModelRepo.trim()
  if (!repo) {
    emit('model-verified', { status: 'empty', message: 'Por favor, ingresa el nombre del repositorio' })
    return
  }
  verifyingModel.value = true
  verificationStatus.value = ''
  try {
    const res = await fetch(`https://huggingface.co/api/models/${repo}`)
    if (res.ok) {
      verificationStatus.value = 'success'
      emit('model-verified', { status: 'success' })
    } else {
      verificationStatus.value = 'failed'
    }
  } catch {
    verificationStatus.value = 'warning'
    emit('model-verified', { status: 'warning', message: 'No se pudo verificar (CORS). Puedes continuar de todas formas.' })
  } finally {
    verifyingModel.value = false
  }
}

const onModelSelectChange = () => {
  verificationStatus.value = ''
}
</script>

<template>
  <div class="space-y-4 pt-2">
    <div class="flex items-center justify-between">
      <h3 class="text-xs font-bold text-zinc-400 tracking-wider uppercase flex items-center gap-1.5">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-zinc-400"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 5.33 3 9 3s9-1.34 9-3V5"/></svg>
        <span>2. Modelo LLM (Gemma, DeepSeek, Qwen, Llama)</span>
      </h3>
      <button
        @click="toggleCustomModelMode"
        class="text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
      >
        {{ customModelMode ? 'Elegir del Catálogo' : 'Ingresar Personalizado' }}
      </button>
    </div>

    <div v-show="!customModelMode" class="space-y-3">
      <div v-if="loading" class="text-xs text-zinc-500 flex items-center space-x-2 py-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
        <span>Cargando catálogo desde Hugging Face...</span>
      </div>
      <select
        v-show="!loading"
        :value="modelName"
        @input="$emit('update:modelName', $event.target.value)"
        @change="onModelSelectChange"
        class="w-full bg-zinc-950 border border-zinc-900 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-800"
      >
        <optgroup label="Modelos Qwen (Alibaba)">
          <option v-for="m in filterByBrand('qwen')" :key="m.value" :value="m.value">
            {{ m.label }} • {{ m.size }}
          </option>
        </optgroup>
        <optgroup label="Modelos DeepSeek">
          <option v-for="m in filterByBrand('deepseek')" :key="m.value" :value="m.value">
            {{ m.label }} • {{ m.size }}
          </option>
        </optgroup>
        <optgroup label="Modelos Gemma (Google)">
          <option v-for="m in filterByBrand('gemma')" :key="m.value" :value="m.value">
            {{ m.label }} • {{ m.size }}
          </option>
        </optgroup>
        <optgroup label="Modelos Meta Llama">
          <option v-for="m in filterByBrand('llama')" :key="m.value" :value="m.value">
            {{ m.label }} • {{ m.size }}
          </option>
        </optgroup>
        <optgroup label="Otros Modelos Destacados GGUF">
          <option v-for="m in filterByBrand('other')" :key="m.value" :value="m.value">
            {{ m.label }} • {{ m.size }}
          </option>
        </optgroup>
      </select>
    </div>

    <div v-show="customModelMode" class="space-y-3 bg-zinc-950/40 p-4 border border-zinc-900 rounded-lg">
      <div class="space-y-2">
        <label class="text-xs text-zinc-300 block">Repositorio en Hugging Face</label>
        <input
          type="text"
          :value="customModelRepo"
          @input="$emit('update:customModelRepo', $event.target.value)"
          placeholder="Repo/Nombre-Modelo-GGUF"
          class="w-full bg-zinc-950 border border-zinc-900 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-zinc-800"
        >
      </div>
      <div class="space-y-2">
        <label class="text-xs text-zinc-300 block">Nombre exacto del archivo GGUF</label>
        <input
          type="text"
          :value="customModelFile"
          @input="$emit('update:customModelFile', $event.target.value)"
          placeholder="archivo-modelo.gguf"
          class="w-full bg-zinc-950 border border-zinc-900 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-zinc-800"
        >
      </div>

      <div class="flex items-center space-x-3 pt-1">
        <button
          @click="verifyHuggingFaceModel"
          class="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-lg transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
          :disabled="verifyingModel"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :class="verifyingModel ? 'animate-spin' : ''"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <span>{{ verifyingModel ? 'Verificando...' : 'Verificar Existencia en HF' }}</span>
        </button>

        <span v-if="verificationStatus === 'success'" class="px-2.5 py-1 text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center space-x-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
          <span>Verificado</span>
        </span>
        <span v-if="verificationStatus === 'failed'" class="px-2.5 py-1 text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full flex items-center space-x-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
          <span>No Encontrado</span>
        </span>
        <span v-if="verificationStatus === 'warning'" class="px-2.5 py-1 text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full flex items-center space-x-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
          <span>No Verificado (CORS)</span>
        </span>
      </div>
    </div>
  </div>
</template>
