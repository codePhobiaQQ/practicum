import { Button, Card, Form, Input, Typography, notification } from 'antd'
import { useEffect, useState } from 'react'
import { getWordPressAuthErrorMessage } from '@lib/auth'
import { getProfileMetadata, updateProfileMetadata, type ProfileMetadata } from '../model/api'
import { OlympAppLayout } from '@/app/layouts'

const { Title, Text } = Typography

type FormValues = {
  user_name: string
  group_number: string
}

export function ProfilePage() {
  const [form] = Form.useForm<FormValues>()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<ProfileMetadata | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getProfileMetadata()
      .then((data) => {
        if (cancelled) return
        setProfile(data)
        form.setFieldsValue({
          user_name: data.user_name,
          group_number: data.group_number,
        })
      })
      .catch((e) => {
        notification.error({ message: getWordPressAuthErrorMessage(e) })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [form])

  const onSubmit = async (values: FormValues) => {
    setSaving(true)
    try {
      const data = await updateProfileMetadata({
        user_name: values.user_name.trim(),
        group_number: values.group_number.trim(),
      })
      setProfile(data)
      notification.success({ message: 'Профиль обновлен' })
    } catch (e) {
      notification.error({ message: getWordPressAuthErrorMessage(e) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <OlympAppLayout activeNav="profile">
      <div className="max-w-[780px]">
        <Card loading={loading} className="rounded-2xl">
          <div className="mb-6 space-y-1">
            <Text className="block text-[#0d062b]/65">Логин</Text>
            <Text strong>{profile?.username ?? '-'}</Text>
          </div>

          <Form<FormValues> form={form} layout="vertical" onFinish={onSubmit} requiredMark={false}>
            <Form.Item
              name="user_name"
              label="Имя пользователя"
              rules={[{ required: true, message: 'Введите имя пользователя' }]}
            >
              <Input size="large" placeholder="Иван Иванов" />
            </Form.Item>
            <Form.Item
              name="group_number"
              label="Номер группы"
              rules={[{ required: true, message: 'Введите номер группы' }]}
            >
              <Input size="large" placeholder="ПК-101" />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={saving} className="!mt-2">
              Сохранить
            </Button>
          </Form>
        </Card>
      </div>
    </OlympAppLayout>
  )
}
