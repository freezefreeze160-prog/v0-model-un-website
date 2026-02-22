"use client"

import Link from "next/link"
import { useLanguage } from "@/contexts/language-context"
import { useTheme } from "@/contexts/theme-context"
import { Button } from "@/components/ui/button"
import { Globe, User, Search, Shield, Moon, Sun, Inbox } from "lucide-react"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User as SupabaseUser } from "@supabase/supabase-js"

export function Header() {
  const { language, setLanguage, t } = useLanguage()
  const { theme, toggleTheme } = useTheme()
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [isFounder, setIsFounder] = useState(false)
  const [canManageConferences, setCanManageConferences] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser()

        if (error) {
          // Clear stale/invalid session
          await supabase.auth.signOut()
          setUser(null)
          setIsFounder(false)
          setCanManageConferences(false)
          return
        }

        setUser(user)
        if (user?.email === "speed_777_speed@mail.ru") {
          setIsFounder(true)
          setCanManageConferences(true)
        }

        if (user) {
          const { data: profileData } = await supabase.from("profiles").select("role").eq("user_id", user.id).single()

          if (profileData?.role === "general_secretary" || profileData?.role === "admin") {
            setCanManageConferences(true)
          }
        }
      } catch {
        // Network or other error - clear session
        await supabase.auth.signOut()
        setUser(null)
        setIsFounder(false)
        setCanManageConferences(false)
      }
    }
    getUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user?.email === "speed_777_speed@mail.ru") {
        setIsFounder(true)
        setCanManageConferences(true)
      } else {
        setIsFounder(false)

        if (session?.user) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("role")
            .eq("user_id", session.user.id)
            .single()

          if (profileData?.role === "general_secretary" || profileData?.role === "admin") {
            setCanManageConferences(true)
          } else {
            setCanManageConferences(false)
          }
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  return (
    <header className="bg-background border-b border-border sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <Globe className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">MUNX NIS</h1>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-foreground hover:text-primary font-medium transition-colors">
              {t("home")}
            </Link>
            <Link href="/about" className="text-foreground hover:text-primary font-medium transition-colors">
              {t("about")}
            </Link>
            <Link href="/secretariat" className="text-foreground hover:text-primary font-medium transition-colors">
              {t("secretariat")}
            </Link>
            <Link href="/news" className="text-foreground hover:text-primary font-medium transition-colors">
              {t("news")}
            </Link>
            <Link href="/register" className="text-foreground hover:text-primary font-medium transition-colors">
              {t("register")}
            </Link>
            <Link href="/search" className="text-foreground hover:text-primary font-medium transition-colors">
              <Search className="w-4 h-4 inline mr-1" />
              {t("search_users")}
            </Link>
            {canManageConferences && (
              <Link href="/inbox" className="text-foreground hover:text-primary font-medium transition-colors">
                <Inbox className="w-4 h-4 inline mr-1" />
                {t("inbox")}
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-2">
            <Button onClick={toggleTheme} variant="ghost" size="sm" className="mr-2">
              {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>

            {user ? (
              <>
                {isFounder && (
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="mr-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 hover:from-yellow-600 hover:to-orange-600"
                  >
                    <Link href="/admin">
                      <Shield className="w-4 h-4 mr-2" />
                      {t("admin_panel")}
                    </Link>
                  </Button>
                )}
                <Button asChild variant="outline" size="sm" className="mr-2 bg-transparent">
                  <Link href="/dashboard">
                    <User className="w-4 h-4 mr-2" />
                    {t("dashboard")}
                  </Link>
                </Button>
              </>
            ) : (
              <Button asChild variant="outline" size="sm" className="mr-2 bg-transparent">
                <Link href="/auth/login">{t("login")}</Link>
              </Button>
            )}
            <Button
              size="sm"
              variant={language === "ru" ? "default" : "ghost"}
              onClick={() => setLanguage("ru")}
              className="font-medium"
            >
              RU
            </Button>
            <Button
              size="sm"
              variant={language === "kk" ? "default" : "ghost"}
              onClick={() => setLanguage("kk")}
              className="font-medium"
            >
              ҚАЗ
            </Button>
            <Button
              size="sm"
              variant={language === "en" ? "default" : "ghost"}
              onClick={() => setLanguage("en")}
              className="font-medium"
            >
              EN
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <nav className="md:hidden flex flex-wrap gap-3 mt-4 pt-4 border-t border-border">
          <Link href="/" className="text-sm text-foreground hover:text-primary font-medium transition-colors">
            {t("home")}
          </Link>
          <Link href="/about" className="text-sm text-foreground hover:text-primary font-medium transition-colors">
            {t("about")}
          </Link>
          <Link
            href="/secretariat"
            className="text-sm text-foreground hover:text-primary font-medium transition-colors"
          >
            {t("secretariat")}
          </Link>
          <Link href="/news" className="text-sm text-foreground hover:text-primary font-medium transition-colors">
            {t("news")}
          </Link>
          <Link href="/register" className="text-sm text-foreground hover:text-primary font-medium transition-colors">
            {t("register")}
          </Link>
          {user ? (
            <>
              {isFounder && (
                <Link
                  href="/admin"
                  className="text-sm text-foreground hover:text-primary font-medium transition-colors"
                >
                  {t("admin_panel")}
                </Link>
              )}
              <Link
                href="/dashboard"
                className="text-sm text-foreground hover:text-primary font-medium transition-colors"
              >
                {t("dashboard")}
              </Link>
            </>
          ) : (
            <Link
              href="/auth/login"
              className="text-sm text-foreground hover:text-primary font-medium transition-colors"
            >
              {t("login")}
            </Link>
          )}
          <Link href="/search" className="text-sm text-foreground hover:text-primary font-medium transition-colors">
            <Search className="w-4 h-4 inline mr-1" />
            {t("search_users")}
          </Link>
          {canManageConferences && (
            <Link href="/inbox" className="text-sm text-foreground hover:text-primary font-medium transition-colors">
              <Inbox className="w-4 h-4 inline mr-1" />
              {t("inbox")}
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
