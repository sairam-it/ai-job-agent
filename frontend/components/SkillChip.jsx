"use client"

import { Check, X } from 'lucide-react'

export function SkillChip({ 
  skill, 
  variant = 'default', 
  removable = false, 
  onRemove,
  className = '' 
}) {
  const variants = {
    default: 'bg-[#7C3AED] text-white',
    matched: 'bg-[#16A34A]/20 text-[#16A34A] border border-[#16A34A]/30',
    missing: 'bg-[#DC2626]/20 text-[#DC2626] border border-[#DC2626]/30',
    neutral: 'bg-[#334155] text-[#F8FAFC]',
  }

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium
        ${variants[variant]}
        ${className}
      `}
    >
      {variant === 'matched' && <Check className="w-3.5 h-3.5" />}
      {variant === 'missing' && <X className="w-3.5 h-3.5" />}
      
      <span>{skill}</span>
      
      {removable && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove(skill)
          }}
          className="ml-1 p-0.5 hover:bg-white/20 rounded-full transition-colors"
          aria-label={`Remove ${skill}`}
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  )
}
