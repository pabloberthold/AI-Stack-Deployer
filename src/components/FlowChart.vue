<script setup>
defineProps({
  allowedSubnets: String,
  llamaPort: String,
  webuiPort: String,
  gpuLayers: Number,
})
</script>

<template>
  <div class="bg-[#0b0f19] border border-zinc-900 rounded-xl p-6 space-y-6">
    <div class="border-b border-zinc-900 pb-4">
      <h2 class="text-sm font-bold text-white uppercase tracking-wider">Flujo de Tránsito (Podman)</h2>
      <p class="text-xs text-zinc-400 mt-0.5">Topología e interconexión de componentes locales.</p>
    </div>

    <div class="space-y-4 py-2">
      <div class="flex items-center justify-between p-3 bg-zinc-950/50 border border-zinc-900 rounded-lg">
        <div class="flex items-center space-x-2">
          <div class="w-2 h-2 bg-emerald-400 rounded-full"></div>
          <span class="text-xs font-semibold text-white">Subredes IP Permitidas</span>
        </div>
        <span class="text-[10px] font-mono text-zinc-500">{{ allowedSubnets || '192.168.1.0/24' }}</span>
      </div>

      <div class="flex justify-center">
        <div class="h-4 w-0.5 bg-zinc-800"></div>
      </div>

      <div class="p-3 bg-zinc-950/50 border border-zinc-900 rounded-lg space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-white flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-rose-400"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span>Filtro de Tráfico Activo</span>
          </span>
          <span class="px-2 py-0.5 text-[9px] bg-rose-500/10 text-rose-400 rounded">UFW</span>
        </div>
        <p class="text-[10px] text-zinc-500 leading-relaxed">Bloqueo de accesos externos que no pertenezcan a los rangos configurados.</p>
      </div>

      <div class="flex justify-center">
        <div class="h-4 w-0.5 bg-zinc-800"></div>
      </div>

      <div class="p-4 bg-zinc-950/50 border border-zinc-900 rounded-lg space-y-3">
        <div class="flex items-center justify-between border-b border-zinc-900 pb-2">
          <span class="text-xs font-bold text-white flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-purple-400"><path d="M22 7.7c0-.6-.3-1.2-.8-1.5l-9-5.2a1.7 1.7 0 0 0-1.5 0l-9 5.2C1 6.5 1 7.2 1 7.7v8.6c0 .6.3 1.2.8 1.5l9 5.2c.5.2 1 .2 1.5 0l9-5.2c.5-.3.8-.9.8-1.5V7.7Z"/><path d="M12 12v9"/><path d="M12 12 3 7"/><path d="M21 7 12 12"/></svg>
            <span>Red Aislada de Podman (ai-net)</span>
          </span>
          <span class="text-[9px] font-mono text-purple-400">Compose</span>
        </div>

        <div class="space-y-2">
          <div class="flex justify-between items-center text-xs">
            <span class="text-zinc-300">llama-cpp (CUDA)</span>
            <span class="font-mono text-zinc-500">Puerto {{ llamaPort || 3000 }}</span>
          </div>
          <div class="flex justify-between items-center text-xs">
            <span class="text-zinc-300">open-webui</span>
            <span class="font-mono text-zinc-500">Puerto {{ webuiPort || 8080 }}</span>
          </div>
          <div class="flex justify-between items-center text-xs">
            <span class="text-zinc-300">searxng (JSON)</span>
            <span class="font-mono text-zinc-500">Interno (8080)</span>
          </div>
        </div>
      </div>

      <div class="flex justify-center">
        <div class="h-4 w-0.5 bg-zinc-800"></div>
      </div>

      <div class="p-3 bg-zinc-950/50 border border-zinc-900 rounded-lg flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-amber-400"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          <span class="text-xs font-semibold text-white">Capas de GPU Offload Calculadas</span>
        </div>
        <span class="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded text-xs font-mono font-bold">{{ gpuLayers === -1 ? 'TODAS' : gpuLayers }} capas</span>
      </div>
    </div>

    <div class="p-4 bg-zinc-950/20 border border-zinc-900 rounded-lg">
      <div class="flex items-start space-x-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-zinc-400 mt-0.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
        <div class="space-y-1">
          <h4 class="text-xs font-bold text-white">Políticas de Control del Servicio</h4>
          <p class="text-[11px] text-zinc-500 leading-relaxed">
            Para mayor seguridad y optimización de memoria, el script de Podman se integra con systemd pero **no estará habilitado en el arranque automático**.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
