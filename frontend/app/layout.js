import { Inter } from 'next/font/google'
import './globals.css'
import { AppProvider } from '@/lib/context/AppContext'
import { ToastProvider } from '@/components/ToastProvider'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter'
})

export const metadata = {
  title: 'AI Job Agent - Find Jobs That Match Your Skills',
  description: 'Upload your resume. We extract your skills, search your target companies, and rank every job by skill match percentage — automatically.',
}

export const viewport = {
  themeColor: '#0F172A',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased bg-[#0F172A] text-[#F8FAFC]`}>
        <AppProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AppProvider>
      </body>
    </html>
  )
}
