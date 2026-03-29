"use client"

import Link from 'next/link'
import { Calendar, MapPin, Briefcase } from 'lucide-react'
import { GradeBadge } from '@/components/GradeBadge'
import { MatchRing } from '@/components/MatchRing'
import { SkillChip } from '@/components/SkillChip'

export function JobCard({ job, user_id }) {
  const {
    title,
    company,
    location,
    experience_level,
    date_posted,
    grade,
    raw_match,
    matched_skills = [],
    missing_skills = [],
  } = job

  // Show max 5 skills total
  const allSkills = [
    ...matched_skills.map(s => ({ skill: s, matched: true })),
    ...missing_skills.map(s => ({ skill: s, matched: false })),
  ]
  const visibleSkills = allSkills.slice(0, 5)
  const remainingCount = allSkills.length - 5

  // Get company initial color
  const getCompanyColor = (name) => {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-red-500', 'bg-teal-500']
    const index = name.charCodeAt(0) % colors.length
    return colors[index]
  }

  const jobUrl = `/jobs/${encodeURIComponent(title)}?company=${encodeURIComponent(company)}&user_id=${user_id}`

  return (
    <Link href={jobUrl} className="block">
      <div className="bg-[#1E293B] rounded-xl p-6 mb-3 border border-transparent hover:border-l-4 hover:border-l-[#7C3AED] hover:shadow-lg transition-all duration-200 cursor-pointer group">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Left Section */}
          <div className="flex-1 min-w-0">
            {/* Title Row */}
            <div className="flex items-start gap-3 mb-3">
              <GradeBadge grade={grade} />
              <h3 className="text-white font-bold text-lg group-hover:text-[#7C3AED] transition-colors truncate">
                {title}
              </h3>
            </div>

            {/* Company Info Row */}
            <div className="flex items-center gap-2 text-[#94A3B8] text-sm mb-4">
              <div className={`w-5 h-5 ${getCompanyColor(company)} rounded-full flex items-center justify-center text-white text-xs font-bold`}>
                {company.charAt(0)}
              </div>
              <span>{company}</span>
              <span className="text-[#64748B]">·</span>
              <MapPin className="w-3.5 h-3.5" />
              <span>{location || 'Not specified'}</span>
              {experience_level && (
                <>
                  <span className="text-[#64748B]">·</span>
                  <Briefcase className="w-3.5 h-3.5" />
                  <span className="capitalize">{experience_level}</span>
                </>
              )}
            </div>

            {/* Skills Row */}
            <div className="flex flex-wrap gap-2 mb-3">
              {visibleSkills.map(({ skill, matched }) => (
                <SkillChip
                  key={skill}
                  skill={skill}
                  variant={matched ? 'matched' : 'missing'}
                />
              ))}
              {remainingCount > 0 && (
                <span className="px-3 py-1 bg-[#334155] text-[#94A3B8] rounded-full text-sm">
                  +{remainingCount} more
                </span>
              )}
            </div>

            {/* Date Row */}
            {date_posted && (
              <div className="flex items-center gap-1.5 text-[#64748B] text-xs">
                <Calendar className="w-3.5 h-3.5" />
                <span>Posted {date_posted}</span>
              </div>
            )}
          </div>

          {/* Right Section - Match Ring (Desktop) */}
          <div className="hidden lg:flex w-40 flex-col items-center justify-center gap-3">
            <MatchRing percentage={raw_match || 0} size={100} strokeWidth={8} />
            <span className="px-4 py-2 border border-[#7C3AED] text-[#7C3AED] rounded-lg text-sm font-medium group-hover:bg-[#7C3AED] group-hover:text-white transition-colors">
              View Job →
            </span>
          </div>

          {/* Mobile Layout */}
          <div className="lg:hidden flex items-center justify-between pt-4 border-t border-[#334155]">
            <div className="flex items-center gap-3">
              <GradeBadge grade={grade} size="small" />
              <MatchRing percentage={raw_match || 0} size={60} strokeWidth={6} />
            </div>
            <span className="px-4 py-2 bg-[#7C3AED] text-white rounded-lg text-sm font-medium">
              View Job →
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
