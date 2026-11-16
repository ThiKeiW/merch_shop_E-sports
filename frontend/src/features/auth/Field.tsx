import type { InputHTMLAttributes } from 'react'

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
}

export function Field({ label, id, ...props }: FieldProps) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="block text-[11px] font-semibold tracking-[0.2em] text-zinc-400 uppercase"
      >
        {label}
      </label>
      <input
        id={id}
        {...props}
        className="w-full border border-line bg-surface-2 px-3 py-2.5 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-zinc-400"
      />
    </div>
  )
}
