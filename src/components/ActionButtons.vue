<script setup>
defineEmits(['generate', 'download'])
</script>

<template>
  <div class="pt-4 border-t border-zinc-900 flex flex-col sm:flex-row gap-3">
    <button
      @click="$emit('generate')"
      class="flex-grow px-5 py-3 bg-white hover:bg-zinc-100 text-zinc-900 font-bold text-sm rounded-lg transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-98"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/></svg>
      <span>Generar Script Completo</span>
    </button>

    <button
      @click="$emit('download')"
      class="px-5 py-3 bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 font-semibold text-sm rounded-lg transition-all flex items-center justify-center space-x-2 cursor-pointer"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
      <span>Descargar .sh</span>
    </button>
  </div>
</template>
