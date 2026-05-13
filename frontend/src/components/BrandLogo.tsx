type BrandLogoSize = 'xs' | 'sm' | 'md' | 'lg'
type BrandLogoVariant = 'blue' | 'black' | 'white'

interface BrandLogoProps {
  size?: BrandLogoSize
  variant?: BrandLogoVariant
  showText?: boolean
  className?: string
  textClassName?: string
  markClassName?: string
}

const markSizes: Record<BrandLogoSize, string> = {
  xs: 'h-5 w-5',
  sm: 'h-7 w-7',
  md: 'h-10 w-10',
  lg: 'h-16 w-16 md:h-20 md:w-20',
}

const textSizes: Record<BrandLogoSize, string> = {
  xs: 'text-[13px]',
  sm: 'text-[14px]',
  md: 'text-[22px]',
  lg: 'text-[46px] md:text-[72px]',
}

export default function BrandLogo({
  size = 'sm',
  variant = 'blue',
  showText = true,
  className = '',
  textClassName = '',
  markClassName = '',
}: BrandLogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <img
        src={`/brand/daflow-mark-${variant}.png`}
        alt="Daflow"
        className={`${markSizes[size]} object-contain shrink-0 ${markClassName}`}
        draggable={false}
      />
      {showText && (
        <span className={`${textSizes[size]} font-semibold tracking-tight leading-none ${textClassName}`}>
          Daflow
        </span>
      )}
    </span>
  )
}
