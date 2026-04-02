import type { SVGProps } from 'react'
import { cn } from '@/lib/utils'

export type BrandVariant = 'closer' | 'premium' | 'ethiopian'

interface BrandMarkProps extends SVGProps<SVGSVGElement> {
  withGlow?: boolean
  variant?: BrandVariant
}

function CloserMark() {
  return (
    <>
      <circle cx="26" cy="32" r="20.75" fill="#855038" fillOpacity="0.9" />
      <circle cx="56" cy="32" r="20.75" fill="#2F845A" fillOpacity="0.86" />
      <circle cx="86" cy="32" r="20.75" fill="#1B6784" fillOpacity="0.9" />

      <rect x="24.7" y="15.8" width="5.5" height="25.6" rx="2.75" fill="#FF7F32" />
      <circle cx="21.1" cy="42.5" r="5.15" fill="#FF7F32" />
      <path d="M30.2 18.1C34.3 17.8 38.6 18.4 42 20.4C45.8 22.7 47.5 26.4 46.9 30.1C46.3 33.2 44.4 35.8 41 38" stroke="#FF7F32" strokeWidth="3.35" strokeLinecap="round" strokeLinejoin="round" />

      <rect x="54.7" y="15.8" width="5.5" height="25.6" rx="2.75" fill="#30D158" />
      <circle cx="51.1" cy="42.5" r="5.15" fill="#30D158" />
      <path d="M60.2 18.1C64.3 17.8 68.6 18.4 72 20.4C75.8 22.7 77.5 26.4 76.9 30.1C76.3 33.2 74.4 35.8 71 38" stroke="#30D158" strokeWidth="3.35" strokeLinecap="round" strokeLinejoin="round" />

      <rect x="84.7" y="15.8" width="5.5" height="25.6" rx="2.75" fill="#1FC8F4" />
      <circle cx="81.1" cy="42.5" r="5.15" fill="#1FC8F4" />
      <path d="M90.2 18.1C94.3 17.8 98.6 18.4 102 20.4C105.8 22.7 107.5 26.4 106.9 30.1C106.3 33.2 104.4 35.8 101 38" stroke="#1FC8F4" strokeWidth="3.35" strokeLinecap="round" strokeLinejoin="round" />
    </>
  )
}

function PremiumMark() {
  return (
    <>
      <circle cx="26" cy="32" r="20.5" fill="#6D4A2F" fillOpacity="0.92" />
      <circle cx="57.5" cy="32" r="20.5" fill="#245F45" fillOpacity="0.9" />
      <circle cx="89" cy="32" r="20.5" fill="#174C66" fillOpacity="0.92" />

      <rect x="25.4" y="15.2" width="4.7" height="26.9" rx="2.35" fill="#F1872A" />
      <ellipse cx="20.6" cy="43.1" rx="6.15" ry="5.05" fill="#F1872A" transform="rotate(-20 20.6 43.1)" />
      <path d="M30.1 17.7C34.4 17.7 38.7 18.4 41.9 20.6C45.4 23.1 46.7 26.7 46 30.2C45.4 32.9 43.8 35.1 40.5 37.9" stroke="#F1872A" strokeWidth="3.05" strokeLinecap="round" strokeLinejoin="round" />

      <rect x="56.9" y="15.2" width="4.7" height="26.9" rx="2.35" fill="#43C463" />
      <ellipse cx="52.1" cy="43.1" rx="6.15" ry="5.05" fill="#43C463" transform="rotate(-20 52.1 43.1)" />
      <path d="M61.6 17.7C65.9 17.7 70.2 18.4 73.4 20.6C76.9 23.1 78.2 26.7 77.5 30.2C76.9 32.9 75.3 35.1 72 37.9" stroke="#43C463" strokeWidth="3.05" strokeLinecap="round" strokeLinejoin="round" />

      <rect x="88.4" y="15.2" width="4.7" height="26.9" rx="2.35" fill="#29B4E3" />
      <ellipse cx="83.6" cy="43.1" rx="6.15" ry="5.05" fill="#29B4E3" transform="rotate(-20 83.6 43.1)" />
      <path d="M93.1 17.7C97.4 17.7 101.7 18.4 104.9 20.6C108.4 23.1 109.7 26.7 109 30.2C108.4 32.9 106.8 35.1 103.5 37.9" stroke="#29B4E3" strokeWidth="3.05" strokeLinecap="round" strokeLinejoin="round" />
    </>
  )
}

function EthiopianMark() {
  return (
    <>
      <circle cx="26" cy="32" r="20.4" fill="#8B4F2E" fillOpacity="0.9" />
      <circle cx="56" cy="32" r="20.4" fill="#2B7853" fillOpacity="0.88" />
      <circle cx="86" cy="32" r="20.4" fill="#1C6B82" fillOpacity="0.9" />

      <rect x="24.8" y="15.9" width="5.3" height="25.8" rx="2.65" fill="#F4B942" />
      <circle cx="21.2" cy="42.4" r="5" fill="#F4B942" />
      <path d="M30.1 18.2C34.2 17.9 38.4 18.5 41.7 20.4C45.5 22.6 47.4 26.2 47 29.9C46.7 32.5 45.2 34.8 42.4 37.5" stroke="#F4B942" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M31.6 23.8H39.7" stroke="#F4B942" strokeWidth="1.5" strokeLinecap="round" opacity="0.95" />
      <path d="M31.6 26.8H38.7" stroke="#F4B942" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />

      <rect x="54.8" y="15.9" width="5.3" height="25.8" rx="2.65" fill="#E3D869" />
      <circle cx="51.2" cy="42.4" r="5" fill="#E3D869" />
      <path d="M60.1 18.2C64.2 17.9 68.4 18.5 71.7 20.4C75.5 22.6 77.4 26.2 77 29.9C76.7 32.5 75.2 34.8 72.4 37.5" stroke="#E3D869" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M61.6 23.8H69.7" stroke="#E3D869" strokeWidth="1.5" strokeLinecap="round" opacity="0.95" />
      <path d="M61.6 26.8H68.7" stroke="#E3D869" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />

      <rect x="84.8" y="15.9" width="5.3" height="25.8" rx="2.65" fill="#7FD6F6" />
      <circle cx="81.2" cy="42.4" r="5" fill="#7FD6F6" />
      <path d="M90.1 18.2C94.2 17.9 98.4 18.5 101.7 20.4C105.5 22.6 107.4 26.2 107 29.9C106.7 32.5 105.2 34.8 102.4 37.5" stroke="#7FD6F6" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M91.6 23.8H99.7" stroke="#7FD6F6" strokeWidth="1.5" strokeLinecap="round" opacity="0.95" />
      <path d="M91.6 26.8H98.7" stroke="#7FD6F6" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
    </>
  )
}

export function BrandMark({ className, withGlow = false, variant = 'premium', ...props }: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 112 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {withGlow ? (
        <defs>
          <filter id="brand-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="rgba(15,19,26,0.35)" />
          </filter>
        </defs>
      ) : null}
      <g filter={withGlow ? 'url(#brand-glow)' : undefined}>
        {variant === 'closer' ? <CloserMark /> : null}
        {variant === 'premium' ? <PremiumMark /> : null}
        {variant === 'ethiopian' ? <EthiopianMark /> : null}
      </g>
    </svg>
  )
}

interface BrandLoaderProps {
  className?: string
  label?: string
  withGlow?: boolean
}

export function BrandLoader({ className, label = 'Loading', withGlow = false }: BrandLoaderProps) {
  return (
    <span role="status" aria-label={label} className="inline-flex items-center justify-center">
      <BrandMark
        className={cn('h-5 w-auto animate-[spin_1.15s_linear_infinite] origin-center', className)}
        withGlow={withGlow}
      />
    </span>
  )
}

interface BrandWordmarkProps {
  className?: string
}

export function BrandWordmark({ className }: BrandWordmarkProps) {
  return <span className={className}>Zeማa</span>
}
