import { Button, Typography } from 'antd'
import { FileOutlined, LinkOutlined, PlayCircleOutlined, QuestionCircleOutlined } from '@ant-design/icons'
import type { MaterialRow } from '@shared/types/wordpress-course'

const { Paragraph, Title } = Typography

function resolveFileUrl(m: MaterialRow): string | undefined {
  const f = m.file
  if (typeof f === 'string') {
    return f
  }
  if (f && typeof f === 'object' && 'url' in f && typeof f.url === 'string') {
    return f.url
  }
  return undefined
}

function isYoutube(url: string): boolean {
  return /youtube\.com|youtu\.be/.test(url)
}

function toYoutubeEmbed(url: string): string {
  try {
    const u = new URL(url)
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.replace(/^\//, '')
      return id ? `https://www.youtube.com/embed/${id}` : url
    }
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v')
      if (v) {
        return `https://www.youtube.com/embed/${v}`
      }
      const parts = u.pathname.split('/')
      const embedIdx = parts.indexOf('embed')
      if (embedIdx !== -1 && parts[embedIdx + 1]) {
        return `https://www.youtube.com/embed/${parts[embedIdx + 1]}`
      }
    }
  } catch {
    return url
  }
  return url
}

export function MaterialBlock({ block, index }: { block: MaterialRow; index: number }) {
  const { block_type: type } = block

  if (type === 'text' && block.text_content) {
    return (
      <div
        className="max-w-none text-sm leading-relaxed text-light-text [&_a]:text-accent1 [&_p]:mb-3"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: block.text_content }}
      />
    )
  }

  if (type === 'video' && block.video_url) {
    const url = block.video_url
    return (
      <div className="space-y-2">
        <Title level={5} className="!mb-0 flex items-center gap-2 !text-base">
          <PlayCircleOutlined className="text-accent1" />
          Видео {index + 1}
        </Title>
        {isYoutube(url) ? (
          <div className="aspect-video w-full overflow-hidden rounded-lg bg-light-border">
            <iframe
              title="video"
              src={toYoutubeEmbed(url)}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <Button type="primary" href={url} target="_blank" rel="noreferrer" icon={<LinkOutlined />}>
            Открыть видео
          </Button>
        )}
      </div>
    )
  }

  if (type === 'file') {
    const href = resolveFileUrl(block)
    if (!href) {
      return <Paragraph type="secondary">Файл не указан</Paragraph>
    }
    return (
      <div className="flex items-center gap-3 rounded-lg border border-light-border bg-light-card px-4 py-3">
        <FileOutlined className="text-xl text-accent1" />
        <Button type="link" href={href} target="_blank" rel="noreferrer" className="!p-0">
          Скачать материал
        </Button>
      </div>
    )
  }

  if (type === 'quiz_ref' && block.quiz_ref) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed border-light-border px-4 py-3">
        <QuestionCircleOutlined className="text-accent1" />
        <span className="text-sm text-light-text-secondary">Квиз (ID): {block.quiz_ref}</span>
      </div>
    )
  }

  return <Paragraph type="secondary">Пустой блок</Paragraph>
}
