<script setup>
import { ref, watch, nextTick } from 'vue'

const props = defineProps({
  isOpen: Boolean,
  script: String,
  distro: String,
})

const emit = defineEmits(['close', 'copy', 'download'])
const scriptCodeBlock = ref(null)

watch(() => props.script, () => {
  nextTick(() => {
    if (scriptCodeBlock.value && window.hljs) {
      delete scriptCodeBlock.value.dataset.highlighted
      window.hljs.highlightElement(scriptCodeBlock.value)
    }
  })
})

watch(() => props.isOpen, (open) => {
  if (open) {
    nextTick(() => {
      if (scriptCodeBlock.value && window.hljs) {
        delete scriptCodeBlock.value.dataset.highlighted
        window.hljs.highlightElement(scriptCodeBlock.value)
      }
    })
  }
})
</script>

<template>
  <div
    v-show="isOpen"
    class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all"
    @click.self="$emit('close')"
  >
    <div class="bg-[#0b0f19] border border-zinc-900 rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

      <div class="bg-zinc-950 px-6 py-4 border-b border-zinc-900 flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <span
            :class="['px-2 py-0.5 text-[10px] font-bold rounded uppercase', distro === 'ubuntu' ? 'bg-orange-600/10 text-orange-400 border border-orange-500/20' : 'bg-blue-600/10 text-blue-400 border border-blue-500/20']"
          >
            {{ distro }}
          </span>
          <h3 class="text-xs font-mono text-zinc-200">setup_ai_stack.sh (Podman Engine)</h3>
        </div>

        <div class="flex items-center space-x-2">
          <button
            @click="$emit('copy')"
            class="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>
            <span>Copiar</span>
          </button>
          <button
            @click="$emit('download')"
            class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
            <span>Descargar .sh</span>
          </button>
          <button
            @click="$emit('close')"
            class="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-all cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
      </div>

      <div class="p-6 overflow-y-auto flex-1 code-font text-xs md:text-sm bg-[#080c14]">
        <pre><code class="language-bash" ref="scriptCodeBlock">{{ script }}</code></pre>
      </div>

      <div class="bg-zinc-950 px-6 py-3 border-t border-zinc-900 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
        <span>Modo Interactivo (Paso a Paso o Automático)</span>
        <span>100% Idempotente con Podman</span>
      </div>
    </div>
  </div>
</template>
