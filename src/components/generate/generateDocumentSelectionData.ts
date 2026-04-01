export type GenerateDocumentOption = 'preNotice' | 'suspension' | 'finalNotice'

export const DOCUMENT_OPTIONS: Array<{
  id: GenerateDocumentOption
  label: string
}> = [
  {
    id: 'preNotice',
    label: '사전통지서',
  },
  {
    id: 'suspension',
    label: '운전업무정지',
  },
  {
    id: 'finalNotice',
    label: '확정통지서',
  },
]

export const ALL_DOCUMENT_OPTIONS: GenerateDocumentOption[] = ['preNotice', 'suspension', 'finalNotice']
