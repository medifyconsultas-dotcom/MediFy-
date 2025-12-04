import { motion } from 'framer-motion'

interface SkeletonLoaderProps {
  width?: string | number
  height?: string | number
  borderRadius?: string
  className?: string
  count?: number
  variant?: 'text' | 'circular' | 'rectangular'
}

export default function SkeletonLoader({
  width = '100%',
  height = '1rem',
  borderRadius = '0.5rem',
  className = '',
  count = 1,
  variant = 'rectangular'
}: SkeletonLoaderProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'circular':
        return {
          borderRadius: '50%',
          width: height,
          height: height,
        }
      case 'text':
        return {
          borderRadius: '0.25rem',
          height: '1rem',
        }
      default:
        return {
          borderRadius,
        }
    }
  }

  const skeletons = Array.from({ length: count }, (_, i) => (
    <motion.div
      key={i}
      className={`skeleton-loader ${className}`}
      style={{
        width: variant === 'circular' ? height : width,
        height,
        ...getVariantStyles(),
      }}
      initial={{ opacity: 0.6 }}
      animate={{
        opacity: [0.6, 1, 0.6],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut',
        delay: i * 0.1,
      }}
    />
  ))

  return <>{skeletons}</>
}


