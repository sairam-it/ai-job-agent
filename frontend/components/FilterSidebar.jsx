"use client"

import { SlidersHorizontal, X } from 'lucide-react'

const gradeOptions = [
  { value: 'A', label: 'A — Strong Match (80%+)', dotColor: 'bg-[#16A34A]' },
  { value: 'B', label: 'B — Good Match (60%+)', dotColor: 'bg-[#3B82F6]' },
  { value: 'C', label: 'C — Partial Match (40%+)', dotColor: 'bg-[#D97706]' },
  { value: 'D', label: 'D — Low Match', dotColor: 'bg-[#6B7280]' },
]

const experienceLevels = [
  { value: 'any', label: 'Any Level' },
  { value: 'entry', label: 'Entry / Fresher' },
  { value: 'mid', label: 'Mid Level' },
  { value: 'senior', label: 'Senior' },
]

const locations = [
  'Any Location',
  'Hyderabad',
  'Bangalore',
  'Mumbai',
  'Chennai',
  'Delhi',
  'Remote',
]

export function FilterSidebar({ 
  filters, 
  onFilterChange, 
  onReset, 
  companies = [],
  isMobile = false,
  onClose 
}) {
  const handleGradeChange = (grade) => {
    const currentGrades = filters.grades || []
    const newGrades = currentGrades.includes(grade)
      ? currentGrades.filter(g => g !== grade)
      : [...currentGrades, grade]
    onFilterChange({ ...filters, grades: newGrades })
  }

  const handleExperienceChange = (level) => {
    onFilterChange({ ...filters, experience_level: level === 'any' ? '' : level })
  }

  const handleLocationChange = (location) => {
    onFilterChange({ 
      ...filters, 
      location: location === 'Any Location' ? '' : location 
    })
  }

  const handleCompanyChange = (company) => {
    const currentCompanies = filters.companies || []
    const newCompanies = currentCompanies.includes(company)
      ? currentCompanies.filter(c => c !== company)
      : [...currentCompanies, company]
    onFilterChange({ ...filters, companies: newCompanies })
  }

  const content = (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5 text-[#7C3AED]" />
          <h3 className="text-white font-bold">Filters</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onReset}
            className="text-[#DC2626] text-sm hover:text-red-400 transition-colors"
          >
            Reset All
          </button>
          {isMobile && onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-[#334155] rounded-lg transition-colors"
              aria-label="Close filters"
            >
              <X className="w-5 h-5 text-[#94A3B8]" />
            </button>
          )}
        </div>
      </div>

      {/* Grade Filter */}
      <div>
        <h4 className="text-[#94A3B8] text-sm font-medium mb-3">Grade</h4>
        <div className="space-y-2">
          {gradeOptions.map(option => (
            <label
              key={option.value}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <input
                type="checkbox"
                checked={(filters.grades || []).includes(option.value)}
                onChange={() => handleGradeChange(option.value)}
                className="w-4 h-4 rounded border-[#334155] bg-[#0F172A] text-[#7C3AED] focus:ring-[#7C3AED] focus:ring-offset-0"
              />
              <span className={`w-2 h-2 rounded-full ${option.dotColor}`} />
              <span className="text-[#94A3B8] text-sm group-hover:text-white transition-colors">
                {option.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Experience Level Filter */}
      <div>
        <h4 className="text-[#94A3B8] text-sm font-medium mb-3">Experience Level</h4>
        <div className="space-y-2">
          {experienceLevels.map(level => (
            <label
              key={level.value}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <input
                type="radio"
                name="experience"
                checked={
                  level.value === 'any' 
                    ? !filters.experience_level 
                    : filters.experience_level === level.value
                }
                onChange={() => handleExperienceChange(level.value)}
                className="w-4 h-4 border-[#334155] bg-[#0F172A] text-[#7C3AED] focus:ring-[#7C3AED] focus:ring-offset-0"
              />
              <span className="text-[#94A3B8] text-sm group-hover:text-white transition-colors">
                {level.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Location Filter */}
      <div>
        <h4 className="text-[#94A3B8] text-sm font-medium mb-3">Location</h4>
        <select
          value={filters.location || 'Any Location'}
          onChange={(e) => handleLocationChange(e.target.value)}
          className="w-full px-3 py-2 bg-[#0F172A] border border-[#334155] rounded-lg text-white text-sm focus:outline-none focus:border-[#7C3AED]"
        >
          {locations.map(location => (
            <option key={location} value={location}>
              {location}
            </option>
          ))}
        </select>
      </div>

      {/* Company Filter */}
      {companies.length > 0 && (
        <div>
          <h4 className="text-[#94A3B8] text-sm font-medium mb-3">Company</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {companies.map(({ company, count }) => (
              <label
                key={company}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={(filters.companies || []).includes(company)}
                  onChange={() => handleCompanyChange(company)}
                  className="w-4 h-4 rounded border-[#334155] bg-[#0F172A] text-[#7C3AED] focus:ring-[#7C3AED] focus:ring-offset-0"
                />
                <span className="text-[#94A3B8] text-sm group-hover:text-white transition-colors">
                  {company} ({count})
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  if (isMobile) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 lg:hidden" onClick={onClose}>
        <div 
          className="absolute bottom-0 left-0 right-0 bg-[#1E293B] rounded-t-2xl p-6 max-h-[80vh] overflow-y-auto animate-fade-in"
          onClick={e => e.stopPropagation()}
        >
          {content}
          <button
            onClick={onClose}
            className="w-full mt-6 py-3 bg-[#7C3AED] text-white rounded-lg font-medium"
          >
            Apply Filters
          </button>
        </div>
      </div>
    )
  }

  return (
    <aside className="w-64 bg-[#1E293B] rounded-xl p-5 sticky top-24 h-fit">
      {content}
    </aside>
  )
}
