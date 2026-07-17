<script setup>
defineProps({
  cpuThreads: String,
  ram: String,
  vram: String,
  errors: Object,
})

const emit = defineEmits(['update:cpuThreads', 'update:ram', 'update:vram'])
</script>

<template>
  <div class="space-y-4">
    <h3 class="text-xs font-bold text-zinc-400 tracking-wider uppercase flex items-center gap-1.5">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-zinc-400"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M20 15h2"/></svg>
      <span>1. Recursos de Hardware</span>
    </h3>
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="space-y-1.5">
        <label class="text-xs font-medium text-zinc-300">Hilos de CPU</label>
        <input
          type="number"
          :value="cpuThreads"
          @input="$emit('update:cpuThreads', $event.target.value)"
          placeholder="6"
          class="w-full bg-zinc-950/60 border border-zinc-900 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-800 placeholder-zinc-700"
        >
        <span v-if="errors?.cpuThreads" class="text-[10px] text-rose-400 block">{{ errors.cpuThreads }}</span>
        <span v-else class="text-[10px] text-zinc-500 block">Default: 6 hilos</span>
      </div>

      <div class="space-y-1.5">
        <label class="text-xs font-medium text-zinc-300">RAM Sistema (GB)</label>
        <input
          type="number"
          :value="ram"
          @input="$emit('update:ram', $event.target.value)"
          placeholder="16"
          class="w-full bg-zinc-950/60 border border-zinc-900 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-800 placeholder-zinc-700"
        >
        <span v-if="errors?.ram" class="text-[10px] text-rose-400 block">{{ errors.ram }}</span>
        <span v-else class="text-[10px] text-zinc-500 block">Default: 16 GB</span>
      </div>

      <div class="space-y-1.5">
        <label class="text-xs font-medium text-zinc-300">VRAM GPU (GB)</label>
        <input
          type="number"
          :value="vram"
          @input="$emit('update:vram', $event.target.value)"
          placeholder="12"
          class="w-full bg-zinc-950/60 border border-zinc-900 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-800 placeholder-zinc-700"
        >
        <span v-if="errors?.vram" class="text-[10px] text-rose-400 block">{{ errors.vram }}</span>
        <span v-else class="text-[10px] text-zinc-500 block">Default: 12 GB</span>
      </div>
    </div>
  </div>
</template>
