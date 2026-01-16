"use client"

import { useState, useEffect } from "react"
import { useLanguage } from "@/contexts/language-context"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { RoleBadge } from "@/components/role-badge"
import { Search } from "lucide-react"
import { REGIONS } from "@/lib/roles"

interface Profile {
  id: string
  user_id: string
  full_name: string
  bio: string | null
  photo_url: string | null
  role: string
  school_id: number | null
  phone: string | null
}

const ROLE_OPTIONS = [
  { value: "participant", label: { ru: "Участник", kk: "Қатысушы", en: "Participant" } },
  { value: "deputy", label: { ru: "Заместитель", kk: "Орынбасар", en: "Deputy" } },
  { value: "general_secretary", label: { ru: "Генеральный секретарь", kk: "Бас хатшы", en: "General Secretary" } },
  { value: "admin", label: { ru: "Администратор", kk: "Әкімші", en: "Admin" } },
  { value: "founder", label: { ru: "Основатель", kk: "Құрушы", en: "Founder" } },
]

export default function AdminPanel() {
  const { t, language } = useLanguage()
  const [users, setUsers] = useState<Profile[]>([])
  const [filteredUsers, setFilteredUsers] = useState<Profile[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadUsers()
  }, [])

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredUsers(users)
    } else {
      const query = searchQuery.toLowerCase()
      setFilteredUsers(
        users.filter(
          (user) =>
            user.full_name.toLowerCase().includes(query) ||
            user.bio?.toLowerCase().includes(query) ||
            user.phone?.toLowerCase().includes(query),
        ),
      )
    }
  }, [searchQuery, users])

  async function loadUsers() {
    setLoading(true)
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })

      if (profilesError) throw profilesError

      setUsers(profiles || [])
      setFilteredUsers(profiles || [])
    } catch (error) {
      console.error("[v0] Error loading users:", error)
    } finally {
      setLoading(false)
    }
  }

  async function updateUserRole(userId: string, newRole: string) {
    try {
      const { error } = await supabase.from("profiles").update({ role: newRole }).eq("user_id", userId)

      if (error) throw error

      alert(t("user_updated"))
      loadUsers()
    } catch (error) {
      console.error("[v0] Error updating user role:", error)
      alert("Error updating user")
    }
  }

  async function updateUserRegion(userId: string, newRegion: number) {
    try {
      const { error } = await supabase.from("profiles").update({ school_id: newRegion }).eq("user_id", userId)

      if (error) throw error

      alert(t("user_updated"))
      loadUsers()
    } catch (error) {
      console.error("[v0] Error updating user region:", error)
      alert("Error updating user")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">{t("loading")}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder={t("search_users")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Users List */}
      <div className="space-y-4">
        {filteredUsers.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">{t("no_users_found")}</p>
          </Card>
        ) : (
          filteredUsers.map((user) => (
            <Card key={user.id} className="p-6">
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={user.photo_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-lg">
                    {user.full_name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-lg">{user.full_name}</h3>
                    <RoleBadge role={user.role} region={user.school_id} />
                  </div>
                  {user.bio && <p className="text-sm text-muted-foreground line-clamp-2">{user.bio}</p>}
                  {user.phone && <p className="text-sm text-muted-foreground mt-1">📞 {user.phone}</p>}
                </div>

                <div className="flex flex-col gap-2 min-w-[220px]">
                  <Select value={user.role} onValueChange={(value) => updateUserRole(user.user_id, value)}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("select_role")} />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label[language as keyof typeof role.label]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={user.school_id?.toString() || ""}
                    onValueChange={(value) => updateUserRegion(user.user_id, Number.parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("region")} />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(REGIONS).map(([regionNum, cityNames]) => (
                        <SelectItem key={regionNum} value={regionNum}>
                          {cityNames[language as keyof typeof cityNames]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
