<script setup>
defineProps({
  message: String,
})
</script>

<template>
  <div
    v-show="message"
    class="fixed bottom-6 right-6 z-50 flex items-center space-x-3 bg-zinc-900 border border-zinc-800 text-white px-5 py-3 rounded-xl shadow-2xl transition-all"
  >
    <div class="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
    </div>
    <span class="text-xs font-semibold">{{ message }}</span>
  </div>
</template>
