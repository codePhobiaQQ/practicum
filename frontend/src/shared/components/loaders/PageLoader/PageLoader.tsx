import cls from './PageLoader.module.scss'
import cn from 'classnames'

interface PageLoaderProps {}

export const PageLoader = (props: PageLoaderProps) => {
  const {} = props

  return (
    <div className="w-full h-screen flex items-center justify-center">
      <div className={cn(cls['scene'])}>
        <div className={cn(cls['cube-wrapper'])}>
          <div className={cn(cls['cube'])}>
            <div className={cn(cls['cube-faces'])}>
              <div className={cn(cls['cube-face'], cls['shadow'])}></div>
              <div className={cn(cls['cube-face'], cls['bottom'])}></div>
              <div className={cn(cls['cube-face'], cls['top'])}></div>
              <div className={cn(cls['cube-face'], cls['left'])}></div>
              <div className={cn(cls['cube-face'], cls['right'])}></div>
              <div className={cn(cls['cube-face'], cls['back'])}></div>
              <div className={cn(cls['cube-face'], cls['front'])}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
