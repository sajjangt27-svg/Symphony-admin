import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }
export function formatCurrency(cents: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(cents / 100)
}
export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })
}
export function formatTime(date: string | Date) {
  return new Date(date).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
}
