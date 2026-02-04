import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  return createBrowserClient(process.env.https://vodtmdduljajlgybzxep.supabase.co!, process.env.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvZHRtZGR1bGphamxneWJ6eGVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3NDk4MDksImV4cCI6MjA3NTMyNTgwOX0.eIm4LxJGDGZQhQwWNrPtkOiSfnhT6mGKzITznJa9zvY!)
}

export { createClient as createBrowserClient }
