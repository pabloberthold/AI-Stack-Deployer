<script setup>
defineProps({
  allowedSubnets: String,
  ollamaPort: String,
  webuiPort: String,
  enableSearxng: Boolean,
  distro: String,
})
</script>

<template>
  <div class="bg-[#0b0f19] border border-zinc-900 rounded-xl p-6 space-y-6">
    <div class="border-b border-zinc-900 pb-4">
      <h2 class="text-sm font-bold text-white uppercase tracking-wider">Topología del Stack</h2>
      <p class="text-xs text-zinc-400 mt-0.5">Componentes e interconexión en Podman.</p>
    </div>

    <div class="space-y-4 py-2">
      <div class="flex items-center justify-between p-3 bg-zinc-950/50 border border-zinc-900 rounded-lg">
        <div class="flex items-center space-x-2">
          <div class="w-2 h-2 bg-emerald-400 rounded-full"></div>
          <span class="text-xs font-semibold text-white">Subredes Permitidas</span>
        </div>
        <span class="text-[10px] font-mono text-zinc-500">{{ allowedSubnets || '192.168.1.0/24' }}</span>
      </div>

      <div class="flex justify-center"><div class="h-4 w-0.5 bg-zinc-800"></div></div>

      <div class="p-3 bg-zinc-950/50 border border-zinc-900 rounded-lg">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-white flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-rose-400"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span>Firewall</span>
          </span>
          <span class="px-2 py-0.5 text-[9px] rounded" :class="distro === 'ubuntu' ? 'bg-rose-500/10 text-rose-400' : 'bg-blue-500/10 text-blue-400'">{{ distro === 'ubuntu' ? 'UFW' : 'firewalld' }}</span>
        </div>
        <p class="text-[10px] text-zinc-500 leading-relaxed mt-1">Bloqueo de accesos externos fuera de los rangos configurados.</p>
      </div>

      <div class="flex justify-center"><div class="h-4 w-0.5 bg-zinc-800"></div></div>

      <div class="p-4 bg-zinc-950/50 border border-zinc-900 rounded-lg space-y-3">
        <div class="flex items-center justify-between border-b border-zinc-900 pb-2">
          <span class="text-xs font-bold text-white flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-purple-400"><path d="M22 7.7c0-.6-.3-1.2-.8-1.5l-9-5.2a1.7 1.7 0 0 0-1.5 0l-9 5.2C1 6.5 1 7.2 1 7.7v8.6c0 .6.3 1.2.8 1.5l9 5.2c.5.2 1 .2 1.5 0l9-5.2c.5-.3.8-.9.8-1.5V7.7Z"/><path d="M12 12v9"/><path d="M12 12 3 7"/><path d="M21 7 12 12"/></svg>
            <span>Red Aislada (ai-net)</span>
          </span>
          <span class="text-[9px] font-mono text-purple-400">Compose</span>
        </div>

        <div class="space-y-2">
          <div class="flex justify-between items-center text-xs">
            <span class="text-zinc-300">Ollama (GPU)</span>
            <span class="font-mono text-zinc-500">Puerto {{ ollamaPort || 11434 }}</span>
          </div>
          <div class="flex justify-between items-center text-xs">
            <span class="text-zinc-300">open-webui</span>
            <span class="font-mono text-zinc-500">Puerto {{ webuiPort || 8080 }}</span>
          </div>
          <div v-if="enableSearxng" class="flex justify-between items-center text-xs">
            <span class="text-zinc-300">searxng</span>
            <span class="font-mono text-zinc-500">Interno (8080)</span>
          </div>
        </div>

        <div class="border-t border-zinc-900 pt-2 mt-2">
          <div class="flex justify-between items-center text-xs">
            <span class="text-zinc-400 flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-zinc-500"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
              Modelos persistentes
            </span>
            <span class="font-mono text-[10px] text-zinc-600">/modelos</span>
          </div>
        </div>
      </div>

      <div class="flex justify-center"><div class="h-4 w-0.5 bg-zinc-800"></div></div>

      <div class="p-3 bg-zinc-950/50 border border-zinc-900 rounded-lg flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-amber-400"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          <span class="text-xs font-semibold text-white">GPU Acceleration</span>
        </div>
        <span class="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded text-xs font-mono font-bold">CUDA</span>
      </div>
    </div>

    <div class="p-4 bg-zinc-950/20 border border-zinc-900 rounded-lg">
      <div class="flex items-start space-x-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-zinc-400 mt-0.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
        <div class="space-y-1">
          <h4 class="text-xs font-bold text-white">systemd — Arranque Manual</h4>
          <p class="text-[11px] text-zinc-500 leading-relaxed">El servicio se integra con systemd pero no se habilita en el boot. Usar: <span class="font-mono text-zinc-400">sudo systemctl start ai-stack</span></p>
        </div>
      </div>
    </div>
  </div>
</template>
