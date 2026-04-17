import { Typography } from 'antd'
import { Link } from 'react-router-dom'

const { Title, Paragraph } = Typography

export function PersonalAccountHome() {
  return (
    <div className="p-8">
      <Title level={2} className="!mb-4">
        Главная
      </Title>
      <Paragraph className="text-light-text-secondary">Выберите раздел в меню слева.</Paragraph>
      <Link to="/courses" className="text-accent1">
        К курсам
      </Link>
    </div>
  )
}
