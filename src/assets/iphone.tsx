import type { ReactNode } from 'react'

type IPhoneMockupProps = {
  children?: ReactNode
  className?: string
}

export default function IPhoneMockup({ children, className = '' }: IPhoneMockupProps) {
  return (
    <div
      className={[
        'relative mx-auto aspect-[300/610] w-full max-w-[320px] rounded-[3.5rem] bg-[#f5f7fa] p-[10px] shadow-[0_30px_70px_rgba(0,0,0,0.35)]',
        className,
      ].join(' ')}
    >
      <div className="absolute inset-[6px] rounded-[3.15rem] border border-[#d9dde3]" />
      <div className="absolute left-1/2 top-[18px] z-20 h-[30px] w-[110px] -translate-x-1/2 rounded-full bg-[#e8ebef] shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]" />
      <div className="absolute left-[calc(50%+26px)] top-[30px] z-30 h-[8px] w-[8px] rounded-full bg-[#c9d2dc]" />
      <div className="absolute left-[-2px] top-[120px] h-[70px] w-[4px] rounded-r-full bg-[#d9dde3]" />
      <div className="absolute left-[-2px] top-[210px] h-[36px] w-[4px] rounded-r-full bg-[#d9dde3]" />
      <div className="absolute left-[-2px] top-[258px] h-[36px] w-[4px] rounded-r-full bg-[#d9dde3]" />
      <div className="absolute right-[-2px] top-[190px] h-[90px] w-[4px] rounded-l-full bg-[#d9dde3]" />

      <div className="relative h-full overflow-hidden rounded-[3rem] bg-black">
        <div className="absolute inset-x-0 top-0 z-10 h-8 bg-gradient-to-b from-black via-black to-transparent" />
        <div className="h-full w-full bg-black">{children}</div>
      </div>
    </div>
  )
}
