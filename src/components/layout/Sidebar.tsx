'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Library,
  Search,
  Layers,
  BookUser,
  Settings,
  LogOut,
  ChevronRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/library', label: 'Library', icon: Library },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/deck-builder', label: 'Deck Builder', icon: Layers },
  { href: '/client-log', label: 'Client Log', icon: BookUser },
]

interface SidebarProps {
  userEmail?: string
  userName?: string
  isAdmin?: boolean
}

export function Sidebar({ userEmail, userName, isAdmin }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <aside className="w-56 shrink-0 flex flex-col h-screen sticky top-0 border-r border-surface-border bg-surface-subtle">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-surface-border">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-xs">S</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-ink leading-tight">Solutions</p>
            <p className="text-xs text-ink-faint leading-tight">Dashboard</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-semibold text-ink-faint uppercase tracking-widest px-2 pb-2">Navigation</p>
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all duration-150 group',
                active
                  ? 'bg-accent/10 text-accent font-medium'
                  : 'text-ink-muted hover:text-ink hover:bg-surface-muted'
              )}
            >
              <Icon size={15} className={cn('shrink-0', active ? 'text-accent' : 'text-ink-faint group-hover:text-ink-muted')} />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight size={12} className="text-accent/60" />}
            </Link>
          )
        })}

        {isAdmin && (
          <>
            <div className="my-3 border-t border-surface-border" />
            <p className="text-[10px] font-semibold text-ink-faint uppercase tracking-widest px-2 pb-2">Admin</p>
            <Link
              href="/settings"
              className={cn(
                'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all duration-150 group',
                pathname === '/settings'
                  ? 'bg-accent/10 text-accent font-medium'
                  : 'text-ink-muted hover:text-ink hover:bg-surface-muted'
              )}
            >
              <Settings size={15} className="shrink-0 text-ink-faint group-hover:text-ink-muted" />
              Settings
            </Link>
          </>
        )}
      </nav>

      {/* User footer */}
      <div className="px-3 py-3 border-t border-surface-border">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg">
          <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
            <span className="text-accent text-xs font-semibold">
              {(userName || userEmail || 'U')[0].toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-ink truncate">{userName || 'User'}</p>
            <p className="text-[10px] text-ink-faint truncate">{userEmail}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="p-1 rounded text-ink-faint hover:text-red-400 transition-colors"
            title="Sign out"
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </aside>
  )
}
