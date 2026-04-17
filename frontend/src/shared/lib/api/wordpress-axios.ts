import axios from 'axios'
import { USER_LOCALSTORAGE_KEY } from '@shared/config/storage'

export const wordpressAxios = axios.create({
  baseURL: 'http://localhost:9091/wp-json',
  headers: { 'Content-Type': 'application/json' },
})

wordpressAxios.interceptors.request.use((config) => {
  const token = localStorage.getItem(USER_LOCALSTORAGE_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
