"use client"

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Zap, Menu, X } from 'lucide-react'

const navLinks = [
  { href: '/upload', label: 'Upload Resume' },
  { href: '/companies', label: 'Companies' },
  { href: '/jobs', label: 'Jobs' },
]

export function Navbar() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-40 h-16 bg-[#0F172A]/80 backdrop-blur-md border-b border-[#334155]">
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Zap className="w-6 h-6 text-[#7C3AED]" />
          <span className="text-white font-bold text-lg">AI Job Agent</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map(link => {
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`
                  relative py-2 text-sm font-medium transition-colors
                  ${isActive ? 'text-[#7C3AED]' : 'text-[#94A3B8] hover:text-white'}
                `}
              >
                {link.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7C3AED]" />
                )}
              </Link>
            )
          })}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 text-[#94A3B8] hover:text-white transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#0F172A] border-b border-[#334155] animate-fade-in">
          <div className="px-4 py-4 space-y-2">
            {navLinks.map(link => {
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`
                    block py-3 px-4 rounded-lg text-sm font-medium transition-colors
                    ${isActive 
                      ? 'bg-[#7C3AED]/10 text-[#7C3AED]' 
                      : 'text-[#94A3B8] hover:bg-[#1E293B] hover:text-white'}
                  `}
                >
                  {link.label}
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </nav>
  )
}
