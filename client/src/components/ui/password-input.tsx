'use client'

import * as React from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input, type InputProps } from '@/components/ui/input'

export interface PasswordInputProps extends Omit<InputProps, 'type'> {
  buttonLabel?: {
    show: string
    hide: string
  }
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, buttonLabel, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false)

    return (
      <div className="relative">
        <Input
          {...props}
          ref={ref}
          type={visible ? 'text' : 'password'}
          className={cn('pr-12', className)}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? buttonLabel?.hide || 'Hide password' : buttonLabel?.show || 'Show password'}
          className="absolute inset-y-0 right-0 inline-flex w-12 items-center justify-center text-black/55 transition hover:text-black focus-visible:text-black focus-visible:outline-none"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    )
  }
)

PasswordInput.displayName = 'PasswordInput'
