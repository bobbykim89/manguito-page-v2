import { type ColorPalette } from '@bobbykim/manguito-theme'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAlertStore = defineStore('alert', () => {
  // ALERT: states
  const alertMessage = ref<string | null>(null)
  const alertColor = ref<Partial<ColorPalette>>('danger')
  // ALERT: actions
  const clearAlert = (timeout: number = 5000) => {
    setTimeout(() => {
      alertMessage.value = null
      alertColor.value = 'danger'
    }, timeout)
  }
  const setAlert = (
    message: string,
    color: Partial<ColorPalette> = 'danger'
  ) => {
    alertMessage.value = message
    alertColor.value = color
    clearAlert()
  }
  return { alertMessage, alertColor, clearAlert, setAlert }
})
