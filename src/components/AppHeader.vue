<script setup>
defineProps({ distro: String })
const emit = defineEmits(['update:distro'])

const distros = [
  { id: 'ubuntu', label: 'Ubuntu', class: 'bg-orange-600/20 text-orange-400 border-orange-500/20' },
  { id: 'rhel', label: 'RHEL', class: 'bg-red-600/20 text-red-400 border-red-500/20' },
  { id: 'fedora', label: 'Fedora', class: 'bg-blue-600/20 text-blue-400 border-blue-500/20' },
]
</script>

<template>
  <header class="border-b border-zinc-900 bg-[#0b0f19] px-6 py-4 sticky top-0 z-40">
    <div class="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
      <div class="flex items-center space-x-3">
        <div class="p-2 bg-emerald-950/40 border border-emerald-800/60 rounded-lg text-emerald-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 7.7c0-.6-.3-1.2-.8-1.5l-9-5.2a1.7 1.7 0 0 0-1.5 0l-9 5.2C1 6.5 1 7.2 1 7.7v8.6c0 .6.3 1.2.8 1.5l9 5.2c.5.2 1 .2 1.5 0l9-5.2c.5-.3.8-.9.8-1.5V7.7Z"/><path d="M12 12v9"/><path d="M12 12 3 7"/><path d="M21 7 12 12"/></svg>
        </div>
        <div>
          <h1 class="text-lg font-bold tracking-tight text-white flex items-center gap-2">
            AI Stack Deployer
            <span class="text-[10px] font-mono bg-purple-900/40 text-purple-400 border border-purple-800/30 px-2 py-0.5 rounded">Ollama + Podman</span>
          </h1>
          <p class="text-xs text-zinc-400">Ollama · Open WebUI · SearXNG (opt) · Podman</p>
        </div>
      </div>

      <div class="flex items-center bg-zinc-950 border border-zinc-900 p-1 rounded-lg">
        <button
          v-for="d in distros" :key="d.id"
          @click="$emit('update:distro', d.id)"
          :class="['px-3 py-1.5 rounded text-xs font-medium transition-all cursor-pointer', distro === d.id ? d.class : 'text-zinc-500 hover:text-zinc-300']"
        >{{ d.label }}</button>
      </div>
    </div>
  </header>
</template>
