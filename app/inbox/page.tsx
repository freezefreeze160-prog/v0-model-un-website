"use client"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { useLanguage } from "@/contexts/language-context"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Inbox,
  Calendar,
  Mail,
  Phone,
  FileText,
  CheckCircle,
  XCircle,
  Users,
  Shuffle,
  Home,
  Search,
  Download,
  BarChart3,
} from "lucide-react"
import Link from "next/link"
import { InboxAnalytics } from "@/components/inbox/inbox-analytics"
import { downloadCsv, toCsv } from "@/lib/csv"

interface DelegateApplication {
  id: string
  conference_id: string
  user_id: string
  full_name: string
  email: string
  phone: string
  motivation: string
  status: string
  created_at: string
  assigned_committee_id: string | null
  assigned_country: string | null
  primary_committee: { id: string; name: string; topic: string | null } | null
  secondary_committee: { id: string; name: string; topic: string | null } | null
  tertiary_committee: { id: string; name: string; topic: string | null } | null
}

interface Committee {
  id: string
  name: string
  topic: string | null
  capacity: number
  priority: number
  countries: string[]
}

interface ConferenceWithApplications {
  id: string
  name_ru: string
  name_kk: string
  name_en: string
  date_ru: string
  date_kk: string
  date_en: string
  applications: DelegateApplication[]
  committees: Committee[]
  status: string
  location: string
  registration_fee_amount: number | null
  registration_fee_currency: string | null
  creator_id: string
}

export default function InboxPage() {
  const { t, language } = useLanguage()
  const supabase = createClient()
  const [conferences, setConferences] = useState<ConferenceWithApplications[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Filters + bulk selection
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [conferenceFilter, setConferenceFilter] = useState("all")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [working, setWorking] = useState(false)

  useEffect(() => {
    loadApplications()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadApplications() {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError) {
        setError("auth_error")
        setLoading(false)
        return
      }
      if (!user) {
        setError("not_logged_in")
        setLoading(false)
        return
      }

      setUserId(user.id)

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)
        .single()

      if (profileError) {
        setError("profile_not_found")
        setLoading(false)
        return
      }
      if (!profile || !["general_secretary", "founder", "admin"].includes(profile.role)) {
        setError("access_denied")
        setLoading(false)
        return
      }

      setUserRole(profile.role)

      let conferencesData: any[] = []
      if (profile.role === "founder") {
        const { data } = await supabase.from("user_conferences").select("*").order("created_at", { ascending: false })
        conferencesData = data || []
      } else {
        const { data } = await supabase
          .from("user_conferences")
          .select("*")
          .eq("creator_id", user.id)
          .order("created_at", { ascending: false })
        conferencesData = data || []
      }

      if (conferencesData.length > 0) {
        const conferencesWithApps = await Promise.all(
          conferencesData.map(async (conf) => {
            const { data: committeesData } = await supabase
              .from("conference_committees")
              .select("*")
              .eq("conference_id", conf.id)
              .order("priority", { ascending: true })

            const { data: apps } = await supabase
              .from("delegate_applications")
              .select(
                `
                *,
                primary_committee:conference_committees!delegate_applications_primary_committee_id_fkey(id, name, topic),
                secondary_committee:conference_committees!delegate_applications_secondary_committee_id_fkey(id, name, topic),
                tertiary_committee:conference_committees!delegate_applications_tertiary_committee_id_fkey(id, name, topic)
              `,
              )
              .eq("conference_id", conf.id)
              .order("created_at", { ascending: false })

            return { ...conf, applications: apps || [], committees: committeesData || [] }
          }),
        )
        setConferences(conferencesWithApps)
      }
    } catch (err) {
      console.error("[v0] Error loading applications:", err)
      setError("unknown_error")
    } finally {
      setLoading(false)
    }
  }

  async function runAutoAssignment(conferenceId: string) {
    try {
      const conference = conferences.find((c) => c.id === conferenceId)
      if (!conference) return

      const approvedApps = conference.applications.filter((app) => app.status === "approved")
      const sortedCommittees = [...conference.committees].sort((a, b) => a.priority - b.priority)

      const assignments: { [appId: string]: string } = {}
      const committeeCount: { [committeeId: string]: number } = {}
      const usedCountries: { [committeeId: string]: Set<string> } = {}

      sortedCommittees.forEach((c) => {
        committeeCount[c.id] = 0
        usedCountries[c.id] = new Set()
      })

      for (const app of approvedApps) {
        if (app.primary_committee && committeeCount[app.primary_committee.id] !== undefined) {
          const committee = sortedCommittees.find((c) => c.id === app.primary_committee!.id)
          if (committee && committeeCount[app.primary_committee.id] < committee.capacity) {
            assignments[app.id] = app.primary_committee.id
            committeeCount[app.primary_committee.id]++
          }
        }
      }
      for (const app of approvedApps) {
        if (!assignments[app.id] && app.secondary_committee && committeeCount[app.secondary_committee.id] !== undefined) {
          const committee = sortedCommittees.find((c) => c.id === app.secondary_committee!.id)
          if (committee && committeeCount[app.secondary_committee.id] < committee.capacity) {
            assignments[app.id] = app.secondary_committee.id
            committeeCount[app.secondary_committee.id]++
          }
        }
      }
      for (const app of approvedApps) {
        if (!assignments[app.id] && app.tertiary_committee && committeeCount[app.tertiary_committee.id] !== undefined) {
          const committee = sortedCommittees.find((c) => c.id === app.tertiary_committee!.id)
          if (committee && committeeCount[app.tertiary_committee.id] < committee.capacity) {
            assignments[app.id] = app.tertiary_committee.id
            committeeCount[app.tertiary_committee.id]++
          }
        }
      }

      const countryAssignments: { [appId: string]: string } = {}
      for (const [appId, committeeId] of Object.entries(assignments)) {
        const app = approvedApps.find((a) => a.id === appId)
        if (!app) continue
        if (app.assigned_country) {
          countryAssignments[appId] = app.assigned_country
          usedCountries[committeeId].add(app.assigned_country)
          continue
        }
        const committee = sortedCommittees.find((c) => c.id === committeeId)
        if (!committee || !committee.countries || committee.countries.length === 0) continue
        const availableCountries = committee.countries.filter((country) => !usedCountries[committeeId].has(country))
        if (availableCountries.length > 0) {
          const randomCountry = availableCountries[Math.floor(Math.random() * availableCountries.length)]
          countryAssignments[appId] = randomCountry
          usedCountries[committeeId].add(randomCountry)
        }
      }

      const updates = Object.entries(assignments).map(([appId, committeeId]) => {
        const updateData: any = { assigned_committee_id: committeeId }
        if (countryAssignments[appId]) updateData.assigned_country = countryAssignments[appId]
        return supabase.from("delegate_applications").update(updateData).eq("id", appId)
      })

      await Promise.all(updates)
      alert(t("assignment_complete"))
      await loadApplications()
    } catch (err) {
      console.error("[v0] Error in auto-assignment:", err)
      alert("Error during assignment: " + (err as Error).message)
    }
  }

  async function updateApplicationStatus(applicationId: string, status: string) {
    try {
      const { error } = await supabase.from("delegate_applications").update({ status }).eq("id", applicationId)
      if (error) throw error
      await loadApplications()
    } catch (err) {
      console.error("[v0] Error updating application status:", err)
    }
  }

  async function bulkUpdateStatus(status: string) {
    if (selectedIds.size === 0) return
    setWorking(true)
    try {
      const ids = Array.from(selectedIds)
      const { error } = await supabase.from("delegate_applications").update({ status }).in("id", ids)
      if (error) throw error
      setSelectedIds(new Set())
      await loadApplications()
    } catch (err) {
      console.error("[v0] Error in bulk update:", err)
      alert("Error: " + (err as Error).message)
    } finally {
      setWorking(false)
    }
  }

  async function approveConference(conferenceId: string) {
    try {
      const { error } = await supabase
        .from("user_conferences")
        .update({ status: "published", approved_by: userId, approved_at: new Date().toISOString() })
        .eq("id", conferenceId)
      if (error) throw error
      alert(t("conference_approved"))
      await loadApplications()
    } catch (err) {
      console.error("[v0] Error approving conference:", err)
    }
  }

  async function rejectConference(conferenceId: string) {
    if (!confirm(t("confirm_reject_conference"))) return
    try {
      const { error } = await supabase.from("user_conferences").update({ status: "rejected" }).eq("id", conferenceId)
      if (error) throw error
      alert(t("conference_rejected"))
      await loadApplications()
    } catch (err) {
      console.error("[v0] Error rejecting conference:", err)
    }
  }

  const getConferenceName = (conf: ConferenceWithApplications) =>
    language === "ru" ? conf.name_ru : language === "kk" ? conf.name_kk : conf.name_en

  const publishedConferences = useMemo(
    () => conferences.filter((c) => c.status === "published"),
    [conferences],
  )

  // Flatten applications with conference context for the management list
  const flatApplications = useMemo(() => {
    return publishedConferences.flatMap((conf) =>
      conf.applications.map((app) => ({ app, conf })),
    )
  }, [publishedConferences])

  const filteredApplications = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return flatApplications.filter(({ app, conf }) => {
      if (statusFilter !== "all" && app.status !== statusFilter) return false
      if (conferenceFilter !== "all" && conf.id !== conferenceFilter) return false
      if (q) {
        const haystack = `${app.full_name} ${app.email} ${app.phone}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [flatApplications, searchQuery, statusFilter, conferenceFilter])

  const totalApplications = flatApplications.length
  const pendingApplications = flatApplications.filter(({ app }) => app.status === "pending").length

  function getCommitteeStats(conference: ConferenceWithApplications) {
    const stats: { [committeeId: string]: { assigned: number; capacity: number; name: string } } = {}
    conference.committees.forEach((c) => {
      stats[c.id] = {
        assigned: conference.applications.filter((app) => app.assigned_committee_id === c.id).length,
        capacity: c.capacity,
        name: c.name,
      }
    })
    return stats
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    const visibleIds = filteredApplications.map(({ app }) => app.id)
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id))
    setSelectedIds(allSelected ? new Set() : new Set(visibleIds))
  }

  function exportCsv() {
    const headers = [
      t("full_name"),
      t("email"),
      t("phone"),
      t("conference"),
      t("status"),
      t("primary_choice"),
      t("secondary_choice"),
      t("tertiary_choice"),
      t("assigned_committee"),
      t("assigned_country"),
      t("created_at"),
    ]
    const source = filteredApplications.length > 0 ? filteredApplications : flatApplications
    const rows = source.map(({ app, conf }) => [
      app.full_name,
      app.email,
      app.phone,
      getConferenceName(conf),
      t(app.status),
      app.primary_committee?.name ?? "",
      app.secondary_committee?.name ?? "",
      app.tertiary_committee?.name ?? "",
      conf.committees.find((c) => c.id === app.assigned_committee_id)?.name ?? "",
      app.assigned_country ?? "",
      new Date(app.created_at).toLocaleString(),
    ])
    downloadCsv(`applications-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(headers, rows))
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 py-12">
          <div className="container mx-auto px-4 space-y-4">
            <div className="h-10 w-64 animate-pulse rounded-lg bg-muted" />
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
            <div className="h-64 animate-pulse rounded-xl bg-muted" />
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <p className="text-destructive font-medium">
              {error === "not_logged_in" && t("please_login")}
              {error === "access_denied" && t("access_denied")}
              {error === "profile_not_found" && t("profile_not_found")}
              {error === "auth_error" && t("auth_error")}
              {error === "unknown_error" && t("error_occurred")}
            </p>
            <div className="flex gap-4 justify-center">
              <Button asChild>
                <Link href="/auth/login">{t("login")}</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/">{t("go_to_home")}</Link>
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const pendingConfs = conferences.filter((c) => c.status === "pending")
  const visibleIds = filteredApplications.map(({ app }) => app.id)
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id))

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="mb-8 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
                <Inbox className="w-8 h-8" />
                {t("applications_inbox")}
              </h1>
              <p className="text-muted-foreground">
                {totalApplications} {t("applications")} • {pendingApplications} {t("pending")}
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/">
                <Home className="h-4 w-4 mr-2" />
                {t("go_to_home")}
              </Link>
            </Button>
          </div>

          {/* Pending conference requests (founder) */}
          {userRole === "founder" && pendingConfs.length > 0 && (
            <Card className="mb-6 border-yellow-500/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {t("conference_requests")}
                </CardTitle>
                <CardDescription>{t("pending_conference_requests")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pendingConfs.map((conf) => (
                    <div key={conf.id} className="border rounded-lg p-4 space-y-3">
                      <div>
                        <p className="font-semibold text-lg">{getConferenceName(conf)}</p>
                        <p className="text-sm text-muted-foreground">
                          {(language === "ru" ? conf.date_ru : language === "kk" ? conf.date_kk : conf.date_en)} •{" "}
                          {conf.location}
                        </p>
                        {conf.registration_fee_amount && (
                          <p className="text-sm font-medium text-primary mt-1">
                            {t("registration_fee")}: {conf.registration_fee_amount} {conf.registration_fee_currency}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground mt-1">
                          {t("committees")}: {conf.committees.length}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => approveConference(conf.id)}>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          {t("approve_conference")}
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => rejectConference(conf.id)}>
                          <XCircle className="h-4 w-4 mr-1" />
                          {t("reject_conference")}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {publishedConferences.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Inbox className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">{t("no_applications_inbox")}</p>
                <Button asChild>
                  <Link href="/create-conference">{t("create_conference")}</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="mb-6">
                <TabsTrigger value="overview">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  {t("overview")}
                </TabsTrigger>
                <TabsTrigger value="applications">
                  <Users className="h-4 w-4 mr-2" />
                  {t("applications")}
                </TabsTrigger>
                <TabsTrigger value="committees">
                  <FileText className="h-4 w-4 mr-2" />
                  {t("committees")}
                </TabsTrigger>
              </TabsList>

              {/* Overview: analytics */}
              <TabsContent value="overview">
                <InboxAnalytics conferences={conferences} />
              </TabsContent>

              {/* Applications: filters + bulk + list */}
              <TabsContent value="applications" className="space-y-4">
                <Card>
                  <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder={t("search_applications")}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full md:w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("all_statuses")}</SelectItem>
                        <SelectItem value="pending">{t("pending")}</SelectItem>
                        <SelectItem value="approved">{t("approved")}</SelectItem>
                        <SelectItem value="rejected">{t("rejected")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={conferenceFilter} onValueChange={setConferenceFilter}>
                      <SelectTrigger className="w-full md:w-56">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("all_conferences")}</SelectItem>
                        {publishedConferences.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {getConferenceName(c)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={exportCsv}>
                      <Download className="h-4 w-4 mr-2" />
                      {t("export_csv")}
                    </Button>
                  </CardContent>
                </Card>

                {/* Bulk action bar */}
                <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-muted/40 px-4 py-3">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={allVisibleSelected} onCheckedChange={toggleSelectAll} />
                    {t("select_all")}
                  </label>
                  <span className="text-sm text-muted-foreground">
                    {selectedIds.size} {t("selected")}
                  </span>
                  <div className="ml-auto flex gap-2">
                    <Button
                      size="sm"
                      disabled={selectedIds.size === 0 || working}
                      onClick={() => bulkUpdateStatus("approved")}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      {t("approve_selected")}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={selectedIds.size === 0 || working}
                      onClick={() => bulkUpdateStatus("rejected")}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      {t("reject_selected")}
                    </Button>
                  </div>
                </div>

                {filteredApplications.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">{t("no_applications")}</CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {filteredApplications.map(({ app, conf }) => (
                      <Card key={app.id} className={selectedIds.has(app.id) ? "border-primary" : undefined}>
                        <CardContent className="p-5">
                          <div className="flex gap-4">
                            <Checkbox
                              className="mt-1"
                              checked={selectedIds.has(app.id)}
                              onCheckedChange={() => toggleSelect(app.id)}
                            />
                            <div className="flex-1 space-y-3">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <h4 className="text-lg font-semibold">{app.full_name}</h4>
                                  <p className="text-xs text-muted-foreground">{getConferenceName(conf)}</p>
                                  <div className="mt-2 space-y-1">
                                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                                      <Mail className="w-4 h-4" />
                                      {app.email}
                                    </p>
                                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                                      <Phone className="w-4 h-4" />
                                      {app.phone}
                                    </p>
                                  </div>
                                </div>
                                <Badge
                                  variant={
                                    app.status === "approved"
                                      ? "default"
                                      : app.status === "rejected"
                                        ? "destructive"
                                        : "secondary"
                                  }
                                >
                                  {t(app.status)}
                                </Badge>
                              </div>

                              <div className="grid grid-cols-3 gap-2 text-sm">
                                <div>
                                  <p className="font-medium text-xs text-muted-foreground">{t("primary_choice")}</p>
                                  <p>{app.primary_committee?.name || "-"}</p>
                                </div>
                                <div>
                                  <p className="font-medium text-xs text-muted-foreground">{t("secondary_choice")}</p>
                                  <p>{app.secondary_committee?.name || "-"}</p>
                                </div>
                                <div>
                                  <p className="font-medium text-xs text-muted-foreground">{t("tertiary_choice")}</p>
                                  <p>{app.tertiary_committee?.name || "-"}</p>
                                </div>
                              </div>

                              {app.assigned_committee_id && (
                                <div className="p-3 bg-primary/10 rounded-lg">
                                  <p className="text-sm">
                                    <span className="font-medium">{t("assigned_committee")}:</span>{" "}
                                    {conf.committees.find((c) => c.id === app.assigned_committee_id)?.name}
                                  </p>
                                  {app.assigned_country && (
                                    <p className="text-sm">
                                      <span className="font-medium">{t("assigned_country")}:</span> {app.assigned_country}
                                    </p>
                                  )}
                                </div>
                              )}

                              {app.motivation && (
                                <div>
                                  <p className="font-medium text-sm">{t("motivation")}:</p>
                                  <p className="text-sm text-muted-foreground">{app.motivation}</p>
                                </div>
                              )}

                              {app.status === "pending" && (
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={() => updateApplicationStatus(app.id, "approved")}>
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    {t("approve")}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => updateApplicationStatus(app.id, "rejected")}
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    {t("reject")}
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Committees: per-conference stats + auto assign */}
              <TabsContent value="committees" className="space-y-6">
                {publishedConferences.map((conf) => (
                  <Card key={conf.id}>
                    <CardHeader>
                      <CardTitle className="text-xl">{getConferenceName(conf)}</CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {language === "ru" ? conf.date_ru : language === "kk" ? conf.date_kk : conf.date_en}
                        <span className="ml-2">
                          • {conf.applications.length} {t("applications")}
                        </span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {conf.committees.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t("no_data")}</p>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold flex items-center gap-2">
                              <Users className="w-4 h-4" />
                              {t("committee_stats")}
                            </h4>
                            <Button size="sm" variant="outline" onClick={() => runAutoAssignment(conf.id)}>
                              <Shuffle className="w-4 h-4 mr-2" />
                              {t("run_auto_assign")}
                            </Button>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                            {Object.entries(getCommitteeStats(conf)).map(([committeeId, stats]) => {
                              const pct = stats.capacity > 0 ? Math.round((stats.assigned / stats.capacity) * 100) : 0
                              return (
                                <div key={committeeId} className="rounded-lg border p-3">
                                  <p className="font-medium text-sm truncate">{stats.name}</p>
                                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                                    <div
                                      className="h-full rounded-full bg-primary transition-all"
                                      style={{ width: `${Math.min(pct, 100)}%` }}
                                    />
                                  </div>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {stats.assigned}/{stats.capacity} {t("filled")} ({pct}%)
                                  </p>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
