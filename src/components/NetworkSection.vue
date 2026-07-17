<script setup>
defineProps({
  ollamaPort: String,
  webuiPort: String,
  allowedSubnets: String,
  enableUfw: Boolean,
  enableSearxng: Boolean,
  distro: String,
  installDir: String,
  errors: Object,
})
const emit = defineEmits(['update:ollamaPort', 'update:webuiPort', 'update:allowedSubnets', 'update:enableUfw', 'update:enableSearxng', 'update:installDir'])
</script>

<template>
  <div class="space-y-4 pt-2">
    <h3 class="text-xs font-bold text-zinc-400 tracking-wider uppercase flex items-center gap-1.5">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-zinc-400"><path d="M12 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3"/><path d="M6 3a1 1 0 0 0-1 1v8"/><path d="M18 3a1 1 0 0 1 1 1v8"/></svg>
      <span>3. Red y Puertos</span>
    </h3>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div class="space-y-1.5">
        <label class="text-xs font-medium text-zinc-300">Puerto Ollama (API)</label>
        <input type="number" :value="ollamaPort" @input="$emit('update:ollamaPort', $event.target.value)" placeholder="11434"
          class="w-full bg-zinc-950/60 border border-zinc-900 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-800 placeholder-zinc-700">
        <span v-if="errors?.ollamaPort" class="text-[10px] text-rose-400 block">{{ errors.ollamaPort }}</span>
        <span v-else class="text-[10px] text-zinc-500 block">Default: 11434</span>
      </div>

      <div class="space-y-1.5">
        <label class="text-xs font-medium text-zinc-300">Puerto Open WebUI</label>
        <input type="number" :value="webuiPort" @input="$emit('update:webuiPort', $event.target.value)" placeholder="8080"
          class="w-full bg-zinc-950/60 border border-zinc-900 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-800 placeholder-zinc-700">
        <span v-if="errors?.webuiPort" class="text-[10px] text-rose-400 block">{{ errors.webuiPort }}</span>
        <span v-else class="text-[10px] text-zinc-500 block">Default: 8080</span>
      </div>

      <div class="sm:col-span-2 flex items-center space-x-4">
        <label class="flex items-center space-x-2 cursor-pointer">
          <input type="checkbox" :checked="distro === 'ubuntu' ? enableUfw : true" @change="$emit('update:enableUfw', $event.target.checked)"
            class="accent-emerald-500" :disabled="distro !== 'ubuntu'">
          <span class="text-xs text-zinc-300">{{ distro === 'ubuntu' ? 'Configurar UFW' : 'firewalld (siempre activo en RHEL/Fedora)' }}</span>
        </label>
        <label class="flex items-center space-x-2 cursor-pointer">
          <input type="checkbox" :checked="enableSearxng" @change="$emit('update:enableSearxng', $event.target.checked)" class="accent-emerald-500">
          <span class="text-xs text-zinc-300">Incluir SearXNG (búsqueda web)</span>
        </label>
      </div>

      <div class="space-y-1.5 sm:col-span-2">
        <label class="text-xs font-medium text-zinc-300">Subredes Permitidas</label>
        <input type="text" :value="allowedSubnets" @input="$emit('update:allowedSubnets', $event.target.value)"
          placeholder="192.168.1.0/24, 192.168.68.0/24"
          class="w-full bg-zinc-950/60 border border-zinc-900 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-800 font-mono text-xs placeholder-zinc-700">
        <span v-if="errors?.allowedSubnets" class="text-[10px] text-rose-400 block">{{ errors.allowedSubnets }}</span>
      </div>

      <div class="space-y-1.5 sm:col-span-2">
        <label class="text-xs font-medium text-zinc-300">Directorio de Instalación</label>
        <input type="text" :value="installDir" @input="$emit('update:installDir', $event.target.value)" placeholder="$HOME/ai-stack"
          class="w-full bg-zinc-950/60 border border-zinc-900 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-800 font-mono text-xs placeholder-zinc-700">
        <span class="text-[10px] text-zinc-500 block">Default: $HOME/ai-stack</span>
      </div>
    </div>
  </div>
</template>
