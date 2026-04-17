import { createApi, fetchBaseQuery, FetchBaseQueryArgs } from '@reduxjs/toolkit/query/react'
import { USER_LOCALSTORAGE_KEY } from '@/lib/auth'

export let wordpressApi = createApi({
  reducerPath: 'wordpressApi',
  tagTypes: ['wordpress'],
  baseQuery: fetchBaseQuery({
    baseUrl: 'http://localhost:9091/wp-json',
    prepareHeaders: (headers) => {
      const token = localStorage.getItem(USER_LOCALSTORAGE_KEY)
      if (token) {
        headers.set('Authorization', `Bearer ${token}`)
      }
      return headers
    },
  } as FetchBaseQueryArgs),
  endpoints: () => ({}),
})
