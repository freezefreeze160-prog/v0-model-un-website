"use client"

import { useState, useEffect } from "react"
import { useLanguage } from "@/contexts/language-context"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { createClient } from "@/lib/supabase/client"
import type { UserProfile } from "@/lib/roles"
import Link from "next/link"

export default function SecretariatPage() {
  const { t, language } = useLanguage()
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchProfiles = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("is_team_member", true)
        .order("created_at", { ascending: true })

      if (data && !error) {
        setProfiles(data)
      } else {
        setProfiles([])
      }
      setLoading(false)
    }

    fetchProfiles()
  }, [supabase])

  // Group team members by section
  const getTeamSection = (teamRole: string | null | undefined): string => {
    if (!teamRole) return "other"
    const role = teamRole.toLowerCase()
    if (role.includes("founder")) return "founders"
    if (role.includes("content")) return "content"
    if (role.includes("design")) return "designers"
    if (role.includes("partnership")) return "partnership"
    return "other"
  }

  const teamSections = {
    founders: profiles.filter(p => getTeamSection(p.team_role) === "founders"),
    content: profiles.filter(p => getTeamSection(p.team_role) === "content"),
    designers: profiles.filter(p => getTeamSection(p.team_role) === "designers"),
    partnership: profiles.filter(p => getTeamSection(p.team_role) === "partnership"),
    other: profiles.filter(p => getTeamSection(p.team_role) === "other"),
  }

  const renderTeamSection = (title: string, members: UserProfile[]) => {
    if (members.length === 0) return null
    return (
      <div key={title} className="mb-12">
        <h2 className="text-3xl font-bold mb-6 text-foreground">{title}</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {members.map((profile) => (
            <Link key={profile.id} href={`/profile/${profile.user_id}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                  <Avatar className="h-32 w-32">
                    <AvatarImage src={profile.photo_url || undefined} alt={profile.full_name} />
                    <AvatarFallback className="bg-primary text-white text-3xl">
                      {profile.full_name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <h3 className="font-bold text-xl text-foreground">{profile.full_name}</h3>
                    {profile.team_role && (
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-primary text-primary-foreground">
                        {profile.team_role}
                      </span>
                    )}
                    {profile.bio && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-2">{profile.bio}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          <h1 className="text-4xl font-bold mb-8 text-center text-foreground">{t("secretariat_title")}</h1>

          <Card className="mb-8">
            <CardContent className="p-8">
              <p className="text-lg leading-relaxed text-foreground text-center">{t("secretariat_desc")}</p>
            </CardContent>
          </Card>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">{t("loading")}</p>
            </div>
          ) : profiles.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">{t("no_secretariat_for_city")}</p>
            </div>
          ) : (
            <div>
              {renderTeamSection(t("team_founders"), teamSections.founders)}
              {renderTeamSection(t("team_content_managers"), teamSections.content)}
              {renderTeamSection(t("team_designers"), teamSections.designers)}
              {renderTeamSection(t("team_partnership_managers"), teamSections.partnership)}
              {teamSections.other.length > 0 && renderTeamSection(t("team_other"), teamSections.other)}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
