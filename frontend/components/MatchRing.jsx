"use client"

import { useEffect, useState } from 'react'

export function MatchRing({ percentage, size = 120, strokeWidth = 8 }) {
  const [animatedOffset, setAnimatedOffset] = useState(283)
  
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const targetOffset = circumference - (percentage / 100) * circumference

  // Get color based on percentage
  const getColor = () => {
    if (percentage >= 80) return '#16A34A' // green
    if (percentage >= 60) return '#3B82F6' // blue
    if (percentage >= 40) return '#D97706' // amber
    return '#6B7280' // gray
  }

  const color = getColor()

  // Animate on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedOffset(targetOffset)
    }, 100)
    return () => clearTimeout(timer)
  }, [targetOffset])

  return (
    <div 
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`${percentage}% skill match`}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#334155"
          strokeWidth={strokeWidth}
        />
        
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={animatedOffset}
          style={{
            transform: 'rotate(-90deg)',
            transformOrigin: 'center',
            transition: 'stroke-dashoffset 1s ease-out'
          }}
        />
      </svg>
      
      {/* Center text */}
      <div 
        className="absolute inset-0 flex items-center justify-center"
        style={{ color }}
      >
        <span className={`font-bold ${size >= 120 ? 'text-2xl' : 'text-lg'}`}>
          {percentage}%
        </span>
      </div>
    </div>
  )
}
