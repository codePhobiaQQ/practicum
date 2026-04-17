import cn from 'classnames'
import cls from './ScreenTitle.module.scss'
import { ReactNode } from 'react'

type Props = {
  children?: ReactNode
  className?: string
}

export const ScreenTitle = (props: Props) => {
  return (
    <h2 className={cn('text-4xl uppercase m-sb-i pb-1', cls['Title'], props.className)}>
      {props.children}
    </h2>
  )
}
