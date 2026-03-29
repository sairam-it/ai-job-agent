"use client"

export function SkeletonCard() {
  return (
    <div className="bg-[#1E293B] rounded-xl p-6 mb-3">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Left section */}
        <div className="flex-1 space-y-4">
          {/* Title row */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg animate-shimmer" />
            <div className="h-6 w-48 rounded animate-shimmer" />
          </div>
          
          {/* Company info */}
          <div className="h-4 w-64 rounded animate-shimmer" />
          
          {/* Skills */}
          <div className="flex flex-wrap gap-2">
            <div className="h-6 w-16 rounded-full animate-shimmer" />
            <div className="h-6 w-20 rounded-full animate-shimmer" />
            <div className="h-6 w-14 rounded-full animate-shimmer" />
            <div className="h-6 w-18 rounded-full animate-shimmer" />
          </div>
          
          {/* Date */}
          <div className="h-3 w-32 rounded animate-shimmer" />
        </div>
        
        {/* Right section - Match Ring */}
        <div className="w-40 flex flex-col items-center justify-center gap-3">
          <div className="w-24 h-24 rounded-full animate-shimmer" />
          <div className="h-8 w-24 rounded-lg animate-shimmer" />
        </div>
      </div>
    </div>
  )
}

export function SkeletonJobDetail() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-[#1E293B] rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg animate-shimmer" />
          <div className="h-8 w-64 rounded animate-shimmer" />
        </div>
        <div className="h-5 w-48 rounded animate-shimmer" />
      </div>
      
      {/* Match Score */}
      <div className="bg-[#1E293B] rounded-xl p-6 space-y-4">
        <div className="h-6 w-40 rounded animate-shimmer" />
        <div className="flex justify-center py-4">
          <div className="w-40 h-40 rounded-full animate-shimmer" />
        </div>
        <div className="space-y-3">
          <div className="h-4 w-full rounded animate-shimmer" />
          <div className="h-4 w-3/4 rounded animate-shimmer" />
        </div>
      </div>
    </div>
  )
}
