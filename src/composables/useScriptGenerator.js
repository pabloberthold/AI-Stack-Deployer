import { computed } from 'vue'
import { findModel as catalogFindModel } from '../data/modelsCatalog.js'

function esc(s) {
  return s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\${/g, '\\${')
}

export function useScriptGenerator(params, findModelOverride) {
  const findModel = findModelOverride || catalogFindModel

  function resolveModel() {
    const match = findModel(params.value.modelName)
    return {
      name: params.value.modelName || 'qwen2.5:7b',
      paramSize: match ? match.paramSize : 7,
      source: match?.source || 'ollama',
    }
  }

  const d = computed(() => params.value.distro)
  const cpu = computed(() => params.value.cpuThreads || '4')
  const ram = computed(() => params.value.ram || '16')
  const ollamaPort = computed(() => params.value.ollamaPort || '11434')
  const webuiPort = computed(() => params.value.webuiPort || '8080')
  const allowedSubnets = computed(() => params.value.allowedSubnets || '192.168.1.0/24, 192.168.68.0/24')
  const enableUfw = computed(() => params.value.enableUfw !== false)
  const enableSearxng = computed(() => params.value.enableSearxng === true)
  const installDir = computed(() => params.value.installDir.trim() || '${TARGET_HOME}/ai-stack')

  // ── HEADER ──
  function genHeader() {
    return `#!/usr/bin/env bash
# ==============================================================================
#           AI STACK DEPLOYER — Ollama + Open WebUI (Podman Edition)
# ==============================================================================
# SO: ${d.value.toUpperCase()}
# Modo: Idempotente — las configuraciones existentes se preservan
#
# Hardware:
#   - Hilos CPU: ${cpu.value}
#   - RAM: ${ram.value} GB
#   - Puerto Ollama: ${ollamaPort.value}
#   - Puerto WebUI: ${webuiPort.value}
# ==============================================================================

set -euo pipefail

RED=$'\\033[1;31m'; GREEN=$'\\033[1;32m'; YELLOW=$'\\033[1;33m'
BLUE=$'\\033[1;34m'; CYAN=$'\\033[1;36m'; NC=$'\\033[0m'
`
  }

  // ── BANNER ──
  function genBanner() {
    return `
clear
cat << "BANNER"
   ╔═══════════════════════════════════════════════════════════════╗
   ║             AI STACK DEPLOYER — PODMAN EDITION               ║
   ║         Ollama + Open WebUI + SearXNG (Opcional)             ║
   ╚═══════════════════════════════════════════════════════════════╝
BANNER
echo ""
`
  }

  // ── LOG FUNCTIONS ──
  function genLogFns() {
    return `
log_info()    { echo -e "\${CYAN}[INFO]\${NC} \$1"; }
log_install() { echo -e "\${BLUE}[INSTALANDO]\${NC} \$1"; }
log_skip()    { echo -e "\${YELLOW}[OMITIENDO]\${NC} \$1"; }
log_update()  { echo -e "\${GREEN}[ACTUALIZANDO]\${NC} \$1"; }
log_error()   { echo -e "\${RED}[ERROR]\${NC} \$1" >&2; }

[[ \${EUID} -ne 0 ]] && { log_error "Ejecutar con sudo"; exit 1; }

TARGET_USER="\${SUDO_USER:-\${USER}}"
[[ "\${TARGET_USER}" == "root" || -z "\${TARGET_USER}" ]] && TARGET_USER="root" && TARGET_HOME="/root" \\
  || TARGET_HOME=\$(getent passwd "\${TARGET_USER}" | cut -d: -f6)
log_info "Usuario: \${TARGET_USER}  Home: \${TARGET_HOME}"

HAS_NVIDIA=0
INSTALL_DIR="${installDir.value}"
MODEL_NAME="${esc(resolveModel().name)}"
OLLAMA_PORT=${ollamaPort.value}
WEBUI_PORT=${webuiPort.value}
CPU_THREADS=${cpu.value}
`
  }

  // ── MODE SELECTOR ──
  function genModeSelector() {
    return `
echo "Seleccione modo:"
echo "  1) Automático (instalación completa desatendida)"
echo "  2) Interactivo (confirmar cada paso)"
echo -n "Opción [1-2, default 1]: "; read -r RUN_MODE
RUN_MODE=\${RUN_MODE:-1}

confirm_step() {
  local step="\$1"
  [[ "\${RUN_MODE}" == "2" ]] || return 0
  echo -n "\${YELLOW}¿Ejecutar [\$step]? (y/N): \${NC}"; read -r r
  [[ "\$r" =~ ^[yY] ]] && return 0
  log_skip "[\$step] omitido"; return 1
}
`
  }

  // ── PKG INSTALL HELPERS ──
  function genPkgHelpers() {
    if (d.value === 'ubuntu') {
      return `
pkg_install() {
  local pkg=\$1
  if dpkg -s "\${pkg}" &>/dev/null; then log_skip "\${pkg}"; return; fi
  log_install "\${pkg}"; apt-get install -y -qq "\${pkg}"
}`
    }
    return `
pkg_install() {
  local pkg=\$1
  if rpm -q "\${pkg}" &>/dev/null; then log_skip "\${pkg}"; return; fi
  log_install "\${pkg}"; dnf install -y -q "\${pkg}"
}`
  }

  // ── DISTRO SETUP ──
  function genDistroSetup() {
    if (d.value === 'ubuntu') {
      return `
# ── Ubuntu ──
apt-get update -qq
for pkg in curl git ufw jq ca-certificates gnupg python3-pip pipx podman uidmap; do pkg_install "\${pkg}"; done

if ! command -v podman-compose &>/dev/null; then
  log_install "podman-compose via pipx"
  sudo -u "\${TARGET_USER}" pipx install podman-compose || pipx install --global podman-compose
fi

if lspci 2>/dev/null | grep -qi nvidia; then
  if ! command -v nvidia-smi &>/dev/null; then
    log_install "Drivers NVIDIA (ubuntu-drivers autoinstall)"
    pkg_install ubuntu-drivers-common
    ubuntu-drivers autoinstall
    log_info "Reinicio OBLIGATORIO al finalizar."
  else
    log_skip "NVIDIA driver (\$(nvidia-smi --query-gpu=driver_version --format=csv,noheader 2>/dev/null))"
  fi
  HAS_NVIDIA=1
else
  log_error "GPU NVIDIA no detectada — modo CPU-only"
  HAS_NVIDIA=0
fi
`
    }
    const isRhel = d.value === 'rhel'
    return `
# ── ${isRhel ? 'RHEL' : 'Fedora'} ──
for pkg in curl git jq python3-pip podman podman-compose firewalld; do pkg_install "\${pkg}"; done

if lspci 2>/dev/null | grep -qi nvidia; then
  if ! command -v nvidia-smi &>/dev/null; then
    log_install "Drivers NVIDIA via RPM Fusion"
    local VER=\$(rpm -E %rhel 2>/dev/null || rpm -E %fedora)
    dnf install -y "https://mirrors.rpmfusion.org/free/el/rpmfusion-free-release-\${VER}.noarch.rpm" \\
                   "https://mirrors.rpmfusion.org/nonfree/el/rpmfusion-nonfree-release-\${VER}.noarch.rpm" 2>/dev/null || \\
    dnf install -y "https://mirrors.rpmfusion.org/free/fedora/rpmfusion-free-release-\${VER}.noarch.rpm" \\
                   "https://mirrors.rpmfusion.org/nonfree/fedora/rpmfusion-nonfree-release-\${VER}.noarch.rpm"
    dnf install -y akmod-nvidia xorg-x11-drv-nvidia-cuda
    log_info "Reinicio OBLIGATORIO al finalizar."
  else
    log_skip "NVIDIA driver (\$(nvidia-smi --query-gpu=driver_version --format=csv,noheader 2>/dev/null))"
  fi
  HAS_NVIDIA=1
else
  log_error "GPU NVIDIA no detectada — modo CPU-only"
  HAS_NVIDIA=0
fi
`
  }

  // ── NVIDIA TOOLKIT ──
  function genNvidiaToolkit() {
    if (d.value === 'ubuntu') {
      return `
if [[ "\${HAS_NVIDIA}" == "1" ]] && ! command -v nvidia-ctk &>/dev/null; then
  curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey \\
    | gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
  curl -sL https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list \\
    | sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' \\
    > /etc/apt/sources.list.d/nvidia-container-toolkit.list
  apt-get update -qq && apt-get install -y -qq nvidia-container-toolkit
fi`
    }
    return `
if [[ "\${HAS_NVIDIA}" == "1" ]] && ! command -v nvidia-ctk &>/dev/null; then
  curl -sL https://nvidia.github.io/libnvidia-container/stable/rpm/nvidia-container-toolkit.repo \\
    -o /etc/yum.repos.d/nvidia-container-toolkit.repo
  dnf install -y nvidia-container-toolkit
fi`
  }

  // ── CDI ──
  function genCdi() {
    return `
if [[ "\${HAS_NVIDIA}" == "1" ]]; then
  mkdir -p /etc/cdi
  nvidia-ctk cdi generate --output=/etc/cdi/nvidia.yaml 2>/dev/null \\
    && log_update "CDI spec generado" \\
    || log_error "CDI spec falló"
fi
`
  }

  // ── DIRECTORIES ──
  function genDirs() {
    return `
if confirm_step "Directorios"; then
  mkdir -p "\${INSTALL_DIR}" /modelos
  chmod -R 755 "\${INSTALL_DIR}"
  log_info "Modelos persistentes en /modelos"
fi
`
  }

  // ── COMPOSE ──
  function genCompose() {
    const searxngBlock = enableSearxng.value ? `
  searxng:
    image: docker.io/searxng/searxng:latest
    container_name: ai-stack-searxng
    restart: unless-stopped
    volumes:
      - ./searxng:/etc/searxng:z
    networks:
      - ai-net

` : ''
    const searxngDep = enableSearxng.value ? '\n      - searxng' : ''
    const searxngEnv = enableSearxng.value ? `
      - ENABLE_RAG_WEB_SEARCH=True
      - RAG_WEB_ENGINE=searxng
      - SEARXNG_QUERY_URL=http://searxng:8080/search?q=<query>&format=json` : ''
    const gpuBlock = '    devices:\n      - nvidia.com/gpu=all\n    security_opt:\n      - label=disable'

    return `
if confirm_step "Podman Compose"; then
  local F="\${INSTALL_DIR}/docker-compose.yml"
  if [[ -f "\${F}" ]]; then log_skip "docker-compose.yml"; return; fi

  cat << 'COMPOSE_EOF' > "\${F}"
version: "3.8"

services:
  ollama:
    image: ollama/ollama:latest
    container_name: ai-stack-ollama
    restart: unless-stopped
    ports:
      - "__OLLAMA_PORT__:11434"
    volumes:
      - /modelos:/root/.ollama:z
${HAS_NVIDIA ? gpuBlock : ''}
    environment:
      - OLLAMA_KEEP_ALIVE=24h
      - OLLAMA_NUM_PARALLEL=1
      - OLLAMA_MAX_LOADED_MODELS=1
    networks:
      - ai-net

${searxngBlock}  open-webui:
    image: ghcr.io/open-webui/open-webui:main
    container_name: ai-stack-open-webui
    restart: unless-stopped
    ports:
      - "__WEBUI_PORT__:8080"
    environment:
      - OLLAMA_BASE_URL=http://ollama:11434
      - WEBUI_AUTH=False
      - DEFAULT_MODELS=__MODEL_NAME__${searxngEnv}
    volumes:
      - open-webui-data:/app/backend/data:z
    depends_on:
      - ollama${searxngDep}
    networks:
      - ai-net

volumes:
  open-webui-data:

networks:
  ai-net:
    driver: bridge
COMPOSE_EOF

  sed -i "s|__OLLAMA_PORT__|\${OLLAMA_PORT}|g; s|__WEBUI_PORT__|\${WEBUI_PORT}|g; s|__MODEL_NAME__|\${MODEL_NAME}|g" "\${F}"

  if [[ "\${HAS_NVIDIA}" != "1" ]]; then
    sed -i '/devices:/,/nvidia.com\\/gpu=all/d; /security_opt:/,/label=disable/d' "\${F}"
  fi
  chown -R "\${TARGET_USER}:\${TARGET_USER}" "\${INSTALL_DIR}" /modelos 2>/dev/null || true
fi
`
  }

  // ── SEARXNG CONFIG ──
  function genSearxng() {
    if (!enableSearxng.value) return ''
    return `
if confirm_step "SearXNG"; then
  local D="\${INSTALL_DIR}/searxng"
  mkdir -p "\${D}"
  if [[ ! -f "\${D}/settings.yml" ]]; then
    cat << 'EOF' > "\${D}/settings.yml"
search:
  safe_search: 1
  autocomplete: "duckduckgo"
  formats: [html, json]
server:
  port: 8080
  bind_address: "0.0.0.0"
  secret_key: "ai-stack-searxng-change-me"
  base_url: "http://searxng:8080"
  image_proxy: true
engines:
  - name: duckduckgo; engine: duckduckgo; shortcut: ddg
  - name: wikipedia; engine: wikipedia; shortcut: wp
EOF
  fi
fi
`
  }

  // ── DOWNLOAD MODEL ──
  function genPullModel() {
    return `
if confirm_step "Descargar modelo Ollama"; then
  log_info "Esperando que Ollama arranque..."
  for i in \$(seq 1 30); do
    curl -s http://localhost:\${OLLAMA_PORT}/api/tags >/dev/null 2>&1 && break
    sleep 2
  done

  if curl -s http://localhost:\${OLLAMA_PORT}/api/tags >/dev/null 2>&1; then
    if curl -s http://localhost:\${OLLAMA_PORT}/api/tags | grep -q "\${MODEL_NAME}"; then
      log_skip "Modelo \${MODEL_NAME} ya presente"
    else
      log_install "Ollama pull \${MODEL_NAME} (puede tomar varios minutos)..."
      podman exec ai-stack-ollama ollama pull "\${MODEL_NAME}" \\
        || log_error "Pull falló; puedes ejecutar manualmente: ollama pull \${MODEL_NAME}"
    fi
  else
    log_error "Ollama no responde; omite el pull automático"
  fi
fi
`
  }

  // ── FIREWALL ──
  function genFirewall() {
    const subnetsList = allowedSubnets.value.split(',').map(s => s.trim()).filter(Boolean)

    if (d.value === 'ubuntu') {
      if (!enableUfw.value) return ''
      let rules = ''
      subnetsList.forEach(subnet => {
        rules += `  ufw allow from ${subnet} to any port \${WEBUI_PORT} proto tcp comment 'Open WebUI'\n`
        rules += `  ufw allow from ${subnet} to any port \${OLLAMA_PORT} proto tcp comment 'Ollama API'\n`
      })
      return `
if confirm_step "Firewall UFW"; then
  ufw default deny incoming >/dev/null 2>&1 || true
  ufw default allow outgoing >/dev/null 2>&1 || true
  ufw status | grep -q "Status: active" || ufw --force enable
${rules}
  ufw reload >/dev/null 2>&1 || true
  ufw status numbered | head -10 || true
fi
`
    }

    let rules = ''
    subnetsList.forEach(subnet => {
      rules += `  firewall-cmd --permanent --zone=public --add-rich-rule='rule family="ipv4" source address="${subnet}" port protocol="tcp" port="\${WEBUI_PORT}" accept'\n`
      rules += `  firewall-cmd --permanent --zone=public --add-rich-rule='rule family="ipv4" source address="${subnet}" port protocol="tcp" port="\${OLLAMA_PORT}" accept'\n`
    })
    return `
if confirm_step "Firewall firewalld"; then
  systemctl enable --now firewalld 2>/dev/null || true
${rules}  firewall-cmd --reload 2>/dev/null || true
  firewall-cmd --list-all | head -15 || true
fi
`
  }

  // ── SYSTEMD ──
  function genSystemd() {
    return `
if confirm_step "Servicio systemd"; then
  local S="/etc/systemd/system/ai-stack.service"
  local PBC="\$(command -v podman-compose 2>/dev/null || echo /usr/local/bin/podman-compose)"
  if [[ ! -f "\${S}" ]]; then
    cat << EOF > "\${S}"
[Unit]
Description=AI Stack (Ollama + Open WebUI + SearXNG via Podman)
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=\${INSTALL_DIR}
ExecStart=\${PBC} -f \${INSTALL_DIR}/docker-compose.yml up -d --remove-orphans
ExecStop=\${PBC} -f \${INSTALL_DIR}/docker-compose.yml down
TimeoutStartSec=300

[Install]
EOF
    systemctl daemon-reload
    systemd-analyze verify "\${S}" 2>&1 | grep -vE 'WantedBy|Install' && log_info "Servicio validado"
  fi
  systemctl is-enabled ai-stack.service &>/dev/null && systemctl disable ai-stack.service 2>/dev/null || true
fi
`
  }

  // ── PRE-PULL IMAGES ──
  function genPrePull() {
    return `
if confirm_step "Pre-descarga de imágenes Podman"; then
  for img in "ollama/ollama:latest" "ghcr.io/open-webui/open-webui:main"${enableSearxng.value ? ' "docker.io/searxng/searxng:latest"' : ''}; do
    podman pull "\${img}" || log_error "Pull falló: \${img}"
  done
fi
`
  }

  // ── REPORT ──
  function genReport() {
    const hasSearxng = enableSearxng.value ? '\necho -e "   - SearXNG:        Interno (8080)"' : ''
    return `
echo ""
echo -e "\${GREEN}═══════════════════════════════════════════════════════════════════\${NC}"
echo -e "\${GREEN}               AI STACK DESPLEGADO CON ÉXITO                       \${NC}"
echo -e "\${GREEN}═══════════════════════════════════════════════════════════════════\${NC}"
echo ""
echo -e "\${CYAN}Resumen:\${NC}"
echo -e "   - SO:              ${d.value.toUpperCase()}"
echo -e "   - Modelo:          \${MODEL_NAME}"
echo -e "   - Directorio:      \${INSTALL_DIR}"
echo -e "   - Modelos:         /modelos"
echo -e "   - Puerto Ollama:   \${OLLAMA_PORT}"
echo -e "   - Puerto WebUI:    \${WEBUI_PORT}"${hasSearxng}
echo ""
echo -e "\${CYAN}Iniciar:        sudo systemctl start ai-stack\${NC}"
echo -e "\${CYAN}Estado:         podman ps\${NC}"
echo -e "\${CYAN}WebUI:          http://\$(hostname -I | awk '{print \$1}'):\${WEBUI_PORT}\${NC}"
echo ""
[[ "\${HAS_NVIDIA}" == "1" ]] && ! nvidia-smi &>/dev/null && \\
  echo -e "\${YELLOW}>> REINICIO REQUERIDO para activar NVIDIA\${NC}" && echo ""
`
  }

  const generatedScript = computed(() => [
    genHeader(),
    genBanner(),
    genLogFns(),
    genModeSelector(),
    genPkgHelpers(),
    '\n# ===== PASO 1: PRERREQUISITOS =====\nif confirm_step "Instalación de dependencias"; then',
    genDistroSetup(),
    genNvidiaToolkit(),
    genCdi(),
    'fi',
    '\n# ===== PASO 2: DIRECTORIOS =====',
    genDirs(),
    '\n# ===== PASO 3: DOCKER COMPOSE =====',
    genCompose(),
    genSearxng(),
    '\n# ===== PASO 4: DESCARGA DEL MODELO =====',
    genPullModel(),
    '\n# ===== PASO 5: FIREWALL =====',
    genFirewall(),
    '\n# ===== PASO 6: SYSTEMD =====',
    genSystemd(),
    '\n# ===== PASO 7: PRE-DESCARGA =====',
    genPrePull(),
    genReport(),
  ].join('\n'))

  return { generatedScript }
}
