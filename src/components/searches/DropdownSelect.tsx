import { Fragment } from 'react'
import { Listbox, Transition } from '@headlessui/react'
import { ChevronUpDownIcon } from '@heroicons/react/20/solid'

export type DropdownOption<T extends string> = {
  value: T
  label: string
}

type DropdownSelectProps<T extends string> = {
  id?: string
  value: T
  options: DropdownOption<T>[]
  onChange: (value: T) => void
}

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

export default function DropdownSelect<T extends string>({
  id,
  value,
  options,
  onChange,
}: DropdownSelectProps<T>) {
  const selectedOption = options.find((option) => option.value === value) ?? options[0]

  return (
    <Listbox value={value} onChange={onChange}>
      <div className="relative w-full">
        <Listbox.Button
          id={id}
          className="flex w-full cursor-pointer items-center justify-between rounded-2xl border border-gray-300 bg-white px-4 py-3 text-left text-sm text-gray-900 outline-none transition hover:border-gray-400 focus-visible:border-[#003764] focus-visible:ring-2 focus-visible:ring-[#003764]/10"
        >
          <span className="truncate">{selectedOption.label}</span>
          <ChevronUpDownIcon className="ml-3 h-5 w-5 shrink-0 text-gray-500" aria-hidden="true" />
        </Listbox.Button>

        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Listbox.Options className="absolute left-0 top-[calc(100%+0.5rem)] z-50 max-h-60 w-full overflow-auto rounded-2xl border border-[#003764]/20 bg-white py-1 text-sm shadow-[0_18px_40px_rgba(0,55,100,0.14)] ring-1 ring-black/5 focus:outline-none">
            {options.map((option) => (
              <Listbox.Option
                key={option.value}
                value={option.value}
                className={({ active }) =>
                  classNames(
                    active ? 'bg-[#003764] text-white' : 'text-gray-700',
                    'cursor-pointer select-none px-4 py-3 transition',
                  )
                }
              >
                {({ selected }) => (
                  <span className={classNames(selected ? 'font-semibold' : 'font-normal', 'block truncate')}>
                    {option.label}
                  </span>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  )
}
