// app/layout.js
import { Inter } from 'next/font/google'
import './globals.css'
import { AppProvider } from '@/lib/context/AppContext'
import Providers from '@/components/Providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title      : 'AI Job Agent',
  description: 'Find jobs that actually match your skills',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* SessionProvider must wrap AppProvider so AppContext can access session */}
        <Providers>
          <AppProvider>
            {children}
          </AppProvider>
        </Providers>
      </body>
    </html>
  )
}