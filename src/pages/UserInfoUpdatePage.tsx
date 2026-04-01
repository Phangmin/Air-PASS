import { Fragment, useCallback, useEffect, useState } from 'react'
import { Listbox, Transition } from '@headlessui/react'
import { ChevronUpDownIcon, CheckIcon } from '@heroicons/react/20/solid'
import type { User } from '../types/ipc'

const DEPARTMENTS = [
  '운영지원팀',
  '보안팀',
  '항공안전과',
  '항공운항과',
  '항공검사과',
  '공항시설과',
  '공항안전과',
  '항공관제팀',
  '정보통신팀',
  '항공교통안전관리팀',
  '항공정보통신실',
  '접근관제소',
  '계류장관제소',
  '실무교육훈련팀',
  '여수출장소',
  '울산출장소',
  '대구출장소',
  '무안출장소',
  '포항경주출장소',
  '광주출장소',
  '사천출장소',
  '울진출장소',
]

const KOREA_AREA_CODES = [
  '02',
  '031',
  '032',
  '033',
  '041',
  '042',
  '043',
  '044',
  '051',
  '052',
  '053',
  '054',
  '055',
  '061',
  '062',
  '063',
  '064',
]

declare global {
  interface Window {
    daum?: {
      Postcode: new (options: { oncomplete: (data: { zonecode: string; roadAddress: string; jibunAddress: string }) => void }) => {
        open: () => void
      }
    }
  }
}

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

function DepartmentSelect({
  value,
  onChange,
}: {
  value: string
  onChange: (dept: string) => void
}) {
  return (
    <Listbox value={value} onChange={onChange}>
      <div className="relative w-full">
        <Listbox.Button className="flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-4 py-3 pr-10 text-left">
          <span className="truncate text-gray-900">
            {value || '부서를 선택하세요'}
          </span>
          <ChevronUpDownIcon className="ml-2 h-5 w-5 text-gray-500" aria-hidden="true" />
        </Listbox.Button>

        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Listbox.Options className="absolute z-10 mt-2 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 text-sm shadow-xl ring-1 ring-black/5 focus:outline-none">
            {DEPARTMENTS.map((dept) => (
              <Listbox.Option
                key={dept}
                value={dept}
                className={({ active }) =>
                  classNames(
                    active ? 'bg-[#003764] text-white' : 'text-gray-900',
                    'relative cursor-pointer select-none py-2 pl-3 pr-9',
                  )
                }
              >
                {({ selected }) => (
                  <>
                    <span className={classNames(selected ? 'font-semibold' : 'font-normal', 'block truncate')}>
                      {dept}
                    </span>
                    {selected ? (
                      <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-white">
                        <CheckIcon className="h-5 w-5" aria-hidden="true" />
                      </span>
                    ) : null}
                  </>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  )
}

type UserInfoUpdatePageProps = {
  user: User | null
  onSaved: (user: User) => void
  onCancel: () => void
}

export default function UserInfoUpdatePage({ user, onSaved, onCancel }: UserInfoUpdatePageProps) {
  const [name, setName] = useState<string>('')
  const [department, setDepartment] = useState<string>('')
  const [emailLocal, setEmailLocal] = useState<string>('')
  const [phoneArea, setPhoneArea] = useState<string>('051')
  const [phoneMid, setPhoneMid] = useState<string>('')
  const [phoneLast, setPhoneLast] = useState<string>('')
  const [faxArea, setFaxArea] = useState<string>('051')
  const [faxMid, setFaxMid] = useState<string>('')
  const [faxLast, setFaxLast] = useState<string>('')
  const [zipCode, setZipCode] = useState<string>('')
  const [baseAddress, setBaseAddress] = useState<string>('')
  const [detailAddress, setDetailAddress] = useState<string>('')
  const [postcodeReady, setPostcodeReady] = useState<boolean>(false)
  const [statusMessage, setStatusMessage] = useState<string>('')

  const parseContact = useCallback((value: string | undefined) => {
    if (!value) return { area: '051', mid: '', last: '' }
    const [area = '051', mid = '', last = ''] = value.split('-')
    return {
      area: area || '051',
      mid,
      last,
    }
  }, [])

  const syncFromProfile = useCallback(
    (savedUser: User | null) => {
      setName(savedUser?.name ?? '')
      setDepartment(savedUser?.department ?? '')
      const emailValue = savedUser?.email ?? ''
      const [local, domain] = emailValue.split('@')
      setEmailLocal(domain === 'korea.kr' ? local : emailValue)
      const phoneParts = parseContact(savedUser?.phone)
      setPhoneArea(phoneParts.area)
      setPhoneMid(phoneParts.mid)
      setPhoneLast(phoneParts.last)
      const faxParts = parseContact(savedUser?.fax)
      setFaxArea(faxParts.area)
      setFaxMid(faxParts.mid)
      setFaxLast(faxParts.last)
      setZipCode(savedUser?.zipCode ?? '')
      setBaseAddress(savedUser?.baseAddress ?? '')
      setDetailAddress(savedUser?.detailAddress ?? '')
      setStatusMessage('')
    },
    [parseContact],
  )

  useEffect(() => {
    if (window.daum?.Postcode) {
      setPostcodeReady(true)
      return
    }
    if (document.getElementById('daum-postcode-script')) return
    const script = document.createElement('script')
    script.id = 'daum-postcode-script'
    script.src = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'
    script.onload = () => setPostcodeReady(true)
    script.onerror = () => setPostcodeReady(false)
    document.body.appendChild(script)
  }, [])

  const formatNumberPart = useCallback((value: string, maxLength: number) => {
    return value.replace(/\D/g, '').slice(0, maxLength)
  }, [])

  const handleAddressSearch = useCallback(() => {
    if (!window.daum?.Postcode) {
      alert('주소 검색 스크립트를 불러오지 못했습니다. 네트워크 상태를 확인해 주세요.')
      return
    }
    new window.daum.Postcode({
      oncomplete: (data) => {
        setZipCode(data.zonecode)
        setBaseAddress(data.roadAddress || data.jibunAddress)
        setDetailAddress('')
      },
    }).open()
  }, [])

  useEffect(() => {
    syncFromProfile(user)
  }, [user, syncFromProfile])

  const handleSave = useCallback(async () => {
    const email = emailLocal ? `${emailLocal}@korea.kr` : ''
    const phone = phoneMid && phoneLast ? `${phoneArea}-${phoneMid}-${phoneLast}` : ''
    const fax = faxMid && faxLast ? `${faxArea}-${faxMid}-${faxLast}` : ''
    const payload: User = {
      name,
      department,
      email,
      phone,
      fax,
      zipCode,
      baseAddress,
      detailAddress,
    }
    try {
      await window.electronAPI.user.save(payload)
      onSaved(payload)
      setStatusMessage('담당자 정보를 저장했습니다.')
    } catch (error) {
      console.error(error)
      setStatusMessage('저장에 실패했습니다. 다시 시도해 주세요.')
    }
  }, [
    name,
    department,
    emailLocal,
    phoneMid,
    phoneLast,
    phoneArea,
    faxMid,
    faxLast,
    faxArea,
    zipCode,
    baseAddress,
    detailAddress,
    onSaved,
  ])

  return (
    <section className="flex h-full min-h-0 flex-col gap-4">
      <h2 className="flex border-l-4 border-[#003764] pl-4 text-2xl font-bold">담당자 정보 수정</h2>
      <div className="border border-gray-200" />
      <div className="flex min-h-0 flex-1 flex-col rounded-3xl border border-gray-200 bg-white p-6 shadow-lg">
        <div className="flex min-h-0 flex-1 flex-col gap-6">
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-5 items-center gap-6">
              <h3 className="col-span-1 font-semibold text-gray-700">이름</h3>
              <input
                type="text"
                className="col-span-4 rounded-lg border border-gray-300 px-5 py-3"
                placeholder="이름을 입력하세요"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-5 items-center gap-6">
              <h3 className="col-span-1 font-semibold text-gray-700">부서</h3>
              <div className="col-span-4">
                <DepartmentSelect value={department} onChange={setDepartment} />
              </div>
            </div>

            <div className="grid grid-cols-5 items-center gap-6">
              <h3 className="col-span-1 font-semibold text-gray-700">이메일</h3>
              <div className="col-span-4 flex items-center gap-3">
                <input
                  type="email"
                  className="w-full rounded-lg border border-gray-300 px-5 py-3"
                  placeholder="아이디를 입력하세요"
                  value={emailLocal}
                  onChange={(e) => setEmailLocal(e.target.value.replace(/\s/g, ''))}
                />
                <span className="text-sm text-gray-600">@korea.kr</span>
              </div>
            </div>

            <div className="grid grid-cols-5 items-start gap-6">
              <h3 className="col-span-1 font-semibold text-gray-700">전화번호</h3>
              <div className="col-span-4 flex flex-wrap items-center gap-3">
                <select
                  className="w-32 rounded-lg border border-gray-300 px-3 py-3"
                  value={phoneArea}
                  onChange={(e) => setPhoneArea(e.target.value)}
                >
                  {KOREA_AREA_CODES.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
                <span className="text-gray-500">-</span>
                <input
                  type="text"
                  className="w-28 rounded-lg border border-gray-300 px-3 py-3"
                  inputMode="numeric"
                  placeholder="000"
                  value={phoneMid}
                  onChange={(e) => setPhoneMid(formatNumberPart(e.target.value, 3))}
                />
                <span className="text-gray-500">-</span>
                <input
                  type="text"
                  className="w-28 rounded-lg border border-gray-300 px-3 py-3"
                  inputMode="numeric"
                  placeholder="0000"
                  value={phoneLast}
                  onChange={(e) => setPhoneLast(formatNumberPart(e.target.value, 4))}
                />
              </div>
            </div>

            <div className="grid grid-cols-5 items-start gap-6">
              <h3 className="col-span-1 font-semibold text-gray-700">팩스번호</h3>
              <div className="col-span-4 flex flex-wrap items-center gap-3">
                <select
                  className="w-32 rounded-lg border border-gray-300 px-3 py-3"
                  value={faxArea}
                  onChange={(e) => setFaxArea(e.target.value)}
                >
                  {KOREA_AREA_CODES.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
                <span className="text-gray-500">-</span>
                <input
                  type="text"
                  className="w-28 rounded-lg border border-gray-300 px-3 py-3"
                  inputMode="numeric"
                  placeholder="000"
                  value={faxMid}
                  onChange={(e) => setFaxMid(formatNumberPart(e.target.value, 3))}
                />
                <span className="text-gray-500">-</span>
                <input
                  type="text"
                  className="w-28 rounded-lg border border-gray-300 px-3 py-3"
                  inputMode="numeric"
                  placeholder="0000"
                  value={faxLast}
                  onChange={(e) => setFaxLast(formatNumberPart(e.target.value, 4))}
                />
              </div>
            </div>

            <div className="grid grid-cols-5 items-start gap-6">
              <h3 className="col-span-1 font-semibold text-gray-700">주소</h3>
              <div className="col-span-4 flex flex-col gap-3">
                <div className="flex flex-wrap gap-3">
                  <input
                    type="text"
                    className="w-40 rounded-lg border border-gray-300 px-4 py-3"
                    placeholder="우편번호"
                    value={zipCode}
                    readOnly
                  />
                  <button
                    type="button"
                    className="rounded-lg border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400"
                    onClick={handleAddressSearch}
                    disabled={!postcodeReady && !window.daum?.Postcode}
                  >
                    주소 검색
                  </button>
                </div>
                <input
                  type="text"
                  className="rounded-lg border border-gray-300 px-4 py-3"
                  placeholder="기본주소"
                  value={baseAddress}
                  readOnly
                />
                <input
                  type="text"
                  className="rounded-lg border border-gray-300 px-4 py-3"
                  placeholder="상세주소를 입력하세요"
                  value={detailAddress}
                  onChange={(e) => setDetailAddress(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="mt-auto flex flex-col gap-3 pt-4">
            {statusMessage ? (
              <div className="rounded-2xl bg-blue-50 px-5 py-3 text-sm text-blue-700">{statusMessage}</div>
            ) : null}
            <div className="flex gap-3">
              <button
                className="w-full rounded-2xl bg-gray-200 px-5 py-3 font-semibold text-gray-800 hover:bg-gray-300"
                onClick={onCancel}
              >
                취소
              </button>
              <button
                className="w-full rounded-2xl bg-[#003764] px-5 py-3 font-semibold text-white hover:bg-[#114a83]"
                onClick={handleSave}
              >
                저장하기
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
