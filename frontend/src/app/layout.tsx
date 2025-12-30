import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Playwright Test Platform',
  description: 'Record and run Playwright tests with visible browser control',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

