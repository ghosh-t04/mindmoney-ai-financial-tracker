import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AmplifyProvider } from '@/lib/amplify-config'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'MindMoney - AI-Powered Finance Tracker',
  description: 'Track your finances with AI-powered insights and personalized savings plans',
  keywords: ['finance', 'tracker', 'AI', 'savings', 'budgeting'],
  authors: [{ name: 'MindMoney Team' }],
  viewport: 'width=device-width, initial-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AmplifyProvider>
          {children}
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
            }}
          />
        </AmplifyProvider>
      </body>
    </html>
  )
}
