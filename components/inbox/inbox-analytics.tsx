"use client"

import { useMemo } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { useLanguage } from "@/contexts/language-context"
import { FileText, Clock, CheckCircle2, XCircle, CalendarDays, Gauge } from "lucide-react"

export interface AnalyticsApplication {
  id: string
  status: string
  created_at: string
  assigned_committee_id: string | null
  primary_committee: { id: string; name: string } | null
}

export interface AnalyticsCommittee {
  id: string
  name: string
  capacity: number
}

export interface AnalyticsConference {
  id: string
  name_ru: string
  name_kk: string
  name_en: string
  status: string
  applications: AnalyticsApplication[]
  committees: AnalyticsCommittee[]
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  accent?: string
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${accent ?? "bg-primary/10 text-primary"}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold leading-none tabular-nums">{value}</p>
          <p className="mt-1 truncate text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export function InboxAnalytics({ conferences }: { conferences: AnalyticsConference[] }) {
  const { t, language } = useLanguage()

  const confName = (c: AnalyticsConference) =>
    language === "ru" ? c.name_ru : language === "kk" ? c.name_kk : c.name_en

  const allApps = useMemo(() => conferences.flatMap((c) => c.applications), [conferences])

  const totals = useMemo(() => {
    const pending = allApps.filter((a) => a.status === "pending").length
    const approved = allApps.filter((a) => a.status === "approved").length
    const rejected = allApps.filter((a) => a.status === "rejected").length
    const publishedConfs = conferences.filter((c) => c.status === "published").length

    let capacity = 0
    let assigned = 0
    conferences.forEach((c) => {
      c.committees.forEach((cm) => {
        capacity += cm.capacity || 0
      })
      assigned += c.applications.filter((a) => a.assigned_committee_id).length
    })
    const fillRate = capacity > 0 ? Math.round((assigned / capacity) * 100) : 0

    return { total: allApps.length, pending, approved, rejected, publishedConfs, fillRate }
  }, [allApps, conferences])

  // Applications by status (donut)
  const statusData = useMemo(
    () => [
      { key: "pending", label: t("pending"), value: totals.pending, fill: "var(--color-pending)" },
      { key: "approved", label: t("approved"), value: totals.approved, fill: "var(--color-approved)" },
      { key: "rejected", label: t("rejected"), value: totals.rejected, fill: "var(--color-rejected)" },
    ],
    [totals, t],
  )

  const statusConfig: ChartConfig = {
    value: { label: t("applications") },
    pending: { label: t("pending"), color: "var(--chart-3)" },
    approved: { label: t("approved"), color: "var(--chart-1)" },
    rejected: { label: t("rejected"), color: "var(--destructive)" },
  }

  // Applications over time (area, by day)
  const timeData = useMemo(() => {
    const byDay = new Map<string, number>()
    allApps.forEach((a) => {
      const d = new Date(a.created_at)
      if (Number.isNaN(d.getTime())) return
      const key = d.toISOString().slice(0, 10)
      byDay.set(key, (byDay.get(key) ?? 0) + 1)
    })
    return Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({
        date,
        label: new Date(date).toLocaleDateString(language === "en" ? "en-US" : "ru-RU", {
          month: "short",
          day: "numeric",
        }),
        count,
      }))
  }, [allApps, language])

  const timeConfig: ChartConfig = {
    count: { label: t("applications"), color: "var(--chart-1)" },
  }

  // Applications per conference (bar)
  const perConferenceData = useMemo(
    () =>
      conferences
        .filter((c) => c.status === "published")
        .map((c) => ({ name: confName(c), value: c.applications.length }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [conferences, language],
  )

  const perConferenceConfig: ChartConfig = {
    value: { label: t("applications"), color: "var(--chart-2)" },
  }

  // Committee popularity by primary choice (bar)
  const committeePopularity = useMemo(() => {
    const counts = new Map<string, number>()
    allApps.forEach((a) => {
      if (a.primary_committee?.name) {
        counts.set(a.primary_committee.name, (counts.get(a.primary_committee.name) ?? 0) + 1)
      }
    })
    return Array.from(counts.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [allApps])

  const popularityConfig: ChartConfig = {
    value: { label: t("first_choice"), color: "var(--chart-4)" },
  }

  if (allApps.length === 0) return null

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <StatCard label={t("total_applications")} value={totals.total} icon={FileText} />
        <StatCard
          label={t("pending")}
          value={totals.pending}
          icon={Clock}
          accent="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
        />
        <StatCard
          label={t("approved")}
          value={totals.approved}
          icon={CheckCircle2}
          accent="bg-primary/10 text-primary"
        />
        <StatCard
          label={t("rejected")}
          value={totals.rejected}
          icon={XCircle}
          accent="bg-destructive/10 text-destructive"
        />
        <StatCard label={t("published_conferences")} value={totals.publishedConfs} icon={CalendarDays} />
        <StatCard
          label={t("overall_fill_rate")}
          value={`${totals.fillRate}%`}
          icon={Gauge}
          accent="bg-chart-2/10 text-[var(--chart-2)]"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("applications_by_status")}</CardTitle>
            <CardDescription>{t("applications_by_status_desc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={statusConfig} className="mx-auto aspect-square max-h-[260px]">
              <PieChart>
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Pie data={statusData} dataKey="value" nameKey="label" innerRadius={60} strokeWidth={4}>
                  {statusData.map((entry) => (
                    <Cell key={entry.key} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartLegend content={<ChartLegendContent nameKey="label" />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("applications_over_time")}</CardTitle>
            <CardDescription>{t("applications_over_time_desc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={timeConfig} className="aspect-video max-h-[260px] w-full">
              <AreaChart data={timeData} margin={{ left: 4, right: 12, top: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <Area
                  dataKey="count"
                  type="monotone"
                  fill="var(--color-count)"
                  fillOpacity={0.2}
                  stroke="var(--color-count)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("applications_per_conference")}</CardTitle>
            <CardDescription>{t("applications_per_conference_desc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={perConferenceConfig} className="aspect-video max-h-[260px] w-full">
              <BarChart data={perConferenceData} layout="vertical" margin={{ left: 8, right: 12 }}>
                <XAxis type="number" allowDecimals={false} hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  width={120}
                  tick={{ fontSize: 11 }}
                />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <Bar dataKey="value" fill="var(--color-value)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("popular_committees")}</CardTitle>
            <CardDescription>{t("popular_committees_desc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {committeePopularity.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">{t("no_data")}</p>
            ) : (
              <ChartContainer config={popularityConfig} className="aspect-video max-h-[260px] w-full">
                <BarChart data={committeePopularity} layout="vertical" margin={{ left: 8, right: 12 }}>
                  <XAxis type="number" allowDecimals={false} hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    width={120}
                    tick={{ fontSize: 11 }}
                  />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                  <Bar dataKey="value" fill="var(--color-value)" radius={4} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
