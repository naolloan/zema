import axios from 'axios'
import { mobileConfig } from './config'

export const api = axios.create({
  baseURL: mobileConfig.apiBaseUrl,
  timeout: 15000,
})

export function setApiToken(token: string | null) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`
    return
  }

  delete api.defaults.headers.common.Authorization
}
