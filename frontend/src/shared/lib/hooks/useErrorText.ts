import { notification } from 'antd'

export const useErrorText = (e: any) => {
  if (e?.response?.data?.message) {
    const message = e?.response?.data?.message
    notification.error({ message })
    return message
  } else if (e?.message) {
    console.log(e)
    const message = e?.message
    notification.error({ message })
    return message
  }

  notification.error({ message: 'Неизвестная ошибка' })
  return 'Неизвестная ошибка'
}
