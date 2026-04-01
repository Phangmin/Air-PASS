type NoticeItem = {
  id: number
  title: string
  summary: string
  body: string
  date: string
}

type HomeNoticePostProps = {
  item: NoticeItem
  onClick: (id: number) => void
}

export type { NoticeItem }

export default function HomeNoticePost({ item, onClick }: HomeNoticePostProps) {
  return (
    <button
      type="button"
      onClick={() => onClick(item.id)}
      className="cursor-pointer rounded-2xl border border-gray-200 bg-gray-50 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-gray-900">{item.title}</h3>
        <span className="text-xs text-gray-500">{item.date}</span>
      </div>
      <p className="text-sm leading-6 text-gray-600">{item.summary}</p>
    </button>
  )
}
