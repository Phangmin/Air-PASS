type SearchBarProps = {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export default function SearchBar({
  id,
  value,
  onChange,
  placeholder = '이름 또는 소속으로 검색',
  className = '',
  disabled = false,
}: SearchBarProps) {
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border border-gray-300 bg-white px-4 py-3 transition focus-within:border-[#003764] focus-within:ring-2 focus-within:ring-[#003764]/10 ${className}`.trim()}
    >
      <svg
        viewBox="0 0 20 20"
        className="h-5 w-5 flex-none text-gray-400"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.6" />
        <path d="M13.5 13.5 17 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>

      <input
        id={id}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={placeholder}
        className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400 disabled:cursor-not-allowed disabled:text-gray-400"
      />

      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          disabled={disabled}
          aria-label="검색어 지우기"
          className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-gray-200 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
            <path
              d="M6 6l8 8M14 6l-8 8"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
      ) : null}
    </div>
  )
}
