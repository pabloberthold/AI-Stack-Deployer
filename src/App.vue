<script setup>
import { ref, reactive } from 'vue'
import { OLLAMA_CATALOG as FALLBACK_CATALOG } from './data/modelsCatalog.js'
import { validatePort, validateSubnets } from './utils/validation.js'
import { useToast } from './composables/useToast.js'
import { useModelCatalog } from './composables/useModelCatalog.js'
import { useScriptGenerator } from './composables/useScriptGenerator.js'

import AppHeader from './components/AppHeader.vue'
import HardwareSection from './components/HardwareSection.vue'
import ModelSelector from './components/ModelSelector.vue'
import NetworkSection from './components/NetworkSection.vue'
import FlowChart from './components/FlowChart.vue'
import ActionButtons from './components/ActionButtons.vue'
import ScriptModal from './components/ScriptModal.vue'
import ToastNotification from './components/ToastNotification.vue'

const { message: toastMessage, show: showToast } = useToast()
const { catalog, loading, filterByBrand, findModel } = useModelCatalog()

const isModalOpen = ref(false)
const customModelMode = ref(false)
const customModelRepo = ref('Qwen/Qwen2.5-Coder-14B-Instruct-GGUF')
const customModelFile = ref('qwen2.5-coder-14b-instruct-q4_k_m.gguf')

const params = ref({
  distro: 'ubuntu',
  maxModels: '',
  modelName: FALLBACK_CATALOG[1]?.value || '',
  ollamaPort: '',
  webuiPort: '',
  allowedSubnets: '',
  installDir: '',
  enableUfw: true,
  enableSearxng: false,
})

const errors = reactive({})

function validateAll() {
  Object.keys(errors).forEach(k => delete errors[k])

  const mm = parseInt(params.value.maxModels)
  if (params.value.maxModels && (isNaN(mm) || mm < 1 || mm > 8)) {
    errors.maxModels = 'Debe ser entre 1 y 8'
  }

  const lp = validatePort(params.value.ollamaPort)
  if (!lp.valid) errors.ollamaPort = lp.message

  const wp = validatePort(params.value.webuiPort)
  if (!wp.valid) errors.webuiPort = wp.message

  const sn = validateSubnets(params.value.allowedSubnets)
  if (!sn.valid) errors.allowedSubnets = sn.message

  return Object.keys(errors).length === 0
}

const { generatedScript } = useScriptGenerator(params, findModel)

function openScriptModal() {
  if (!validateAll()) {
    showToast('Corrige los errores de validación antes de generar')
    return
  }
  isModalOpen.value = true
}

function closeScriptModal() {
  isModalOpen.value = false
}

function copyScript() {
  navigator.clipboard.writeText(generatedScript.value).then(() => {
    showToast('Script copiado al portapapeles')
  })
}

function downloadScript() {
  if (!validateAll()) {
    showToast('Corrige los errores de validación antes de descargar')
    return
  }
  const blob = new Blob([generatedScript.value], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'setup_ai_stack.sh'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  showToast('Descarga iniciada (setup_ai_stack.sh)')
}

function handleModelVerified(result) {
  if (result.status === 'empty') {
    showToast(result.message)
  } else if (result.status === 'warning') {
    showToast(result.message)
  } else if (result.status === 'success') {
    showToast('Modelo verificado en Hugging Face')
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col justify-between">
    <AppHeader
      :distro="params.distro"
      @update:distro="params.distro = $event"
    />

    <main class="flex-grow max-w-6xl w-full mx-auto p-6 space-y-8">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        <div class="lg:col-span-7 space-y-6">
          <div class="bg-[#0b0f19] border border-zinc-900 rounded-xl p-6 space-y-6">

            <div class="border-b border-zinc-900 pb-4 flex justify-between items-center">
              <div>
                <h2 class="text-sm font-bold text-white uppercase tracking-wider">Parámetros del Entorno</h2>
                <p class="text-xs text-zinc-400 mt-0.5">Define los puertos, límites de hardware y el modelo LLM GGUF.</p>
              </div>
              <span class="text-[11px] font-mono text-zinc-500">IDEMPOTENCIA ACTIVADA</span>
            </div>

            <HardwareSection
              :max-models="params.maxModels"
              :errors="errors"
              @update:max-models="params.maxModels = $event"
            />

            <ModelSelector
              :model-name="params.modelName"
              :custom-model-mode="customModelMode"
              :custom-model-repo="customModelRepo"
              :custom-model-file="customModelFile"
              :filter-by-brand="filterByBrand"
              :loading="loading"
              @update:model-name="params.modelName = $event"
              @update:custom-model-mode="customModelMode = $event"
              @update:custom-model-repo="customModelRepo = $event"
              @update:custom-model-file="customModelFile = $event"
              @model-verified="handleModelVerified"
            />

            <NetworkSection
              :ollama-port="params.ollamaPort"
              :webui-port="params.webuiPort"
              :allowed-subnets="params.allowedSubnets"
              :install-dir="params.installDir"
              :enable-ufw="params.enableUfw"
              :enable-searxng="params.enableSearxng"
              :distro="params.distro"
              :errors="errors"
              @update:ollama-port="params.ollamaPort = $event"
              @update:webui-port="params.webuiPort = $event"
              @update:allowed-subnets="params.allowedSubnets = $event"
              @update:install-dir="params.installDir = $event"
              @update:enable-ufw="params.enableUfw = $event"
              @update:enable-searxng="params.enableSearxng = $event"
            />

            <ActionButtons
              @generate="openScriptModal"
              @download="downloadScript"
            />
          </div>
        </div>

        <div class="lg:col-span-5 space-y-6">
          <FlowChart
            :allowed-subnets="params.allowedSubnets"
            :ollama-port="params.ollamaPort"
            :webui-port="params.webuiPort"
            :enable-searxng="params.enableSearxng"
            :distro="params.distro"
          />
        </div>

      </div>
    </main>

    <ScriptModal
      :is-open="isModalOpen"
      :script="generatedScript"
      :distro="params.distro"
      @close="closeScriptModal"
      @copy="copyScript"
      @download="downloadScript"
    />

    <ToastNotification :message="toastMessage" />

    <footer class="border-t border-zinc-900 bg-[#0b0f19] py-6 px-6 text-center text-xs text-zinc-500 mt-12">
      <div class="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <span>DevOps AI Stack - Diseñado con precisión para Linux</span>
        <span>Exclusivo para Podman Engine & Podman Compose</span>
        <span class="font-mono text-zinc-700">set -euo pipefail</span>
      </div>
    </footer>
  </div>
</template>
