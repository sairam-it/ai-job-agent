"use client"

import { Check } from 'lucide-react'

const steps = [
  { number: 1, label: 'Upload Resume' },
  { number: 2, label: 'Select Companies' },
  { number: 3, label: 'View Jobs' },
]

export function ProgressBar({ currentStep }) {
  return (
    <div className="w-full py-6 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const isCompleted = step.number < currentStep
            const isActive = step.number === currentStep
            const isUpcoming = step.number > currentStep

            return (
              <div key={step.number} className="flex items-center flex-1 last:flex-none">
                {/* Step Circle and Label */}
                <div className="flex flex-col items-center">
                  <div
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center 
                      font-semibold text-sm transition-all
                      ${isCompleted ? 'bg-[#16A34A] text-white' : ''}
                      ${isActive ? 'bg-[#7C3AED] text-white' : ''}
                      ${isUpcoming ? 'bg-[#334155] text-[#94A3B8]' : ''}
                    `}
                    aria-label={`Step ${step.number}: ${step.label}${isCompleted ? ' (completed)' : isActive ? ' (current)' : ''}`}
                  >
                    {isCompleted ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      step.number
                    )}
                  </div>
                  <span
                    className={`
                      mt-2 text-xs font-medium text-center whitespace-nowrap
                      ${isCompleted ? 'text-[#16A34A]' : ''}
                      ${isActive ? 'text-[#7C3AED] font-bold' : ''}
                      ${isUpcoming ? 'text-[#94A3B8]' : ''}
                    `}
                  >
                    {step.label}
                  </span>
                </div>

                {/* Connecting Line */}
                {index < steps.length - 1 && (
                  <div className="flex-1 mx-4 mt-[-24px]">
                    <div
                      className={`
                        h-0.5 transition-colors
                        ${step.number < currentStep ? 'bg-[#16A34A]' : 'bg-[#334155]'}
                      `}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
