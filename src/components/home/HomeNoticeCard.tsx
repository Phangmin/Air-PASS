import { useState } from 'react'
import HomeNoticePost, { type NoticeItem } from './HomeNoticePost'
import NoticeModal from '../modals/NoticeModal'

const noticeItems: NoticeItem[] = [
  {
    id: 1,
    title: 'Air-PASS에 오신 것을 환영합니다',
    summary:
      'Air-PASS는 Airport Penalty & Administrative Sanction System의 약자로, 공항 행정처분 업무를 더 빠르고 체계적으로 처리하기 위한 통합 지원 시스템입니다.',
    body:
      'Air-PASS는 Airport Penalty & Administrative Sanction System의 약자로, 공항 내 위반 사항에 대한 과태료 및 행정처분 업무를 보다 정확하고 일관되게 처리하기 위해 구축된 시스템입니다.\n\n우리 시스템에서는 통지서 생성, 납부 상태 리포트 확인, 대상자별 관리, 기업별 납부 관리, 생성 이력 조회까지 하나의 흐름으로 연결해 실무 담당자가 필요한 업무를 한 곳에서 처리할 수 있습니다.\n\n앞으로도 Air-PASS는 공항 행정처분 업무의 효율성과 추적 가능성을 높이는 운영 플랫폼으로 활용될 예정입니다.',
    date: '2026-03-16',
  },
]

export default function HomeNoticeCard() {
  const [selectedNoticeId, setSelectedNoticeId] = useState<number | null>(null)
  const selectedNotice = noticeItems.find((item) => item.id === selectedNoticeId) ?? null

  return (
    <>
      <article className="rounded-3xl border border-gray-200 bg-white p-5 shadow-[0_-10px_30px_rgba(15,23,42,0.08)]">
        <div className="mb-4 text-sm font-semibold text-[#003764]">공지사항</div>
        <div className="flex flex-col gap-3">
          {noticeItems.map((item) => (
            <HomeNoticePost
              key={item.id}
              item={item}
              onClick={setSelectedNoticeId}
            />
          ))}
        </div>
      </article>

      <NoticeModal
        open={selectedNotice !== null}
        title={selectedNotice?.title ?? ''}
        body={selectedNotice?.body ?? ''}
        date={selectedNotice?.date ?? ''}
        onClose={() => setSelectedNoticeId(null)}
      />
    </>
  )
}
