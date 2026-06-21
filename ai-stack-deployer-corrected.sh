#!/usr/bin/env bash
# ==============================================================================
# AI STACK DEPLOYER — VERSIÓN CORREGIDA (Ubuntu, Podman, rootful de sistema)
# ==============================================================================
# SO objetivo     : Ubuntu 22.04/24.04 LTS
# Idempotente     : Sí (preserva configs y modelo ya descargado)
# Stack           : llama.cpp + Open WebUI + SearXNG + OpenCode
# GPU             : NVIDIA via CDI (Container Device Interface) si está disponible
# Fallback        : CPU si no hay GPU NVIDIA o VRAM insuficiente
# Arranque        : Manual (no se habilita en el boot)
#
# IMPORTANTE: Este script ejecuta Podman como root (rootful). Es el modo más
# estable y reproducible en Ubuntu. Evita problemas de subuid/subgid, permisos
# de CDI, user namespaces y systemd --user. Si prefieres rootless real, avísame.
# ==============================================================================
set -euo pipefail

# ── Colores ───────────────────────────────────────────────────────────────────
RED=$'\033[1;31m'; GREEN=$'\033[1;32m'; YELLOW=$'\033[1;33m'
BLUE=$'\033[1;34m'; CYAN=$'\033[1;36m'; NC=$'\033[0m'
log_info()    { echo -e "${CYAN}[INFO]${NC} $1"; }
log_install() { echo -e "${BLUE}[INSTALANDO]${NC} $1"; }
log_skip()    { echo -e "${YELLOW}[OMITIENDO]${NC} $1"; }
log_ok()      { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn()    { echo -e "${YELLOW}[AVISO]${NC} $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1" >&2; }

# ── Banner ───────────────────────────────────────────────────────────────────
clear
printf "${GREEN}"
cat << 'BANNER'
    _            _       _              __ _       _     _
   / \   _ __ __| | __ _| | _____      / /(_) __ _| |__ | |__   ___ _ __
  / _ \ | '__/ _` |/ _` | |/ / _ \    / / | |/ _` | '_ \| '_ \ / _ \ '__|
 / ___ \| | | (_| | (_| |   <  __/   / /__| | (_| | | | | | | |  __/ |
/_/   \_\_|  \__,_|\__,_|_|\_\___|   \____/|\__, |_| |_|_| |_|\___|_|
                                            |___/
BANNER
printf "${NC}"
echo " Ubuntu · Podman · llama.cpp · Open WebUI · SearXNG · OpenCode"
echo ""

# ── Validación root ─────────────────────────────────────────────────────────
if [[ ${EUID} -ne 0 ]]; then
  log_error "Ejecutar con sudo: sudo $0"
  exit 1
fi

# ── Usuario objetivo (quien ejecutó sudo) ───────────────────────────────────
TARGET_USER="${SUDO_USER:-${USER}}"
if [[ -z "${TARGET_USER}" || "${TARGET_USER}" == "root" ]]; then
  TARGET_USER="root"
  TARGET_HOME="/root"
else
  TARGET_HOME=$(getent passwd "${TARGET_USER}" | cut -d: -f6)
fi
log_info "Usuario de instalación: ${TARGET_USER} (HOME: ${TARGET_HOME})"

# ── Variables globales ───────────────────────────────────────────────────────
INSTALL_DIR="${TARGET_HOME}/ai-stack"
MODELS_DIR="${INSTALL_DIR}/models"
SEARXNG_DIR="${INSTALL_DIR}/searxng"
COMPOSE_FILE="${INSTALL_DIR}/podman-compose.yml"
SYSTEMD_SVC="/etc/systemd/system/ai-stack.service"

MODEL_NAME="qwen2.5-coder-14b-instruct-q4_k_m.gguf"
HF_REPO="Qwen/Qwen2.5-Coder-14B-Instruct-GGUF"
MODEL_URL="https://huggingface.co/${HF_REPO}/resolve/main/${MODEL_NAME}?download=true"
MODEL_SIZE_GB="9"

LLAMA_PORT=3000
WEBUI_PORT=8080

# Detectar CPU threads reales (dejar 1 libre para el sistema)
CPU_THREADS=$(nproc)
CPU_THREADS=$((CPU_THREADS > 1 ? CPU_THREADS - 1 : 1))

# Modo de ejecución
RUN_MODE="1"
echo "Modo de ejecución:"
echo " 1) Automático (sin interrupciones)"
echo " 2) Interactivo (confirmación en cada paso)"
echo -n "Selección [1-2, default 1]: "
read -r RUN_MODE_INPUT || true
RUN_MODE="${RUN_MODE_INPUT:-1}"
confirm_step() {
  [[ "${RUN_MODE}" != "2" ]] && return 0
  echo ""; echo -n -e "${YELLOW}¿Ejecutar [$1]? (y/n): ${NC}"
  read -r r || true
  [[ "$r" =~ ^[yY] ]] && return 0
  log_skip "[$1] omitido."; return 1
}

# Detectar GPU NVIDIA y VRAM
HAS_NVIDIA_GPU=0
GPU_VRAM_MB=0
GPU_LAYERS=0
NEEDS_REBOOT=0

detect_gpu() {
  if ! command -v lspci >/dev/null 2>&1; then
    apt-get update -qq 2>/dev/null || true
    apt-get install -y -qq pciutils >/dev/null 2>&1 || true
  fi

  if lspci 2>/dev/null | grep -qiE 'nvidia.*(vga|3d|display)'; then
    HAS_NVIDIA_GPU=1
    log_info "GPU NVIDIA detectada."
    if command -v nvidia-smi >/dev/null 2>&1; then
      GPU_VRAM_MB=$(nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits 2>/dev/null | head -n1 | tr -d ' ' || echo 0)
      log_info "VRAM detectada: ${GPU_VRAM_MB} MB"
    fi
  else
    log_warn "No se detectó GPU NVIDIA. Se usará modo CPU."
    HAS_NVIDIA_GPU=0
    GPU_VRAM_MB=0
  fi
}

# Calcular GPU layers: si VRAM >= 10 GB, offload total (-1), sino CPU (0)
calculate_gpu_layers() {
  if [[ "${HAS_NVIDIA_GPU}" == "0" ]]; then
    GPU_LAYERS=0
    return
  fi
  if [[ "${GPU_VRAM_MB}" -ge 10240 ]]; then
    GPU_LAYERS=-1
    log_info "VRAM >= 10 GB: se usará offload completo (GPU_LAYERS=-1)."
  else
    GPU_LAYERS=0
    log_warn "VRAM < 10 GB: se usará CPU para evitar fallos por falta de VRAM."
  fi
}

# ── Instalación de paquetes ─────────────────────────────────────────────────
install_packages() {
  log_info "Actualizando índices de APT..."
  apt-get update -qq

  log_info "Instalando dependencias base..."
  local pkgs=(curl git jq ca-certificates gnupg python3-pip pipx podman uidmap slirp4netns fuse-overlayfs pciutils ufw)
  for pkg in "${pkgs[@]}"; do
    if ! dpkg -s "${pkg}" >/dev/null 2>&1; then
      # uidmap puede llamarse shadow-utils en versiones recientes
      if [[ "${pkg}" == "uidmap" ]] && ! apt-cache show uidmap >/dev/null 2>&1; then
        log_install "'shadow' (uidmap no disponible)"
        apt-get install -y -qq shadow
        continue
      fi
      log_install "'${pkg}'"
      apt-get install -y -qq "${pkg}"
    else
      log_skip "'${pkg}'"
    fi
  done
}

# ── Verificar/actualizar Podman para CDI (solo Ubuntu 22.04 + NVIDIA) ──────
upgrade_podman_for_cdi() {
  [[ "${HAS_NVIDIA_GPU}" == "0" ]] && return 0
  local major minor
  major=$(podman version --format '{{.Version}}' 2>/dev/null | cut -d. -f1)
  minor=$(podman version --format '{{.Version}}' 2>/dev/null | cut -d. -f2)
  major=${major:-0}; minor=${minor:-0}

  if [[ "${major}" -ge 4 ]]; then
    log_ok "Podman ${major}.${minor} compatible con CDI"
    return 0
  fi

  log_warn "Podman ${major}.${minor} no soporta CDI (requiere >= 4.0)"
  log_install "Instalando Podman desde repositorio estable de containers..."
  local version_id
  version_id=$(. /etc/os-release && echo "${VERSION_ID}")
  if [[ "${version_id}" != "22.04" ]]; then
    log_warn "No hay repositorio actualizado para Ubuntu ${version_id}. Usando modo CPU."
    HAS_NVIDIA_GPU=0; GPU_LAYERS=0
    return 0
  fi

  mkdir -p /etc/apt/keyrings
  curl -fsSL "https://download.opensuse.org/repositories/devel:/kubic:/libcontainers:/stable/xUbuntu_${version_id}/Release.key" \
    | gpg --dearmor --yes -o /etc/apt/keyrings/devel_kubic_libcontainers_stable.gpg || {
    log_warn "No se pudo añadir el repositorio de Podman. Usando modo CPU."
    HAS_NVIDIA_GPU=0; GPU_LAYERS=0
    return 0
  }
  echo "deb [signed-by=/etc/apt/keyrings/devel_kubic_libcontainers_stable.gpg] https://download.opensuse.org/repositories/devel:/kubic:/libcontainers:/stable/xUbuntu_${version_id}/ /" \
    > /etc/apt/sources.list.d/devel:kubic:libcontainers:stable.list
  apt-get update -qq
  apt-get install -y -qq podman
  log_ok "Podman actualizado: $(podman version --format '{{.Version}}')"
}

# ── podman-compose ─────────────────────────────────────────────────────────
install_podman_compose() {
  if command -v podman-compose >/dev/null 2>&1; then
    log_skip "podman-compose ya disponible: $(podman-compose --version 2>&1 | head -n1)"
    return 0
  fi

  if apt-cache show podman-compose >/dev/null 2>&1; then
    log_install "podman-compose (paquete APT)"
    apt-get install -y -qq podman-compose
    # Crear symlink por consistencia (el servicio busca en PATH)
    if command -v podman-compose >/dev/null 2>&1; then
      ln -sf "$(command -v podman-compose)" /usr/local/bin/podman-compose 2>/dev/null || true
    fi
  else
    log_install "podman-compose (via pipx)"
    if [[ "${TARGET_USER}" != "root" ]]; then
      sudo -u "${TARGET_USER}" pipx install --include-deps podman-compose
      PIPX_BIN="${TARGET_HOME}/.local/bin/podman-compose"
    else
      pipx install --include-deps podman-compose
      PIPX_BIN="/root/.local/bin/podman-compose"
    fi
    if [[ -f "${PIPX_BIN}" ]]; then
      ln -sf "${PIPX_BIN}" /usr/local/bin/podman-compose
      log_ok "Symlink creado: /usr/local/bin/podman-compose"
    fi
  fi

  if ! command -v podman-compose >/dev/null 2>&1; then
    # Fallback: buscar en ubicaciones conocidas
    for _bin in /usr/local/bin/podman-compose /usr/bin/podman-compose "${TARGET_HOME}/.local/bin/podman-compose" /root/.local/bin/podman-compose; do
      if [[ -f "${_bin}" ]]; then
        ln -sf "${_bin}" /usr/local/bin/podman-compose 2>/dev/null || true
        break
      fi
    done
  fi

  if ! command -v podman-compose >/dev/null 2>&1; then
    log_error "No se pudo instalar podman-compose en ninguna ubicación. Abortando."
    exit 1
  fi
}

# ── NVIDIA drivers ───────────────────────────────────────────────────────────
install_nvidia_drivers() {
  if [[ "${HAS_NVIDIA_GPU}" == "0" ]]; then return 0; fi

  if command -v nvidia-smi >/dev/null 2>&1; then
    log_skip "Drivers NVIDIA ya instalados: $(nvidia-smi --query-gpu=driver_version --format=csv,noheader 2>/dev/null | head -n1)"
    return 0
  fi

  log_install "Drivers NVIDIA (ubuntu-drivers autoinstall)..."
  apt-get install -y -qq ubuntu-drivers-common
  ubuntu-drivers autoinstall
  NEEDS_REBOOT=1
}

# ── NVIDIA Container Toolkit + CDI ──────────────────────────────────────────
install_nvidia_container_toolkit() {
  if [[ "${HAS_NVIDIA_GPU}" == "0" ]]; then return 0; fi

  if command -v nvidia-ctk >/dev/null 2>&1; then
    log_skip "NVIDIA Container Toolkit ya instalado: $(nvidia-ctk --version 2>&1 | head -n1)"
  else
    log_install "NVIDIA Container Toolkit"
    curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey \
      | gpg --dearmor --yes -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
    curl -fsSL https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list \
      | sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' \
      > /etc/apt/sources.list.d/nvidia-container-toolkit.list
    apt-get update -qq
    apt-get install -y -qq nvidia-container-toolkit
  fi

  log_info "Generando spec CDI en /etc/cdi/nvidia.yaml..."
  mkdir -p /etc/cdi
  if nvidia-ctk cdi generate --output=/etc/cdi/nvidia.yaml 2>/dev/null; then
    log_ok "CDI spec generado correctamente"
    nvidia-ctk cdi list 2>/dev/null | head -n 10 | while read -r d; do
      [[ -n "$d" ]] && log_info " CDI: ${d}"
    done
  else
    log_warn "No se pudo generar el spec CDI. Se continuará en modo CPU."
    HAS_NVIDIA_GPU=0
    GPU_LAYERS=0
  fi
}

# ── Directorios ─────────────────────────────────────────────────────────────
create_directories() {
  mkdir -p "${INSTALL_DIR}" "${MODELS_DIR}" "${SEARXNG_DIR}"
  chmod 755 "${INSTALL_DIR}" "${MODELS_DIR}" "${SEARXNG_DIR}"
  chown -R "${TARGET_USER}:${TARGET_USER}" "${INSTALL_DIR}" 2>/dev/null || true
  log_ok "Directorios listos: ${INSTALL_DIR}"
}

# ── SearXNG settings ────────────────────────────────────────────────────────
configure_searxng() {
  local settings="${SEARXNG_DIR}/settings.yml"
  if [[ -f "${settings}" ]]; then
    log_skip "SearXNG settings.yml ya existe"
    return 0
  fi

  log_install "Generando settings.yml para SearXNG"
  cat > "${settings}" << 'SEARXNG_EOF'
search:
  safe_search: 1
  autocomplete: "duckduckgo"
  formats:
    - html
    - json
server:
  port: 8080
  bind_address: "0.0.0.0"
  secret_key: "cambia-esta-clave-en-produccion-2026"
  image_proxy: true
engines:
  - name: duckduckgo
    engine: duckduckgo
    shortcut: ddg
  - name: wikipedia
    engine: wikipedia
    shortcut: wp
    language: "es"
SEARXNG_EOF
  chown "${TARGET_USER}:${TARGET_USER}" "${settings}" 2>/dev/null || true
  log_ok "SearXNG configurado"
}

# ── Podman Compose ───────────────────────────────────────────────────────────
generate_compose() {
  if [[ -f "${COMPOSE_FILE}" ]]; then
    log_skip "podman-compose.yml ya existe"
    return 0
  fi

  log_install "Generando ${COMPOSE_FILE}"

  # Elegir imagen según GPU
  local llama_image
  if [[ "${HAS_NVIDIA_GPU}" == "1" && "${GPU_LAYERS}" == "-1" ]]; then
    llama_image="ghcr.io/ggml-org/llama.cpp:server-cuda"
  else
    llama_image="ghcr.io/ggml-org/llama.cpp:server"
  fi
  log_info "Imagen llama.cpp seleccionada: ${llama_image}"

  # Bloque de devices y security_opt solo para GPU
  local gpu_block=""
  if [[ "${HAS_NVIDIA_GPU}" == "1" && "${GPU_LAYERS}" == "-1" ]]; then
    gpu_block=$(cat << 'EOF'
    devices:
      - "nvidia.com/gpu=all"
    security_opt:
      - "label=disable"
EOF
)
  fi

  # --flash-attn solo para GPU (la imagen CPU no lo soporta)
  local flash_attn_block=""
  if [[ "${HAS_NVIDIA_GPU}" == "1" && "${GPU_LAYERS}" == "-1" ]]; then
    flash_attn_block='      - "--flash-attn"'
  fi

  cat > "${COMPOSE_FILE}" << COMPOSE_EOF
services:
  llama-cpp:
    image: ${llama_image}
    container_name: ai-stack-llama-cpp
    restart: unless-stopped
    ports:
      - "${LLAMA_PORT}:8080"
    volumes:
      - ./models:/models:z
${gpu_block}
    command:
      - "--model"
      - "/models/${MODEL_NAME}"
      - "--host"
      - "0.0.0.0"
      - "--port"
      - "8080"
      - "--threads"
      - "${CPU_THREADS}"
      - "--n-gpu-layers"
      - "${GPU_LAYERS}"
      - "--ctx-size"
      - "4096"
      - "--alias"
      - "llm-model"
      - "--cont-batching"
${flash_attn_block}
    networks:
      - ai-net

  searxng:
    image: docker.io/searxng/searxng:latest
    container_name: ai-stack-searxng
    restart: unless-stopped
    volumes:
      - ./searxng:/etc/searxng:z
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:8080/healthz"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 30s
    networks:
      - ai-net

  open-webui:
    image: ghcr.io/open-webui/open-webui:main
    container_name: ai-stack-open-webui
    restart: unless-stopped
    ports:
      - "${WEBUI_PORT}:8080"
    environment:
      - OPENAI_API_BASE_URL=http://llama-cpp:8080/v1
      - OPENAI_API_KEY=sk-local-no-auth-required
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

  chown "${TARGET_USER}:${TARGET_USER}" "${COMPOSE_FILE}" 2>/dev/null || true
  log_ok "podman-compose.yml generado"
}

# ── Verificar espacio en disco ────────────────────────────────────────────────
check_disk_space() {
  local required_1k=$((15 * 1024 * 1024))  # 15 GB en bloques de 1K
  local avail_1k
  avail_1k=$(df --output=avail "${INSTALL_DIR}" 2>/dev/null | tail -n1 | tr -d ' ')
  if [[ -z "${avail_1k}" || "${avail_1k}" -lt "${required_1k}" ]]; then
    local avail_mb=$((avail_1k / 1024))
    log_warn "Espacio disponible: ~$((avail_mb)) MB (se recomiendan 15360 MB libres)"
    log_warn "La descarga del modelo o las imágenes podría fallar por falta de espacio."
  else
    local avail_gb=$((avail_1k / 1024 / 1024))
    log_ok "Espacio en disco suficiente (~${avail_gb} GB disponibles)"
  fi
}

# ── Descarga del modelo ──────────────────────────────────────────────────────
download_model() {
  local model_path="${MODELS_DIR}/${MODEL_NAME}"

  if [[ -f "${model_path}" ]]; then
    local size_mb
    size_mb=$(du -m "${model_path}" | cut -f1)
    if [[ "${size_mb}" -gt 500 ]]; then
      log_skip "Modelo ya descargado (${size_mb} MB): ${MODEL_NAME}"
      return 0
    else
      log_warn "Modelo existente parece incompleto (${size_mb} MB). Re-descargando..."
      rm -f "${model_path}"
    fi
  fi

  log_install "Descargando ${MODEL_NAME} (~${MODEL_SIZE_GB} GB) desde HuggingFace..."
  log_info "Repo: ${HF_REPO}"
  log_info "URL:  ${MODEL_URL}"

  curl -C - -L --fail --progress-bar "${MODEL_URL}" -o "${model_path}" || {
    log_error "Descarga fallida. Verifica tu conexión y la URL."
    rm -f "${model_path}"
    exit 1
  }

  local final_size_mb
  final_size_mb=$(du -m "${model_path}" | cut -f1)
  if [[ "${final_size_mb}" -lt 500 ]]; then
    log_error "El modelo descargado parece incompleto (${final_size_mb} MB). Abortando."
    rm -f "${model_path}"
    exit 1
  fi

  chown "${TARGET_USER}:${TARGET_USER}" "${model_path}" 2>/dev/null || true
  log_ok "Modelo listo: ${model_path} (${final_size_mb} MB)"
}

# ── Firewall ───────────────────────────────────────────────────────────────────
configure_ufw() {
  if ! command -v ufw >/dev/null 2>&1; then
    log_warn "UFW no disponible. Se omite configuración de firewall."
    return 0
  fi

  log_info "Configurando UFW..."
  ufw default deny incoming >/dev/null 2>&1 || true
  ufw default allow outgoing >/dev/null 2>&1 || true
  ufw allow ssh comment 'SSH' >/dev/null 2>&1 || true

  if ! ufw status 2>/dev/null | grep -q "Status: active"; then
    ufw --force enable
    log_ok "UFW habilitado"
  else
    log_skip "UFW ya activo"
  fi

  # Detectar subred local conectada
  local detected_subnet
  detected_subnet=$(ip route | grep -m1 'scope link' | awk '{print $1}' || true)

  if [[ -n "${detected_subnet}" && "${detected_subnet}" != *"0.0.0.0"* ]]; then
    log_info "Permitiendo acceso desde la subred detectada: ${detected_subnet}"
    ufw allow from "${detected_subnet}" to any port "${WEBUI_PORT}" proto tcp comment 'AI Stack WebUI' >/dev/null 2>&1 || true
    ufw allow from "${detected_subnet}" to any port "${LLAMA_PORT}" proto tcp comment 'AI Stack llama.cpp' >/dev/null 2>&1 || true
  else
    log_warn "No se detectó subred local. Abriendo puertos a cualquier origen (menos seguro)."
    ufw allow "${WEBUI_PORT}"/tcp comment 'AI Stack WebUI' >/dev/null 2>&1 || true
    ufw allow "${LLAMA_PORT}"/tcp comment 'AI Stack llama.cpp' >/dev/null 2>&1 || true
  fi

  ufw reload >/dev/null 2>&1 || true
  log_info "Estado de UFW:"
  ufw status numbered 2>/dev/null | head -n 30 || true
}

# ── OpenCode ─────────────────────────────────────────────────────────────────
install_opencode() {
  if command -v opencode >/dev/null 2>&1; then
    log_skip "OpenCode ya instalado: $(opencode --version 2>&1 | head -n1)"
  else
    log_install "OpenCode (instalador oficial)"
    curl -fsSL https://opencode.ai/install | OPENCODE_INSTALL_DIR=/usr/local/bin bash
  fi

  if ! command -v opencode >/dev/null 2>&1; then
    log_warn "OpenCode no se pudo instalar automáticamente. Se continúa sin OpenCode."
    return 0
  fi

  local config_dir="${TARGET_HOME}/.config/opencode"
  local config_file="${config_dir}/opencode.json"
  local auth_file="${config_dir}/auth.json"
  mkdir -p "${config_dir}"

  if [[ ! -f "${config_file}" ]]; then
    log_install "Generando opencode.json"
    cat > "${config_file}" << OCODE_JSON
{
  "\$schema": "https://opencode.ai/config.json",
  "provider": {
    "llama-local": {
      "name": "llama.cpp local (AI Stack)",
      "npm": "@ai-sdk/openai-compatible",
      "options": {
        "baseURL": "http://localhost:${LLAMA_PORT}/v1"
      },
      "models": {
        "llm-model": {
          "name": "${MODEL_NAME}"
        }
      }
    }
  },
  "model": "llama-local/llm-model",
  "small_model": "llama-local/llm-model",
  "autoupdate": false
}
OCODE_JSON
    log_ok "opencode.json generado"
  else
    log_skip "opencode.json ya existe"
  fi

  if [[ ! -f "${auth_file}" ]]; then
    log_install "Generando auth.json"
    cat > "${auth_file}" << OCODE_AUTH
{
  "llama-local": "sk-local-no-auth-required"
}
OCODE_AUTH
    log_ok "auth.json generado"
  else
    log_skip "auth.json ya existe"
  fi

  chown -R "${TARGET_USER}:${TARGET_USER}" "${config_dir}" 2>/dev/null || true
}

# ── Servicio systemd ─────────────────────────────────────────────────────────
create_systemd_service() {
  if [[ ! -f "${COMPOSE_FILE}" ]]; then
    log_error "No existe ${COMPOSE_FILE}. No se puede crear el servicio."
    exit 1
  fi

  if [[ -f "${SYSTEMD_SVC}" ]]; then
    log_skip "ai-stack.service ya existe"
  else
    log_install "Creando ${SYSTEMD_SVC}"
    cat > "${SYSTEMD_SVC}" << SYSTEMD_EOF
[Unit]
Description=AI Stack local (llama.cpp + Open WebUI + SearXNG) via Podman
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=${INSTALL_DIR}
Environment="PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
ExecStartPre=podman-compose -f ${COMPOSE_FILE} pull
ExecStart=podman-compose -f ${COMPOSE_FILE} up -d --remove-orphans
ExecStop=podman-compose -f ${COMPOSE_FILE} down
TimeoutStartSec=900

[Install]
# WantedBy omitido: el servicio NO arranca automáticamente en el boot.
SYSTEMD_EOF
    log_ok "ai-stack.service creado"
  fi

  systemctl daemon-reload

  if systemctl is-enabled ai-stack.service >/dev/null 2>&1; then
    systemctl disable ai-stack.service 2>/dev/null || true
    log_warn "Inicio automático deshabilitado (arranque manual exclusivo)"
  fi
}

# ── Pull de imágenes ─────────────────────────────────────────────────────────
pull_images() {
  log_info "Descargando imágenes de contenedores (puede tardar varios minutos)..."
  local llama_image
  llama_image=$(grep -m1 'image:' "${COMPOSE_FILE}" | sed 's/^[[:space:]]*image:[[:space:]]*//')
  local images=("${llama_image}" "docker.io/searxng/searxng:latest" "ghcr.io/open-webui/open-webui:main")
  for img in "${images[@]}"; do
    [[ -z "$img" ]] && continue
    log_install "Pull: ${img}"
    podman pull "${img}" || log_warn "Pull fallido para ${img} (se reintentará al iniciar)"
  done
}

# ── Iniciar y verificar stack ───────────────────────────────────────────────
start_and_verify() {
  log_info "Iniciando stack con systemd..."
  systemctl start ai-stack.service || {
    log_error "El servicio ai-stack no pudo iniciarse. Revisa los logs: journalctl -u ai-stack -n 100"
    exit 1
  }

  log_info "Esperando a que los contenedores arranquen (máx. 5 minutos)..."
  local elapsed=0
  local max_wait=300
  local step=10
  while [[ $elapsed -lt $max_wait ]]; do
    sleep "${step}"
    elapsed=$((elapsed + step))
    if podman ps | grep -q "ai-stack-llama-cpp" && podman ps | grep -q "ai-stack-open-webui"; then
      log_ok "Contenedores en ejecución"
      break
    fi
    echo -n "."
  done
  echo ""

  if [[ $elapsed -ge $max_wait ]]; then
    log_warn "Tiempo de espera agotado. Revisa con: podman ps && journalctl -u ai-stack -n 100"
  fi

  # Verificar llama.cpp por el endpoint /v1/models (más confiable que /health)
  log_info "Verificando que llama.cpp expone el modelo..."
  if curl -fsS "http://localhost:${LLAMA_PORT}/v1/models" >/dev/null 2>&1; then
    log_ok "llama.cpp responde y expone /v1/models"
  else
    log_warn "llama.cpp aún no responde en /v1/models. Puede necesitar más tiempo para cargar el modelo."
  fi

  # Verificar Open WebUI
  log_info "Verificando Open WebUI..."
  if curl -fsS "http://localhost:${WEBUI_PORT}/health" >/dev/null 2>&1 || curl -fsS "http://localhost:${WEBUI_PORT}/api/v1/" >/dev/null 2>&1; then
    log_ok "Open WebUI responde en http://localhost:${WEBUI_PORT}"
  else
    log_warn "Open WebUI aún no responde. Puede necesitar más tiempo para arrancar."
  fi
}

# ==============================================================================
# EJECUCIÓN PRINCIPAL
# ==============================================================================
log_info "Detectando hardware..."
detect_gpu
calculate_gpu_layers

if confirm_step "Instalar dependencias y Podman"; then
  install_packages
  install_podman_compose
  upgrade_podman_for_cdi
  # Recalcular GPU layers tras posible upgrade de Podman
  calculate_gpu_layers
fi

if confirm_step "Instalar drivers NVIDIA y Container Toolkit"; then
  install_nvidia_drivers
  install_nvidia_container_toolkit
fi

if confirm_step "Crear directorios y configuración de SearXNG"; then
  create_directories
  configure_searxng
fi

if confirm_step "Generar podman-compose.yml"; then
  generate_compose
fi

if confirm_step "Verificar espacio en disco"; then
  check_disk_space
fi

if confirm_step "Descargar modelo GGUF (~${MODEL_SIZE_GB} GB)"; then
  download_model
fi

if confirm_step "Configurar firewall UFW"; then
  configure_ufw
fi

if confirm_step "Instalar y configurar OpenCode"; then
  install_opencode
fi

if confirm_step "Crear servicio systemd ai-stack.service"; then
  create_systemd_service
fi

if confirm_step "Pre-descargar imágenes de contenedores"; then
  pull_images
fi

if confirm_step "Iniciar el stack y verificar"; then
  start_and_verify
fi

# ==============================================================================
# INFORME FINAL
# ==============================================================================
local_ip=$(hostname -I | awk '{print $1}')

echo ""
echo -e "${GREEN}=============================================================================="
echo -e " AI STACK LOCAL DESPLEGADO"
echo -e "==============================================================================${NC}"
echo ""
echo -e "${CYAN}Configuración:${NC}"
echo -e " Usuario:        ${TARGET_USER}"
echo -e " Directorio:     ${INSTALL_DIR}"
echo -e " Modelo:         ${MODEL_NAME}"
echo -e " GPU:            $([[ ${HAS_NVIDIA_GPU} == 1 ]] && echo 'NVIDIA' || echo 'CPU')"
echo -e " GPU Layers:     ${GPU_LAYERS}"
echo -e " CPU Threads:    ${CPU_THREADS}"
echo -e " llama.cpp:      http://${local_ip}:${LLAMA_PORT}"
echo -e " Open WebUI:     http://${local_ip}:${WEBUI_PORT}"
echo -e " OpenCode:       opencode (comando de terminal)"
echo ""
echo -e "${CYAN}Comandos útiles:${NC}"
echo -e " Iniciar stack:     ${GREEN}sudo systemctl start ai-stack${NC}"
echo -e " Detener stack:     ${GREEN}sudo systemctl stop ai-stack${NC}"
echo -e " Ver logs:          ${GREEN}sudo journalctl -u ai-stack -f${NC}"
echo -e " Ver contenedores:  ${GREEN}sudo podman ps${NC}"
echo -e " Modelo expuesto:   ${GREEN}curl http://localhost:${LLAMA_PORT}/v1/models${NC}"
echo ""
echo -e "${YELLOW}El servicio NO inicia automáticamente al arrancar. Inícialo manualmente con:${NC}"
echo -e "${GREEN}  sudo systemctl start ai-stack${NC}"
echo ""
if [[ "${NEEDS_REBOOT}" == "1" ]]; then
  echo -e "${YELLOW}>> ATENCIÓN: Se instalaron drivers NVIDIA. Reinicia antes de usar el stack:${NC}"
  echo -e "${YELLOW}   sudo reboot${NC}"
  echo ""
fi
echo -e "${GREEN}==============================================================================${NC}"
