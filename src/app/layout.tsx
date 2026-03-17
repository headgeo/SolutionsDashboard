import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Solutions Dashboard',
  description: 'Internal structured products knowledge base and retrieval system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="noise-bg antialiased">
        {children}
      </body>
    </html>
  )
}
