import axios from 'axios'
import { USER_LOCALSTORAGE_KEY } from '@shared/config/storage'

export const expressAxios = axios.create({
  baseURL: 'http://localhost:5050/api/',
  headers: { 'Content-Type': 'application/json' },
  responseType: 'json',
})

expressAxios.interceptors.request.use((config) => {
  const token = localStorage.getItem(USER_LOCALSTORAGE_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
