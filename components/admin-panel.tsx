"use client"

import { useState, useEffect } from "react"
import { useLanguage } from "@/contexts/language-context"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { RoleBadge } from "@/components/role-badge"
import { Search, Trash2, Check, X } from "lucide-react"
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
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
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
    setUpdatingUserId(userId)
    try {
      // Use SECURITY DEFINER function to bypass RLS
      const { data, error } = await supabase.rpc('admin_update_user_role', {
        target_user_id: userId,
        new_role: newRole
      })

      if (error) {
        console.error("[v0] Role update error:", error)
        alert(`Error: ${error.message}`)
        return
      }

      if (data === false) {
        alert("Permission denied - only founder can change roles")
        return
      }

      // Update local state immediately
      setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, role: newRole } : u))
      setFilteredUsers(prev => prev.map(u => u.user_id === userId ? { ...u, role: newRole } : u))
    } catch (error) {
      console.error("[v0] Error updating user role:", error)
      alert("Error updating user")
    } finally {
      setUpdatingUserId(null)
    }
  }

  async function updateUserRegion(userId: string, newRegion: number) {
    setUpdatingUserId(userId)
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ school_id: newRegion, updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .select()

      if (error) {
        console.error("[v0] Region update error:", error)
        alert(`Error: ${error.message}`)
        return
      }

      // Update local state immediately
      setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, school_id: newRegion } : u))
      setFilteredUsers(prev => prev.map(u => u.user_id === userId ? { ...u, school_id: newRegion } : u))
    } catch (error) {
      console.error("[v0] Error updating user region:", error)
      alert("Error updating user")
    } finally {
      setUpdatingUserId(null)
    }
  }

  async function deleteUser(userId: string) {
    setDeletingUserId(userId)
    try {
      // Use SECURITY DEFINER function to bypass RLS
      const { data, error } = await supabase.rpc('admin_delete_user', {
        target_user_id: userId
      })

      if (error) {
        console.error("[v0] Delete error:", error)
        alert(`Error: ${error.message}`)
        return
      }

      if (data === false) {
        alert("Permission denied - only founder can delete users")
        return
      }

      // Remove from local state
      setUsers(prev => prev.filter(u => u.user_id !== userId))
      setFilteredUsers(prev => prev.filter(u => u.user_id !== userId))
      setConfirmDelete(null)
    } catch (error) {
      console.error("[v0] Error deleting user:", error)
      alert("Error deleting user")
    } finally {
      setDeletingUserId(null)
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
                  <Select 
                    value={user.role} 
                    onValueChange={(value) => updateUserRole(user.user_id, value)}
                    disabled={updatingUserId === user.user_id}
                  >
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
                    disabled={updatingUserId === user.user_id}
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

                  {confirmDelete === user.user_id ? (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteUser(user.user_id)}
                        disabled={deletingUserId === user.user_id}
                        className="flex-1"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        {deletingUserId === user.user_id ? "..." : t("confirm")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setConfirmDelete(null)}
                        className="flex-1"
                      >
                        <X className="h-4 w-4 mr-1" />
                        {t("cancel")}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setConfirmDelete(user.user_id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t("delete_user")}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
