import { ref } from 'vue'

export function useToast() {
  const message = ref('')
  let timeoutId = null

  function show(msg, duration = 4000) {
    if (timeoutId) clearTimeout(timeoutId)
    message.value = msg
    timeoutId = setTimeout(() => {
      message.value = ''
      timeoutId = null
    }, duration)
  }

  return { message, show }
}
