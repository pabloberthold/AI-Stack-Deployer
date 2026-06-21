# AI Stack Local — Ubuntu + Podman

**Un deployer automatizado para montar un stack de IA local completo en Ubuntu 22.04/24.04 LTS con un solo comando.**

## Stack

```
┌─────────────────────────────────────────────┐
│                  Open WebUI                  │
│           (Interfaz web estilo ChatGPT)       │
├─────────────────────┬───────────────────────┤
│    llama.cpp        │       SearXNG          │
│  (motor de            │  (búsqueda web        │
│   inferencia local)   │   para RAG)           │
├─────────┬───────────┴──────┬────────────────┤
│ OpenCode │  Modelo GGUF    │  NVIDIA GPU    │
│ (CLI IA) │  (Qwen Coder     │  via CDI o CPU  │
│          │   14B Q4_K_M)    │                 │
└──────────┴─────────────────┴─────────────────┘
```

### Componentes

| Componente | Puerto | Descripción |
|---|---|---|
| [llama.cpp](https://github.com/ggerganov/llama.cpp) | `3000` | Servidor OpenAI-compatible para inferencia local |
| [Open WebUI](https://github.com/open-webui/open-webui) | `8080` | Interfaz web tipo ChatGPT con RAG |
| [SearXNG](https://github.com/searxng/searxng) | — | Metabuscador privado para RAG web |
| [OpenCode](https://opencode.ai) | CLI | Asistente IA para terminal |

## Requisitos

- **Ubuntu 22.04 o 24.04 LTS** (limpieza o servidor)
- **4 GB+ RAM** (16 GB+ recomendado)
- **15 GB+ espacio libre en disco**
- **GPU NVIDIA** (opcional, con 10 GB+ VRAM para offload completo)
- Conexión a internet

## Uso

```bash
# 1. Descargar el script
wget https://raw.githubusercontent.com/tu-usuario/ai-stack-local/main/ai-stack-deployer.sh

# 2. Ejecutar (modo automático)
sudo bash ai-stack-deployer.sh

# 3. O en modo interactivo (paso a paso)
sudo bash ai-stack-deployer.sh
# Elegir opción 2 al inicio
```

### Post-instalación

```bash
# Iniciar el stack
sudo systemctl start ai-stack

# Verificar que responde
curl http://localhost:3000/v1/models

# Abrir Open WebUI en el navegador
# http://<IP_DEL_SERVIDOR>:8080
```

## Arquitectura

### Modos de ejecución

- **Automático (opción 1):** Ejecuta todos los pasos sin preguntar
- **Interactivo (opción 2):** Pide confirmación antes de cada fase

### Soporte GPU

1. Detecta GPU NVIDIA via `lspci` + `nvidia-smi`
2. Si VRAM ≥ 10 GB → offload completo (`--n-gpu-layers -1`) con CDI
3. Si VRAM < 10 GB → modo CPU (evita fallos por falta de VRAM)
4. En Ubuntu 22.04 actualiza Podman al repo Kubic si es necesario

### Servicio systemd

- **Tipo:** `oneshot` con `RemainAfterExit=yes`
- **Arranque:** Manual (`sudo systemctl start ai-stack`)
- **No** se habilita en el boot (por diseño)
- Timeout de 15 minutos para carga del modelo

## Variables de entorno

Las principales variables se definen al inicio del script:

| Variable | Default | Descripción |
|---|---|---|
| `LLAMA_PORT` | `3000` | Puerto para la API de llama.cpp |
| `WEBUI_PORT` | `8080` | Puerto para Open WebUI |
| `MODEL_NAME` | `qwen2.5-coder-14b-instruct-q4_k_m.gguf` | Modelo GGUF a descargar |
| `CPU_THREADS` | `nproc - 1` | Threads para inferencia (deja 1 para el SO) |

## Comandos útiles

```bash
# Gestión del stack
sudo systemctl start ai-stack      # Iniciar
sudo systemctl stop ai-stack       # Detener
sudo systemctl status ai-stack     # Estado
sudo journalctl -u ai-stack -f     # Logs en tiempo real

# Contenedores
sudo podman ps                     # Listar contenedores activos
sudo podman-compose -f ~/ai-stack/podman-compose.yml logs -f  # Logs de todos los servicios

# API
curl http://localhost:3000/v1/models                         # Listar modelos
curl http://localhost:3000/v1/chat/completions \              # Chat
  -d '{"model":"llm-model","messages":[{"role":"user","content":"Hola"}]}'

# OpenCode (terminal)
opencode                         # Iniciar sesión IA
```

## Personalización

### Cambiar el modelo

1. Descarga otro GGUF en `~/ai-stack/models/`
2. Edita `~/ai-stack/podman-compose.yml` y cambia el nombre del modelo en la sección `llama-cpp` → `command`
3. Reinicia: `sudo systemctl restart ai-stack`

### Habilitar autenticación en Open WebUI

```bash
# Editar el compose y cambiar:
#   WEBUI_AUTH=False → WEBUI_AUTH=True
sudo systemctl restart ai-stack
# Acceder a http://IP:8080/auth/signup para crear el primer usuario
```

### Arranque automático (no recomendado)

```bash
sudo systemctl enable ai-stack
```

## Solución de problemas

### Error: "No se pudo instalar podman-compose"

```bash
# Instalar manualmente
pipx install podman-compose
ln -sf ~/.local/bin/podman-compose /usr/local/bin/podman-compose
```

### GPU no detectada

```bash
# Verificar drivers
nvidia-smi
# Si no está instalado:
sudo ubuntu-drivers autoinstall && sudo reboot
```

### Contenedor llama.cpp no arranca

```bash
sudo podman-compose -f ~/ai-stack/podman-compose.yml logs llama-cpp
# Verificar que el modelo GGUF existe:
ls -lh ~/ai-stack/models/
```

## Notas

- El script ejecuta Podman en modo **rootful** (más estable en Ubuntu)
- Los contenedores NO se inician automáticamente al encender el equipo
- El primer arranque descarga las imágenes Docker/Podman (~2-3 GB)
- La primera carga del modelo en CPU puede tomar varios minutos
- El `secret_key` de SearXNG debe cambiarse en producción
