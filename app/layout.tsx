import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '论文智能批注系统',
  description: 'Created with wyj',
  generator: 'cuc',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
