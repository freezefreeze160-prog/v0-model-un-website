"use client"

import { useState, useEffect } from "react"
import { useLanguage } from "@/contexts/language-context"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { regions, getRoleBadgeColor, getRoleLabel, type UserProfile } from "@/lib/roles"
import Link from "next/link"

export default function SecretariatPage() {
  const { t, language } = useLanguage()
  const [selectedRegion, setSelectedRegion] = useState<number>(2) // Default to Astana
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchProfiles = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("region", selectedRegion)
        .in("role", ["general_secretary", "deputy"])
        .order("role", { ascending: true })

      if (data && !error) {
        setProfiles(data)
      } else {
        setProfiles([])
      }
      setLoading(false)
    }

    fetchProfiles()
  }, [selectedRegion, supabase])

  const regionOptions = Object.entries(regions).map(([key, value]) => ({
    value: Number(key),
    label: value[language],
  }))

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          <h1 className="text-4xl font-bold mb-8 text-center text-foreground">{t("secretariat_title")}</h1>

          <Card className="mb-8">
            <CardContent className="p-8">
              <p className="text-lg leading-relaxed text-foreground mb-6">{t("secretariat_desc")}</p>

              <div className="flex flex-col gap-2">
                <label htmlFor="region-select" className="text-sm font-medium text-foreground">
                  {t("select_city")}
                </label>
                <Select value={selectedRegion.toString()} onValueChange={(value) => setSelectedRegion(Number(value))}>
                  <SelectTrigger id="region-select" className="w-full md:w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {regionOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value.toString()}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">{t("loading")}</p>
            </div>
          ) : profiles.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Пока нет секретариата для этого города</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {profiles.map((profile) => (
                <Link key={profile.id} href={`/profile/${profile.user_id}`}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                    <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                      <Avatar className="h-32 w-32">
                        <AvatarImage src={profile.photo_url || undefined} alt={profile.full_name} />
                        <AvatarFallback className="bg-[#0055aa] text-white text-3xl">
                          {profile.full_name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-2">
                        <h3 className="font-bold text-xl text-foreground">{profile.full_name}</h3>
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(profile.role)}`}
                        >
                          {getRoleLabel(profile.role, language)}
                        </span>
                        {profile.bio && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-2">{profile.bio}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
