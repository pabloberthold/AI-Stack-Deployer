# AI Stack Deployer — 100% Podman

> Orquestador de entorno de IA local para Linux.  
> Despliega **llama.cpp + Open WebUI + SearXNG + OpenCode** usando Podman (sin Docker, sin daemon, sin root permanente).

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![Podman](https://img.shields.io/badge/Engine-Podman-892CA0)](https://podman.io)
[![CUDA](https://img.shields.io/badge/GPU-NVIDIA_CUDA-76B900)](https://developer.nvidia.com/cuda)
[![Ubuntu](https://img.shields.io/badge/Ubuntu-22.04%2B%2F24.04-E95420)](https://ubuntu.com)
[![Fedora](https://img.shields.io/badge/Fedora-39%2B-294172)](https://fedoraproject.org)

---

## 🌐 Uso de la Herramienta Web

Abre [`index.html`](./index.html) en tu navegador (o visita la GitHub Page de este repo) para configurar y generar el script de instalación de forma visual:

1. Selecciona tu distro: **Ubuntu** o **Fedora**
2. Configura tu hardware (CPU threads, RAM, VRAM GPU)
3. Elige el modelo GGUF del catálogo (70+ modelos) o ingresa uno personalizado
4. Define los puertos y subredes permitidas
5. Haz clic en **Generar Script** → descarga `setup_ai_stack.sh`
6. Ejecuta en tu servidor: `sudo bash setup_ai_stack.sh`

---

## 📦 Stack de Aplicaciones

| Aplicación | Función | Repo |
|---|---|---|
| **llama.cpp** | Motor de inferencia LLM en C++. API OpenAI-compatible, CUDA, formato GGUF | [ggml-org/llama.cpp](https://github.com/ggml-org/llama.cpp) |
| **Open WebUI** | Interfaz web tipo ChatGPT con RAG, historial y búsqueda web | [open-webui/open-webui](https://github.com/open-webui/open-webui) |
| **SearXNG** | Metabuscador privado auto-hospedado, integración JSON con Open WebUI | [searxng/searxng](https://github.com/searxng/searxng) |
| **OpenCode** | Agente de codificación IA open source (alternativa a Claude Code) | [anomalyco/opencode](https://github.com/anomalyco/opencode) |
| **Podman** | Motor de contenedores daemonless, rootless, 100% OCI-compatible | [containers/podman](https://github.com/containers/podman) |
| **firewalld** | Firewall dinámico con zonas y rich-rules *(Fedora)* | [firewalld.org](https://firewalld.org) |
| **UFW** | Uncomplicated Firewall, reglas por subred *(Ubuntu)* | [UFW docs](https://help.ubuntu.com/community/UFW) |

---

## 🏗️ Arquitectura

```
Subredes permitidas (192.168.x.0/24)
        │
        ▼
┌─────────────────┐
│  Firewall Host  │  UFW (Ubuntu) · firewalld rich-rules (Fedora)
└────────┬────────┘
         │
         ▼
┌──────────────────────────────────────────────┐
│         Red Podman Aislada (ai-net)          │
│                                              │
│  ┌────────────────┐    ┌──────────────────┐  │
│  │  llama-cpp     │    │   open-webui     │  │
│  │  :3000 (host)  │◄───│   :8080 (host)   │  │
│  │  CUDA / GGUF   │    │  RAG + WebSearch  │  │
│  └────────────────┘    └────────┬─────────┘  │
│         │ CDI GPU               │             │
│         ▼                       ▼             │
│  ┌─────────────┐      ┌──────────────────┐   │
│  │  NVIDIA GPU │      │    searxng       │   │
│  │  (host)     │      │  :8080 (interno) │   │
│  └─────────────┘      └──────────────────┘   │
└──────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────┐
│  OpenCode (host)     │  Apunta a http://localhost:3000/v1
│  CLI + Desktop GUI   │  Configurado en ~/.config/opencode/
└──────────────────────┘
```

---

## ⚡ Requisitos

| Componente | Mínimo | Recomendado |
|---|---|---|
| OS | Ubuntu 22.04 / Fedora 39 | Ubuntu 24.04 / Fedora 41+ |
| CPU | 4 cores | 8+ cores |
| RAM | 8 GB | 16 GB+ |
| GPU VRAM | 6 GB (modelos 7B Q4) | 12 GB+ (modelos 14B Q4/Q5) |
| Almacenamiento | 20 GB libres | 50 GB+ |
| Podman | 4.4+ | 5.x |
| NVIDIA Driver | 525+ | último estable |

---

## 🚀 Instalación Rápida

### 1. Generar el script

Visita la [GitHub Page](https://TU_USUARIO.github.io/ai-stack-deployer/) o abre `index.html` localmente, configura y descarga `setup_ai_stack.sh`.

### 2. Ejecutar en tu servidor

```bash
chmod +x setup_ai_stack.sh
sudo bash setup_ai_stack.sh
```

El script ofrece **modo automático** (desatendido) e **interactivo** (confirmación paso a paso).

### 3. Iniciar el stack

```bash
# Iniciar (manual, no arranca solo en el boot)
sudo systemctl start ai-stack

# Verificar contenedores
podman ps

# Abrir en el navegador
http://IP_DEL_SERVIDOR:8080
```

### 4. Usar OpenCode

```bash
# En cualquier directorio de proyecto
opencode

# OpenCode ya está configurado apuntando a tu llama.cpp local
# Asegúrate de que el stack esté corriendo primero
```

---

## 📋 Pasos del Script Generado

| # | Paso | Descripción |
|---|---|---|
| 1 | **Dependencias** | Podman, podman-compose, pipx, slirp4netns, drivers NVIDIA |
| 2 | **Directorios** | Crea `$INSTALL_DIR/{models,searxng}` |
| 3 | **SearXNG** | Genera `settings.yml` con salida JSON habilitada |
| 4 | **Compose** | Genera `podman-compose.yml` (sin `version:` obsoleto) con CDI para GPU |
| 5 | **Modelo GGUF** | Descarga desde HuggingFace con reanudación automática (`curl -C -`) |
| 6 | **Firewall** | UFW (Ubuntu) o firewalld rich-rules (Fedora) por subred |
| 7 | **OpenCode** | Instala vía `opencode.ai/install` y genera config apuntando al stack |
| 8 | **Systemd** | Crea `ai-stack.service` sin habilitarlo en el arranque |
| 9 | **Pull imágenes** | Pre-descarga imágenes Podman para acelerar el primer inicio |

---

## 🔧 Comandos Útiles

```bash
# ── Stack ─────────────────────────────────────────────────────────────────
sudo systemctl start   ai-stack    # Iniciar
sudo systemctl stop    ai-stack    # Detener
sudo systemctl restart ai-stack    # Reiniciar

# ── Podman ────────────────────────────────────────────────────────────────
podman ps                           # Ver contenedores corriendo
podman logs ai-stack-llama-cpp      # Logs de llama.cpp
podman logs ai-stack-open-webui     # Logs de Open WebUI

# ── Actualizar imágenes ───────────────────────────────────────────────────
cd ~/ai-stack
podman compose pull
sudo systemctl restart ai-stack

# ── Firewall (Ubuntu) ─────────────────────────────────────────────────────
sudo ufw status numbered

# ── Firewall (Fedora) ─────────────────────────────────────────────────────
sudo firewall-cmd --list-all

# ── OpenCode ──────────────────────────────────────────────────────────────
opencode                            # Iniciar agente en el directorio actual
cat ~/.config/opencode/opencode.json  # Ver configuración del proveedor local
```

---

## 🔐 Seguridad

- **Podman rootless**: los contenedores corren sin privilegios root en tiempo de ejecución
- **CDI (Container Device Interface)**: acceso a GPU sin `--privileged`
- **Firewall por subred**: solo las IPs configuradas acceden a los puertos del stack
- **Sin arranque automático**: el stack no expone puertos en el boot; inicio siempre explícito
- **Sin API key real**: llama.cpp local no requiere autenticación (red privada)

---

## 🗂️ Estructura de Archivos Generados

```
$INSTALL_DIR/           (default: ~/ai-stack)
├── podman-compose.yml  # Definición de servicios Podman
├── models/
│   └── modelo.gguf     # Modelo descargado desde HuggingFace
└── searxng/
    └── settings.yml    # Configuración SearXNG con JSON habilitado

~/.config/opencode/
├── opencode.json       # Provider llama.cpp local
└── auth.json           # Placeholder de API key para el provider local

/etc/systemd/system/
└── ai-stack.service    # Servicio (inicio manual)

/etc/cdi/
└── nvidia.yaml         # CDI spec generado por nvidia-ctk
```

---

## 🧩 Modelos GGUF Soportados

El catálogo incluye 60+ modelos preconfigurados con sus repos HuggingFace correctos:

- **Qwen 2.5** (Coder, Instruct, Math) — 0.5B a 72B
- **DeepSeek R1** (Distill Qwen/Llama) — 1.5B a 70B
- **Gemma 2** (Google) — 2B a 27B + CodeGemma
- **Llama 3.x** (Meta) — 1B a 70B
- **Mistral / Mixtral** — 7B / 8x7B
- **Phi-3.5** (Microsoft) — 3.8B / 14B
- **Hermes, Granite, SmolLM2, Falcon3, TinyLlama** y más

También puedes ingresar cualquier modelo GGUF personalizado desde HuggingFace con verificación en tiempo real.

---

## 📄 Licencia

MIT © 2025 — Hecho con precisión para DevOps Linux

---

## 🙏 Créditos

- [ggml-org/llama.cpp](https://github.com/ggml-org/llama.cpp) — Georgi Gerganov y comunidad
- [open-webui/open-webui](https://github.com/open-webui/open-webui) — Timothy J. Baek y comunidad
- [searxng/searxng](https://github.com/searxng/searxng) — Comunidad SearXNG
- [anomalyco/opencode](https://github.com/anomalyco/opencode) — Adam Elmore y comunidad
- [containers/podman](https://github.com/containers/podman) — Red Hat y comunidad OCI