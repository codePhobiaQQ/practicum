import { createApi, fetchBaseQuery, FetchBaseQueryArgs } from '@reduxjs/toolkit/query/react'
import { USER_LOCALSTORAGE_KEY } from '@/lib/auth'

export let expressApi = createApi({
  reducerPath: 'expressApi',
  tagTypes: ['express'],

  baseQuery: fetchBaseQuery({
    baseUrl: 'http://localhost:5050/api/',
    prepareHeaders: (headers) => {
      headers.set('Content-Type', 'application/json')
      const token = localStorage.getItem(USER_LOCALSTORAGE_KEY)
      if (token) {
        headers.set('Authorization', `Bearer ${token}`)
      }
      return headers
    },
    responseHandler: async (response) => {
      const blob = await response.blob()
      if (!response.ok) {
        throw new Error('Error getting')
      }
      return blob
    },
  } as FetchBaseQueryArgs),
  endpoints: () => ({}),
})
