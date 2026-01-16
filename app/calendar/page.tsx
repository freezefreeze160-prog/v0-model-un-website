"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { useLanguage } from "@/contexts/language-context"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CalendarIcon, MapPin, Clock, ArrowRight } from "lucide-react"
import Link from "next/link"

interface Conference {
  id: string
  name_ru: string
  name_kk: string
  name_en: string
  date_ru: string
  date_kk: string
  date_en: string
  time: string
  location: string
  city: string
  created_at: string
}

export default function CalendarPage() {
  const { t, language } = useLanguage()
  const supabase = createBrowserClient()
  const [conferences, setConferences] = useState<Conference[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadConferences()
  }, [])

  async function loadConferences() {
    try {
      const { data, error } = await supabase
        .from("user_conferences")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error

      // Filter conferences for next 3 months
      const now = new Date()
      const threeMonthsFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)

      const filtered = (data || []).filter((conf) => {
        const dateMatch = conf.date_ru?.match(/(\d+)[-–](\d+)\s+(\w+)\s+(\d{4})/)
        if (dateMatch) {
          const [, , endDay, month, year] = dateMatch
          const monthMap: { [key: string]: number } = {
            января: 0,
            февраля: 1,
            марта: 2,
            апреля: 3,
            мая: 4,
            июня: 5,
            июля: 6,
            августа: 7,
            сентября: 8,
            октября: 9,
            ноября: 10,
            декабря: 11,
          }
          const monthNum = monthMap[month.toLowerCase()]
          if (monthNum !== undefined) {
            const confDate = new Date(Number.parseInt(year), monthNum, Number.parseInt(endDay))
            return confDate >= now && confDate <= threeMonthsFromNow
          }
        }
        return true
      })

      setConferences(filtered)
    } catch (error) {
      console.error("[v0] Error loading conferences:", error)
    } finally {
      setLoading(false)
    }
  }

  function getConferenceName(conf: Conference) {
    return language === "ru" ? conf.name_ru : language === "kk" ? conf.name_kk : conf.name_en
  }

  function getConferenceDate(conf: Conference) {
    return language === "ru" ? conf.date_ru : language === "kk" ? conf.date_kk : conf.date_en
  }

  function getDaysUntilConference(conf: Conference): number | null {
    const dateMatch = conf.date_ru?.match(/(\d+)[-–](\d+)\s+(\w+)\s+(\d{4})/)
    if (dateMatch) {
      const [, startDay, , month, year] = dateMatch
      const monthMap: { [key: string]: number } = {
        января: 0,
        февраля: 1,
        марта: 2,
        апреля: 3,
        мая: 4,
        июня: 5,
        июля: 6,
        августа: 7,
        сентября: 8,
        октября: 9,
        ноября: 10,
        декабря: 11,
      }
      const monthNum = monthMap[month.toLowerCase()]
      if (monthNum !== undefined) {
        const confDate = new Date(Number.parseInt(year), monthNum, Number.parseInt(startDay))
        const now = new Date()
        const diffTime = confDate.getTime() - now.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        return diffDays > 0 ? diffDays : null
      }
    }
    return null
  }

  function isUpcoming(conf: Conference): boolean {
    const daysLeft = getDaysUntilConference(conf)
    return daysLeft !== null && daysLeft <= 14
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">{t("calendar_view")}</h1>
            <p className="text-muted-foreground">{t("next_3_months")}</p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">{t("loading")}</p>
            </div>
          ) : conferences.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">{t("no_conferences")}</p>
                <Button asChild>
                  <Link href="/conferences">{t("view_all_conferences")}</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {conferences.map((conf) => {
                const daysLeft = getDaysUntilConference(conf)
                const upcoming = isUpcoming(conf)

                return (
                  <Card key={conf.id} className={upcoming ? "border-2 border-orange-500" : ""}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <CardTitle className="text-2xl flex items-center gap-2">
                            {getConferenceName(conf)}
                            {upcoming && (
                              <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
                                {t("upcoming_soon")}
                              </span>
                            )}
                          </CardTitle>
                          <CardDescription className="space-y-2 mt-2">
                            <div className="flex items-center gap-2 text-sm">
                              <CalendarIcon className="w-4 h-4" />
                              {getConferenceDate(conf)}
                              {daysLeft !== null && (
                                <span className="text-orange-600 font-medium">
                                  ({daysLeft} {t("days_left")})
                                </span>
                              )}
                            </div>
                            {conf.time && (
                              <div className="flex items-center gap-2 text-sm">
                                <Clock className="w-4 h-4" />
                                {conf.time}
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="w-4 h-4" />
                              {conf.location}
                            </div>
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2">
                        <Button asChild className="bg-[#006633] hover:bg-[#004d26]">
                          <Link href={`/conferences/${conf.id}/apply`}>{t("apply_to_conference")}</Link>
                        </Button>
                        <Button asChild variant="outline">
                          <Link href={`/conferences/${conf.id}`}>
                            {t("learn_more")}
                            <ArrowRight className="ml-2 w-4 h-4" />
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
