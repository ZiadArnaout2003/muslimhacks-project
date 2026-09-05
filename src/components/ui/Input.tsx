import {
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  type ReactNode,
  forwardRef,
} from 'react'
import clsx from 'clsx'

const fieldClasses =
  'focus-ring w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm placeholder:text-gray-400 disabled:bg-gray-50 disabled:text-gray-400'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={clsx(fieldClasses, className)} {...props} />
)
Input.displayName = 'Input'

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select ref={ref} className={clsx(fieldClasses, 'bg-white', className)} {...props}>
      {children}
    </select>
  )
)
Select.displayName = 'Select'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => <textarea ref={ref} className={clsx(fieldClasses, className)} {...props} />
)
Textarea.displayName = 'Textarea'

export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-gray-700">
      {children}
    </label>
  )
}

export function FieldError({ children }: { children?: string | null }) {
  if (!children) return null
  return <p className="mt-1 text-xs text-red-600">{children}</p>
}
