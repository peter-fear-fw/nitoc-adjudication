import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const ROUND_OPTIONS = [
  'Round 1', 'Round 2', 'Round 3', 'Round 4', 'Round 5', 'Round 6',
  'Outround 1', 'Outround 2', 'Outround 3', 'Outround 4', 'Outround 5', 'Outround 6',
  'Quarterfinals', 'Semifinals', 'Finals',
]

export const EVENT_OPTIONS = ['LD', 'TP', 'Parli'] as const

export function formatDateTime(dateString: string): string {
  return format(new Date(dateString), 'MMM d, yyyy h:mm a')
}

export function formatDate(dateString: string): string {
  return format(new Date(dateString), 'MMM d, yyyy')
}

export function getInitials(name: string | null | undefined, email: string): string {
  if (name) {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
  return email.slice(0, 2).toUpperCase()
}

export function displayName(profile: { full_name: string | null; email: string } | undefined): string {
  if (!profile) return 'Unknown'
  return profile.full_name || profile.email
}
