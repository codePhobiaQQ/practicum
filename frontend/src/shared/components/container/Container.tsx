import { FC, ReactNode } from 'react'

type ContainerProps = {
  children?: ReactNode
  className?: string
}

export const Container: FC<ContainerProps> = ({ children, className }) => {
  return (
    <div className={className} style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px' }}>
      {children}
    </div>
  )
}
