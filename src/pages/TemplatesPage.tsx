import { useEffect, useState } from 'react'
import Handlebars from 'handlebars'
import noticeTemplateHtml from '../templates/notice.hbs.html?raw'
import noticeFinalTemplateHtml from '../templates/notice-final.hbs.html?raw'
import noticeSuspensionTemplateHtml from '../templates/notice-suspension.hbs.html?raw'
import type { UserProfile } from '../types/ipc'

type TemplateTab = 'fine' | 'final' | 'suspension'

const DEFAULT_TEMPLATE_DATA = {
  docNo: '부산-예시-0001',
  affiliation: '(소속명)',
  driverName: '(운전자명)',
  partyAddress: '(운전자 소재지 주소)',
  partyEmail: '(운전자 이메일)',
  phone: '051-000-0000',
  factStatement:
    '(소속명) 소속 (운전자명)님은 (통행 시간) 김해공항 이동지역(통행 장소)에서 (차종)(이동지역 등록번호)을/를 운행하는 과정 중 지상안전관리기준(제한속도 준수)을 위반함(속도 (속도)).',
  receiverLine: '운전자명 귀하',
  suspensionDays: 2,
  submission: {
    organizationName: '부산지방항공청',
    officerName: '담당자 이름',
    department: '공항안전과',
    phone: '051-974-2169',
    fax: '051-974-2188',
    address: '부산광역시 강서구 공항로 124',
    email: 'bhpark12@korea.kr',
  },
  meta: {
    issuedDate: '2026.03.11',
    submissionDeadlineText: '생성일 기준 익월 말일 까지',
  },
}

function buildTemplatePreviewData(profile: UserProfile | null) {
  const addressParts = [profile?.zipCode && `(${profile.zipCode})`, profile?.baseAddress, profile?.detailAddress]
    .filter((value) => value && value.trim().length > 0)
    .join(' ')
    .trim()

  return {
    ...DEFAULT_TEMPLATE_DATA,
    submission: {
      ...DEFAULT_TEMPLATE_DATA.submission,
      officerName: profile?.name?.trim() || DEFAULT_TEMPLATE_DATA.submission.officerName,
      department: profile?.department?.trim() || DEFAULT_TEMPLATE_DATA.submission.department,
      phone: profile?.phone?.trim() || DEFAULT_TEMPLATE_DATA.submission.phone,
      fax: profile?.fax?.trim() || DEFAULT_TEMPLATE_DATA.submission.fax,
      email: profile?.email?.trim() || DEFAULT_TEMPLATE_DATA.submission.email,
      address: addressParts || DEFAULT_TEMPLATE_DATA.submission.address,
    },
  }
}

export default function TemplatesPage() {
  const [activeTab, setActiveTab] = useState<TemplateTab>('fine')
  const [previewHtml, setPreviewHtml] = useState<Record<TemplateTab, string | null>>({
    fine: null,
    final: null,
    suspension: null,
  })

  useEffect(() => {
    const compileFine = Handlebars.compile(noticeTemplateHtml)
    const compileFinal = Handlebars.compile(noticeFinalTemplateHtml)
    const compileSuspension = Handlebars.compile(noticeSuspensionTemplateHtml)
    const renderPreview = async () => {
      try {
        const profile = await window.electronAPI.userInfo.get()
        const templateData = buildTemplatePreviewData(profile)
        setPreviewHtml({
          fine: compileFine(templateData),
          final: compileFinal(templateData),
          suspension: compileSuspension({
            ...templateData,
            receiverLine: `${DEFAULT_TEMPLATE_DATA.driverName} 귀하(${DEFAULT_TEMPLATE_DATA.affiliation})`,
          }),
        })
      } catch (error) {
        console.error('템플릿 미리보기 렌더링 실패', error)
        const templateData = buildTemplatePreviewData(null)
        setPreviewHtml({
          fine: compileFine(templateData),
          final: compileFinal(templateData),
          suspension: compileSuspension({
            ...templateData,
            receiverLine: `${DEFAULT_TEMPLATE_DATA.driverName} 귀하(${DEFAULT_TEMPLATE_DATA.affiliation})`,
          }),
        })
      }
    }
    renderPreview()
  }, [])

  const templateMeta: Record<TemplateTab, { title: string; path: string; fallback: string }> = {
    fine: {
      title: '과태료 사전통지서',
      path: 'src/templates/notice.hbs.html',
      fallback: noticeTemplateHtml,
    },
    final: {
      title: '확정통지서',
      path: 'src/templates/notice-final.hbs.html',
      fallback: noticeFinalTemplateHtml,
    },
    suspension: {
      title: '운전업무정지 사전통지서',
      path: 'src/templates/notice-suspension.hbs.html',
      fallback: noticeSuspensionTemplateHtml,
    },
  }

  const currentTemplate = templateMeta[activeTab]

  return (
    <section className="flex h-full flex-col gap-4">
      <h2 className="flex border-l-4 border-[#003764] pl-4 text-2xl font-bold">템플릿 미리보기</h2>
      <div className="border border-gray-200" />

      <div className="flex flex-col h-full gap-3 rounded-3xl border border-gray-200 bg-white p-6 shadow-lg">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={`rounded-full px-4 py-2 text-sm font-semibold transition cursor-pointer ${
              activeTab === 'fine'
                ? 'bg-[#003764] text-white'
                : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
            }`}
            onClick={() => setActiveTab('fine')}
          >
            사전통지서 양식
          </button>
          <button
            type="button"
            className={`rounded-full px-4 py-2 text-sm font-semibold transition cursor-pointer ${
              activeTab === 'suspension'
                ? 'bg-[#003764] text-white'
                : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
            }`}
            onClick={() => setActiveTab('suspension')}
          >
            운전업무정지 양식
          </button>
        </div>
        {/* <p className="text-sm text-gray-600">
          아래 미리보기는 <code>{currentTemplate.path}</code> 템플릿에 현재 저장된 담당자 정보를 반영한 화면입니다.
        </p> */}
        <div className="bg-gray-500 h-full w-auto overflow-hidden rounded-2xl border border-gray-200 shadow-inner">
          <iframe
            title={`${currentTemplate.title} 미리보기`}
            srcDoc={previewHtml[activeTab] ?? currentTemplate.fallback}
            className="h-full w-full bg-white p-8"
          />
        </div>
      </div>
    </section>
  )
}
