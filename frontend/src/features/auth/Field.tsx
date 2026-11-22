import type { InputHTMLAttributes } from 'react'

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
}

export function Field({ label, id, ...props }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input id={id} {...props} className="field" />
    </div>
  )
}
