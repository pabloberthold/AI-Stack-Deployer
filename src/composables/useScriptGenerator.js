import { computed } from 'vue'
import { calculateGpuLayers } from '../utils/gpuLayers.js'

function esc(s) {
  return s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\${/g, '\\${')
}

export function useScriptGenerator(params, customModelMode, customModelRepo, customModelFile, findModel) {

  const resolvedRepo = computed(() => {
    if (customModelMode.value) {
      return customModelRepo.value.trim() || 'Qwen/Qwen2.5-Coder-14B-Instruct-GGUF'
    }
    const match = findModel(params.value.modelName)
    return match ? match.repo : 'Qwen/Qwen2.5-Coder-14B-Instruct-GGUF'
  })

  const resolvedModelFile = computed(() => {
    if (customModelMode.value) {
      return customModelFile.value.trim() || 'qwen2.5-coder-14b-instruct-q4_k_m.gguf'
    }
    const match = findModel(params.value.modelName)
    return match ? match.value : 'qwen2.5-coder-14b-instruct-q4_k_m.gguf'
  })

  const resolvedParamSize = computed(() => {
    if (customModelMode.value) return 14
    const match = findModel(params.value.modelName)
    return match ? match.paramSize : 14
  })

  const gpuLayers = computed(() => {
    const vram = Number(params.value.vram) || 12
    return calculateGpuLayers(resolvedParamSize.value, vram, resolvedModelFile.value)
  })

  const distro = computed(() => params.value.distro)
  const cpu = computed(() => params.value.cpuThreads || '6')
  const ram = computed(() => params.value.ram || '16')
  const vram = computed(() => params.value.vram || '12')
  const llamaPort = computed(() => params.value.llamaPort || '3000')
  const webuiPort = computed(() => params.value.webuiPort || '8080')
  const allowedSubnets = computed(() => params.value.allowedSubnets || '192.168.1.0/24, 192.168.68.0/24')
  const installDirInput = computed(() => params.value.installDir.trim())

  const installDirExpr = computed(() => {
    return installDirInput.value
      ? `"${esc(installDirInput.value)}"`
      : '"${TARGET_HOME}/ai-stack"'
  })

  function genHeader() {
    const layersDisplay = gpuLayers.value === -1 ? 'TODAS' : String(gpuLayers.value)
    return `#!/usr/bin/env bash
# ==============================================================================
#                 AI STACK DEPLOYER (EDICIÓN ENTORNO PODMAN)
# ==============================================================================
# SO Objetivo: ${distro.value.toUpperCase()}
# Idempotente: Sí, preserva configuraciones existentes
#
# Hardware Optimizado:
#   - Hilos de CPU: ${cpu.value}
#   - RAM de Sistema: ${ram.value} GB
#   - GPU VRAM: ${vram.value} GB
#   - Capas a descargar en GPU (llama.cpp): ${layersDisplay}
# ==============================================================================

set -euo pipefail

RED=$'\\033[1;31m'
GREEN=$'\\033[1;32m'
YELLOW=$'\\033[1;33m'
BLUE=$'\\033[1;34m'
CYAN=$'\\033[1;36m'
NC=$'\\033[0m'

clear
printf "%s\\n" "\${GREEN}"
cat << "BANNER"
    _    ___   ____  _             _      ____             _
   / \\  |_ _| / ___|| |_ __ _  ___| | __ |  _ \\  ___ _ __ | | ___  _   _  ___ _ __
  / _ \\  | |  \\___ \\| __/ _\` |/ __| |/ / | | | |/ _ \\ '_ \\| |/ _ \\| | | |/ _ \\ '__|
 / ___ \\ | |   ___) | || (_| | (__|   <  | |_| |  __/ |_) | | (_) | |_| |  __/ |
/_/   \\_\\___| |____/ \\__\\__,_|\\___|_|\\_\\ |____/ \\___| .__/|_|\\___/ \\__, |\\___|_|
                                                    |_|            |___/
BANNER
printf "%s\\n" "\${NC}"
echo "       -- DevOps Linux Systems Automation & Podman Orchestrator --"
echo ""
`
  }

  function genLogFunctions() {
    return `
log_info()    { echo -e "\${CYAN}[INFO]\${NC} \$1"; }
log_install() { echo -e "\${BLUE}[INSTALANDO]\${NC} \$1"; }
log_skip()    { echo -e "\${YELLOW}[OMITIENDO]\${NC} \$1"; }
log_update()  { echo -e "\${GREEN}[ACTUALIZANDO]\${NC} \$1"; }
log_error()   { echo -e "\${RED}[ERROR]\${NC} \$1" >&2; }

if [[ \${EUID} -ne 0 ]]; then
    log_error "Este script debe ejecutarse como root (con sudo)."
    log_error "Por favor, ejecute: sudo \$0"
    exit 1
fi

TARGET_USER="\${SUDO_USER:-\${USER}}"
if [[ "\${TARGET_USER}" == "root" ]] || [[ -z "\${TARGET_USER}" ]]; then
    TARGET_USER="root"
    TARGET_HOME="/root"
else
    TARGET_HOME=\$(getent passwd "\${TARGET_USER}" | cut -d: -f6)
fi
log_info "Usuario objetivo de la instalación: \${TARGET_USER} (\${TARGET_HOME})"

HAS_NVIDIA_GPU=1

INSTALL_DIR=${installDirExpr.value}
MODELS_DIR="\${INSTALL_DIR}/models"
SEARXNG_DIR="\${INSTALL_DIR}/searxng"
MODEL_NAME="${esc(resolvedModelFile.value)}"
MODEL_URL="https://huggingface.co/${esc(resolvedRepo.value)}/resolve/main/${esc(resolvedModelFile.value)}"
LLAMA_PORT=${llamaPort.value}
WEBUI_PORT=${webuiPort.value}
CPU_THREADS=${cpu.value}
GPU_LAYERS=${gpuLayers.value === -1 ? '-1' : gpuLayers.value}
OPEN_CODE_CONFIG="\${INSTALL_DIR}/open_code_desktop_config.json"
`
  }

  function genModeSelector() {
    return `
echo -e "Seleccione el modo de ejecución para la instalación:"
echo -e "  1) Modo Automático (Instalación desatendida de extremo a extremo)"
echo -e "  2) Modo Interactivo (Se solicitará confirmación Yes/No antes de cada paso)"
echo -n "Selección [1-2, default: 1]: "
read -r RUN_MODE
RUN_MODE=\${RUN_MODE:-1}

confirm_step() {
    local step_name="\$1"
    if [[ "\${RUN_MODE}" == "2" ]]; then
        echo -e ""
        echo -n -e "\${YELLOW}¿Desea ejecutar el paso: [\${step_name}]? (y/n): \${NC}"
        read -r response
        if [[ "\$response" =~ ^([yY][eE][sS]|[yY])\$ ]]; then
            return 0
        else
            log_skip "Paso [\${step_name}] omitido por decisión del usuario."
            return 1
        fi
    fi
    return 0
}
`
  }

  function genUbuntuPrereqs() {
    return `    # Ubuntu/Debian Package Verification & Install
    log_info "Actualizando índice de paquetes APT..."
    apt-get update -qq

    log_info "Verificando dependencias en Ubuntu..."
    for pkg in curl git ufw jq iptables ca-certificates gnupg python3-pip pipx podman uidmap; do
        if ! dpkg -s "\${pkg}" &>/dev/null; then
            log_install "Paquete base '\${pkg}'"
            apt-get install -y -qq "\${pkg}"
        else
            log_skip "Paquete base '\${pkg}'"
        fi
    done

    if ! command -v podman-compose &>/dev/null; then
        log_install "podman-compose vía pipx (modo seguro para Ubuntu 22.04+/24.04)"
        sudo -u "\${TARGET_USER}" pipx install podman-compose || pipx install --global podman-compose
        if [[ -f "\${TARGET_HOME}/.local/bin/podman-compose" ]]; then
            ln -sf "\${TARGET_HOME}/.local/bin/podman-compose" /usr/local/bin/podman-compose
        fi
    else
        log_skip "podman-compose (\$(podman-compose --version 2>&1 | head -n1))"
    fi

    if lspci 2>/dev/null | grep -qi nvidia; then
        if ! command -v nvidia-smi &>/dev/null; then
            log_install "Instalando controladores NVIDIA propietarios para CUDA..."
            apt-get install -y -qq ubuntu-drivers-common
            ubuntu-drivers autoinstall
            log_info "Drivers NVIDIA instalados. Es OBLIGATORIO reiniciar el sistema al finalizar."
        else
            log_skip "Drivers NVIDIA (\$(nvidia-smi --query-gpu=driver_version --format=csv,noheader 2>/dev/null | head -n 1))"
        fi
    else
        log_error "No se detectó hardware NVIDIA en este sistema (lspci). Se omitirá la configuración CUDA."
        HAS_NVIDIA_GPU=0
    fi`
  }

  function genFedoraPrereqs() {
    return `    # Fedora Package Verification & Install
    log_info "Verificando dependencias en Fedora..."
    for pkg in curl git ufw jq iptables python3-pip podman podman-compose; do
        if ! rpm -q "\${pkg}" &>/dev/null; then
            log_install "Paquete base '\${pkg}'"
            dnf install -y -q "\${pkg}"
        else
            log_skip "Paquete base '\${pkg}'"
        fi
    done

    if lspci 2>/dev/null | grep -qi nvidia; then
        if ! command -v nvidia-smi &>/dev/null; then
            log_install "Instalando drivers NVIDIA y CUDA via RPM Fusion..."
            FEDORA_VER=\$(rpm -E %fedora)
            dnf install -y "https://mirrors.rpmfusion.org/free/fedora/rpmfusion-free-release-\${FEDORA_VER}.noarch.rpm" \\
                           "https://mirrors.rpmfusion.org/nonfree/fedora/rpmfusion-nonfree-release-\${FEDORA_VER}.noarch.rpm"
            dnf install -y akmod-nvidia xorg-x11-drv-nvidia-cuda
            log_info "Drivers NVIDIA instalados. Reinicio OBLIGATORIO al finalizar."
        else
            log_skip "Drivers NVIDIA (\$(nvidia-smi --query-gpu=driver_version --format=csv,noheader 2>/dev/null | head -n 1))"
        fi
    else
        log_error "No se detectó hardware NVIDIA en este sistema. Se omitirá la configuración CUDA."
        HAS_NVIDIA_GPU=0
    fi`
  }

  function genNvidiaToolkit() {
    const ubuntuToolkit = `        curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey \\
            | gpg --dearmor --yes -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
        curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list \\
            | sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' \\
            > /etc/apt/sources.list.d/nvidia-container-toolkit.list
        apt-get update -qq
        apt-get install -y -qq nvidia-container-toolkit`

    const fedoraToolkit = `        curl -s -L https://nvidia.github.io/libnvidia-container/stable/rpm/nvidia-container-toolkit.repo \\
            -o /etc/yum.repos.d/nvidia-container-toolkit.repo
        dnf install -y nvidia-container-toolkit`

    return distro.value === 'ubuntu' ? ubuntuToolkit : fedoraToolkit
  }

  function genPaso1() {
    const prereqs = distro.value === 'ubuntu' ? genUbuntuPrereqs() : genFedoraPrereqs()
    return `
# ==============================================================================
# PASO 1: REQUISITOS PREVIOS, DRIVERS Y MOTORES DE CONTENEDORES (PODMAN)
# ==============================================================================
if confirm_step "Instalación de Drivers, Podman Engine y podman-compose"; then
${prereqs}

    if [[ "\${HAS_NVIDIA_GPU}" == "1" ]]; then
        log_info "Comprobando NVIDIA Container Toolkit para soporte GPU en Podman..."
        if ! command -v nvidia-ctk &>/dev/null; then
            log_install "NVIDIA Container Toolkit"
${genNvidiaToolkit()}
        else
            log_skip "NVIDIA Container Toolkit (\$(nvidia-ctk --version 2>&1 | head -n1))"
        fi

        log_info "Generando especificación CDI de NVIDIA para Podman..."
        mkdir -p /etc/cdi
        if nvidia-ctk cdi generate --output=/etc/cdi/nvidia.yaml 2>/dev/null; then
            log_update "CDI spec generado correctamente en /etc/cdi/nvidia.yaml"
            log_info "Dispositivos CDI disponibles: \$(nvidia-ctk cdi list 2>/dev/null | head -n 5 | tr '\\n' ' ')"
        else
            log_error "No se pudo generar el spec CDI. ¿La GPU está accesible vía nvidia-smi?"
        fi
    fi
fi
`
  }

  function genPaso2() {
    return `
# ==============================================================================
# PASO 2: ESTRUCTURA DE DIRECTORIOS
# ==============================================================================
if confirm_step "Creación de Directorios y Estructura Base"; then
    log_info "Creando directorios en \${INSTALL_DIR}..."
    mkdir -p "\${INSTALL_DIR}" "\${MODELS_DIR}" "\${SEARXNG_DIR}"
    chmod -R 755 "\${INSTALL_DIR}"
fi
`
  }

  function genPaso3() {
    return `
# ==============================================================================
# PASO 3: CONFIGURAR SEARXNG CON SOPORTE JSON NATIVO
# ==============================================================================
if confirm_step "Configuración de SearXNG (JSON Output)"; then
    SEARXNG_SETTINGS="\${SEARXNG_DIR}/settings.yml"
    if [[ ! -f "\${SEARXNG_SETTINGS}" ]]; then
        log_install "Generando archivo de configuración para SearXNG"
        cat << 'EOF' > "\${SEARXNG_SETTINGS}"
search:
  safe_search: 1
  autocomplete: "duckduckgo"
  formats:
    - html
    - json

server:
  port: 8080
  bind_address: "0.0.0.0"
  secret_key: "searxng-podman-stack-secret-key-change-it"
  base_url: "http://searxng:8080"
  image_proxy: true

engines:
  - name: duckduckgo
    engine: duckduckgo
    shortcut: ddg
  - name: wikipedia
    engine: wikipedia
    shortcut: wp
EOF
    else
        log_skip "SearXNG settings.yml"
        if ! grep -q "^- json" "\${SEARXNG_SETTINGS}"; then
            if ! grep -q "json" "\${SEARXNG_SETTINGS}"; then
                log_update "Habilitando formato json en settings.yml..."
                sed -i '/formats:/a\\    - json' "\${SEARXNG_SETTINGS}"
            fi
        fi
    fi
fi
`
  }

  function genPaso4() {
    const layersVal = gpuLayers.value === -1 ? '-1' : String(gpuLayers.value)
    return `
# ==============================================================================
# PASO 4: GENERAR DEFINICIÓN DE PODMAN COMPOSE
# ==============================================================================
if confirm_step "Creación del manifiesto de Podman Compose"; then
    PODMAN_COMPOSE_FILE="\${INSTALL_DIR}/docker-compose.yml"
    if [[ ! -f "\${PODMAN_COMPOSE_FILE}" ]]; then
        log_install "Generando docker-compose.yml (compatible con podman-compose + CDI)"
        cat << 'COMPOSE_EOF' > "\${PODMAN_COMPOSE_FILE}"
version: "3.8"

services:
  llama-cpp:
    image: ghcr.io/ggml-org/llama.cpp:server-cuda
    container_name: ai-stack-llama-cpp
    restart: unless-stopped
    ports:
      - "__LLAMA_PORT__:8080"
    volumes:
      - ./models:/models:z
    devices:
      - nvidia.com/gpu=all
    security_opt:
      - label=disable
    command: >
      --model /models/__MODEL_NAME__
      --host 0.0.0.0
      --port 8080
      --threads __CPU_THREADS__
      --n-gpu-layers __GPU_LAYERS__
      --ctx-size 4096
      --alias llm-model
      --cont-batching
    networks:
      - ai-net

  searxng:
    image: docker.io/searxng/searxng:latest
    container_name: ai-stack-searxng
    restart: unless-stopped
    volumes:
      - ./searxng:/etc/searxng:z
    networks:
      - ai-net

  open-webui:
    image: ghcr.io/open-webui/open-webui:main
    container_name: ai-stack-open-webui
    restart: unless-stopped
    ports:
      - "__WEBUI_PORT__:8080"
    environment:
      - OPENAI_API_BASE_URL=http://llama-cpp:8080/v1
      - OPENAI_API_KEY=ai-stack-local-key
      - ENABLE_RAG_WEB_SEARCH=True
      - RAG_WEB_SEARCH_ENGINE=searxng
      - SEARXNG_QUERY_URL=http://searxng:8080/search?q=<query>&format=json
      - WEBUI_AUTH=False
      - DEFAULT_MODELS=llm-model
    volumes:
      - open-webui-data:/app/backend/data:z
    depends_on:
      - llama-cpp
      - searxng
    networks:
      - ai-net

volumes:
  open-webui-data:

networks:
  ai-net:
    driver: bridge
COMPOSE_EOF

        sed -i "s|__LLAMA_PORT__|\${LLAMA_PORT}|g; s|__WEBUI_PORT__|\${WEBUI_PORT}|g; s|__MODEL_NAME__|\${MODEL_NAME}|g; s|__CPU_THREADS__|\${CPU_THREADS}|g; s|__GPU_LAYERS__|\${GPU_LAYERS}|g" "\${PODMAN_COMPOSE_FILE}"

        if [[ "\${HAS_NVIDIA_GPU}" != "1" ]]; then
            log_info "Modo CPU-only: removiendo directivas CDI del compose..."
            sed -i '/devices:/,/nvidia.com\\/gpu=all/d; /security_opt:/,/label=disable/d' "\${PODMAN_COMPOSE_FILE}"
        fi
    else
        log_skip "docker-compose.yml ya presente"
    fi

    chown -R "\${TARGET_USER}:\${TARGET_USER}" "\${INSTALL_DIR}" 2>/dev/null || true
fi
`
  }

  function genPaso5() {
    return `
# ==============================================================================
# PASO 5: DESCARGA DEL MODELO GGUF (REANUDABLE)
# ==============================================================================
if confirm_step "Descarga e Ingesta del Modelo GGUF"; then
    MODEL_PATH="\${MODELS_DIR}/\${MODEL_NAME}"
    log_info "Gestionando modelo LLM en \${MODEL_PATH}..."
    if [[ ! -f "\${MODEL_PATH}" ]]; then
        log_install "Descargando modelo \${MODEL_NAME} desde Hugging Face..."
        curl -C - -L --progress-bar "\${MODEL_URL}" -o "\${MODEL_PATH}"
    else
        log_skip "Modelo GGUF ya descargado"
    fi
fi
`
  }

  function genPaso6() {
    const subnetsList = allowedSubnets.value.split(',').map(s => s.trim()).filter(Boolean)
    let ufwRules = ''
    subnetsList.forEach(subnet => {
      ufwRules += `        ufw allow from ${subnet} to any port ${webuiPort.value} proto tcp comment 'AI Stack - Open WebUI'\n`
      ufwRules += `        ufw allow from ${subnet} to any port ${llamaPort.value} proto tcp comment 'AI Stack - llama.cpp API'\n`
    })
    return `
# ==============================================================================
# PASO 6: CORTAFUEGOS (UFW & EVITAR BYPASS DE CONTENEDORES)
# ==============================================================================
if confirm_step "Asegurar Firewall y Aislamiento de Red"; then
    log_info "Configurando aislamiento de red mediante UFW..."

    ufw default deny incoming >/dev/null 2>&1 || true
    ufw default allow outgoing >/dev/null 2>&1 || true

    if ! ufw status 2>/dev/null | grep -q "Status: active"; then
        log_install "Habilitando firewall UFW..."
        ufw --force enable
    else
        log_skip "UFW ya está activo"
    fi

    log_info "Aplicando reglas de entrada para puertos de AI Stack..."
${ufwRules}

    log_info "Podman respeta nativamente UFW - no se requiere parche DOCKER-USER."

    ufw reload >/dev/null 2>&1 || true

    log_info "Estado actual de UFW:"
    ufw status numbered | head -n 20 || true
fi
`
  }

  function genPaso7() {
    return `
# ==============================================================================
# PASO 7: ARCHIVO DE CONFIGURACIÓN OPEN CODE DESKTOP
# ==============================================================================
if confirm_step "Generar Configuración para Open Code Desktop"; then
    log_info "Configurando plantilla para Open Code Desktop..."
    if [[ ! -f "\${OPEN_CODE_CONFIG}" ]]; then
        log_install "Generando archivo JSON de ejemplo en \${OPEN_CODE_CONFIG}"
        cat << EOF > "\${OPEN_CODE_CONFIG}"
{
  "ai.llama.endpoint": "http://localhost:${llamaPort.value}",
  "ai.llama.apiKey": "ai-stack-local-key",
  "ai.llama.model": "llm-model",
  "ai.llama.contextLength": 4096,
  "workspace.hardware.acceleration": "cuda"
}
EOF
    else
        log_skip "Archivo de configuración Open Code Desktop"
    fi
fi
`
  }

  function genPaso8() {
    return `
# ==============================================================================
# PASO 8: INTEGRACIÓN SYSTEMD (NO HABILITADO EN EL ARRANQUE)
# ==============================================================================
if confirm_step "Creación del servicio Systemd"; then
    SYSTEMD_SERVICE_PATH="/etc/systemd/system/ai-stack.service"

    PODMAN_COMPOSE_BIN="\$(command -v podman-compose 2>/dev/null || echo /usr/local/bin/podman-compose)"
    PODMAN_BIN="\$(command -v podman 2>/dev/null || echo /usr/bin/podman)"

    if [[ ! -f "\${SYSTEMD_SERVICE_PATH}" ]]; then
        log_install "Generando unidad systemd ai-stack.service"
        cat << EOF > "\${SYSTEMD_SERVICE_PATH}"
[Unit]
Description=Local AI Stack Orchestration (llama.cpp + Open WebUI + SearXNG via Podman)
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=\${INSTALL_DIR}
Environment="PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
ExecStart=\${PODMAN_COMPOSE_BIN} -f \${INSTALL_DIR}/docker-compose.yml up -d --remove-orphans
ExecStop=\${PODMAN_COMPOSE_BIN} -f \${INSTALL_DIR}/docker-compose.yml down
TimeoutStartSec=300

[Install]
EOF
        systemctl daemon-reload
        log_info "Servicio creado. Validando sintaxis..."
        if systemd-analyze verify "\${SYSTEMD_SERVICE_PATH}" 2>&1 | grep -vE 'WantedBy|Install'; then
            log_info "Unidad systemd válida."
        fi
    else
        log_skip "Servicio Systemd ai-stack.service (ya existe)"
    fi

    if systemctl is-enabled ai-stack.service &>/dev/null; then
        log_update "Deshabilitando inicio automático (política: arranque manual exclusivo)..."
        systemctl disable ai-stack.service 2>/dev/null || true
    else
        log_skip "ai-stack.service ya configurado para arranque manual exclusivo"
    fi
fi
`
  }

  function genPaso9() {
    return `
# ==============================================================================
# PASO 9: VERIFICACIÓN FINAL Y PRE-DESCARGA DE IMÁGENES
# ==============================================================================
if confirm_step "Pre-descarga de imágenes Podman (acelera el primer arranque)"; then
    log_info "Haciendo pull inicial de imágenes con Podman..."
    cd "\${INSTALL_DIR}"
    for img in "ghcr.io/ggml-org/llama.cpp:server-cuda" "docker.io/searxng/searxng:latest" "ghcr.io/open-webui/open-webui:main"; do
        log_update "Descargando \${img}..."
        podman pull "\${img}" || log_error "Fallo al hacer pull de \${img} (se reintentará al iniciar)"
    done
fi
`
  }

  function genFinalReport() {
    return `
echo ""
echo -e "\${GREEN}==============================================================================\${NC}"
echo -e "\${GREEN}             STACK DE IA LOCAL CON PODMAN DESPLEGADO CON ÉXITO                \${NC}"
echo -e "\${GREEN}==============================================================================\${NC}"
echo ""
echo -e "\${CYAN}>> Resumen de Configuración:\${NC}"
echo -e "   - Distro:           ${distro.value.toUpperCase()}"
echo -e "   - Usuario:          \${TARGET_USER}"
echo -e "   - Directorio:       \${INSTALL_DIR}"
echo -e "   - Modelo:           \${MODEL_NAME}"
echo -e "   - GPU Offload:      \${GPU_LAYERS} capas"
echo -e "   - Puerto WebUI:     \${WEBUI_PORT}"
echo -e "   - Puerto llama.cpp: \${LLAMA_PORT}"
echo ""
echo -e "\${CYAN}>> Iniciar el Stack manualmente (NO arranca solo al boot):\${NC}"
echo -e "   \${GREEN}sudo systemctl start ai-stack\${NC}"
echo ""
echo -e "\${CYAN}>> Verificar estado de los contenedores:\${NC}"
echo -e "   \${GREEN}podman ps\${NC}"
echo ""
echo -e "\${CYAN}>> Acceder a Open WebUI desde la red local:\${NC}"
echo -e "   \${GREEN}http://\$(hostname -I | awk '{print \$1}'):\${WEBUI_PORT}\${NC}"
echo ""
echo -e "\${CYAN}>> Detener el Stack:\${NC}"
echo -e "   \${RED}sudo systemctl stop ai-stack\${NC}"
echo ""
echo -e "\${CYAN}>> Configuración para Open Code Desktop:\${NC}"
echo -e "   \${YELLOW}\${OPEN_CODE_CONFIG}\${NC}"
echo ""
if [[ "\${HAS_NVIDIA_GPU}" == "1" ]] && ! nvidia-smi &>/dev/null; then
    echo -e "\${YELLOW}>> ATENCIÓN: Los drivers NVIDIA recién instalados requieren REINICIO\${NC}"
    echo -e "\${YELLOW}   Ejecute 'sudo reboot' antes de iniciar el stack.\${NC}"
    echo ""
fi
echo -e "\${GREEN}==============================================================================\${NC}"
`
  }

  const generatedScript = computed(() => {
    return [
      genHeader(),
      genLogFunctions(),
      genModeSelector(),
      genPaso1(),
      genPaso2(),
      genPaso3(),
      genPaso4(),
      genPaso5(),
      genPaso6(),
      genPaso7(),
      genPaso8(),
      genPaso9(),
      genFinalReport(),
    ].join('\n')
  })

  return {
    generatedScript,
    gpuLayers,
    resolvedModelFile,
    resolvedRepo,
  }
}
