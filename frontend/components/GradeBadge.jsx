"use client"

export function GradeBadge({ grade, size = 'default' }) {
  const gradeConfig = {
    A: { 
      bg: 'bg-[#16A34A]', 
      text: 'text-white',
      label: 'Strong Match (80%+)'
    },
    B: { 
      bg: 'bg-[#3B82F6]', 
      text: 'text-white',
      label: 'Good Match (60%+)'
    },
    C: { 
      bg: 'bg-[#D97706]', 
      text: 'text-[#1E293B]',
      label: 'Partial Match (40%+)'
    },
    D: { 
      bg: 'bg-[#6B7280]', 
      text: 'text-white',
      label: 'Low Match (below 40%)'
    },
  }

  const config = gradeConfig[grade] || gradeConfig.D
  
  const sizeClasses = {
    small: 'w-6 h-6 text-xs',
    default: 'w-8 h-8 text-sm',
    large: 'w-12 h-12 text-lg',
  }

  return (
    <span
      className={`
        inline-flex items-center justify-center rounded-lg font-bold
        ${config.bg} ${config.text}
        ${sizeClasses[size]}
      `}
      aria-label={`Grade ${grade}: ${config.label}`}
    >
      {grade}
    </span>
  )
}
