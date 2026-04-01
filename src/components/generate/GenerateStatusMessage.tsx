type GenerateStatusMessageProps = {
  status: {
    type: 'success' | 'error' | 'info'
    text: string
  } | null
}

export default function GenerateStatusMessage({ status }: GenerateStatusMessageProps) {
  if (!status) {
    return null
  }

  return (
    <div
      className={`rounded-xl px-4 py-3 text-sm ${
        status.type === 'success'
          ? 'bg-green-50 text-green-700'
          : status.type === 'error'
            ? 'bg-red-50 text-red-700'
            : 'bg-blue-50 text-blue-700'
      }`}
    >
      {status.text}
    </div>
  )
}
