"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useLanguage } from "@/contexts/language-context"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { Info, Calendar, MapPin, AlertCircle } from "lucide-react"

interface Conference {
  id: string
  name_ru: string
  name_kk: string
  name_en: string
  date_ru: string
  date_kk: string
  date_en: string
  location: string
  city: string
  created_at: string
  registration_open: boolean
}

interface Committee {
  id: string
  name: string
  topic: string | null
}

export default function RegisterPage() {
  const { t, language } = useLanguage()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<{
    type: "success" | "error" | null
    message: string
  }>({ type: null, message: "" })

  const [userEmail, setUserEmail] = useState<string>("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [selectedConference, setSelectedConference] = useState<string>("")
  const [conferences, setConferences] = useState<Conference[]>([])
  const [loadingConferences, setLoadingConferences] = useState(true)

  const [committees, setCommittees] = useState<Committee[]>([])
  const [loadingCommittees, setLoadingCommittees] = useState(false)
  const [primaryChoice, setPrimaryChoice] = useState<string>("")
  const [secondaryChoice, setSecondaryChoice] = useState<string>("")
  const [thirdChoice, setThirdChoice] = useState<string>("")

  const formRef = useRef<HTMLFormElement>(null)
  const supabase = createClient()

  const selectedConferenceObj = conferences.find((c) => c.id === selectedConference)
  const isRegistrationClosed = selectedConferenceObj && !selectedConferenceObj.registration_open

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user?.email) {
        setUserEmail(user.email)
        setIsAuthenticated(true)
      }
    }
    checkUser()
    loadConferences()
  }, [])

  useEffect(() => {
    if (selectedConference) {
      loadCommittees(selectedConference)
    } else {
      setCommittees([])
      setPrimaryChoice("")
      setSecondaryChoice("")
      setThirdChoice("")
    }
  }, [selectedConference])

  async function loadConferences() {
    try {
      const { data, error } = await supabase
        .from("user_conferences")
        .select("*")
        .eq("registration_open", true)
        .order("created_at", { ascending: false })

      if (error) throw error

      setConferences(data || [])
    } catch (error) {
      console.error("[v0] Error loading conferences:", error)
    } finally {
      setLoadingConferences(false)
    }
  }

  async function loadCommittees(conferenceId: string) {
    setLoadingCommittees(true)
    try {
      const { data, error } = await supabase
        .from("conference_committees")
        .select("*")
        .eq("conference_id", conferenceId)
        .order("priority", { ascending: true })

      if (error) {
        console.error("[v0] Error loading committees:", error)
        throw error
      }

      setCommittees(data || [])
    } catch (error) {
      console.error("[v0] Error loading committees:", error)
    } finally {
      setLoadingCommittees(false)
    }
  }

  function getConferenceName(conf: Conference) {
    return language === "ru" ? conf.name_ru : language === "kk" ? conf.name_kk : conf.name_en
  }

  function getConferenceDate(conf: Conference) {
    return language === "ru" ? conf.date_ru : language === "kk" ? conf.date_kk : conf.date_en
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (isRegistrationClosed) {
      setSubmitStatus({
        type: "error",
        message: t("registration_closed_desc"),
      })
      return
    }

    setIsSubmitting(true)
    setSubmitStatus({ type: null, message: "" })

    const formData = new FormData(event.currentTarget)

    if (primaryChoice) formData.set("primary_committee_id", primaryChoice)
    if (secondaryChoice) formData.set("secondary_committee_id", secondaryChoice)
    if (thirdChoice) formData.set("third_committee_id", thirdChoice)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error("Not authenticated")
      }

      const { error: insertError } = await supabase.from("delegate_applications").insert({
        conference_id: formData.get("conference") as string,
        user_id: user.id,
        full_name: formData.get("fullname") as string,
        email: formData.get("email") as string,
        phone: "",
        motivation: (formData.get("motivation") as string) || "",
        primary_committee_id: primaryChoice || null,
        secondary_committee_id: secondaryChoice || null,
        third_committee_id: thirdChoice || null,
        status: "pending",
      })

      if (insertError) throw insertError

      setSubmitStatus({
        type: "success",
        message: t("registration_success"),
      })

      if (formRef.current) {
        formRef.current.reset()
        setSelectedConference("")
        setPrimaryChoice("")
        setSecondaryChoice("")
        setThirdChoice("")
      }
    } catch (error) {
      console.error("[v0] Error in handleSubmit:", error)
      setSubmitStatus({
        type: "error",
        message: t("registration_error"),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const kazakhstanSchools = [
    // NIS schools
    { value: "nis_almaty", label: { ru: "НИШ г. Алматы", kk: "НЗМ Алматы", en: "NIS Almaty" } },
    { value: "nis_astana", label: { ru: "НИШ г. Астана", kk: "НЗМ Астана", en: "NIS Astana" } },
    { value: "nis_shymkent", label: { ru: "НИШ г. Шымкент", kk: "НЗМ Шымкент", en: "NIS Shymkent" } },
    { value: "nis_aktobe", label: { ru: "НИШ г. Актобе", kk: "НЗМ Ақтөбе", en: "NIS Aktobe" } },
    { value: "nis_aktau", label: { ru: "НИШ г. Актау", kk: "НЗМ Ақтау", en: "NIS Aktau" } },
    { value: "nis_atyrau", label: { ru: "НИШ г. Атырау", kk: "НЗМ Атырау", en: "NIS Atyrau" } },
    { value: "nis_kokshetau", label: { ru: "НИШ г. Кокшетау", kk: "НЗМ Көкшетау", en: "NIS Kokshetau" } },
    { value: "nis_karaganda", label: { ru: "НИШ г. Қарағанды", kk: "НЗМ Қарағанды", en: "NIS Karaganda" } },
    { value: "nis_kostanay", label: { ru: "НИШ г. Костанай", kk: "НЗМ Қостанай", en: "NIS Kostanay" } },
    { value: "nis_kyzylorda", label: { ru: "НИШ г. Кызылорда", kk: "НЗМ Қызылорда", en: "NIS Kyzylorda" } },
    { value: "nis_pavlodar", label: { ru: "НИШ г. Павлодар", kk: "НЗМ Павлодар", en: "NIS Pavlodar" } },
    { value: "nis_petropavlovsk", label: { ru: "НИШ г. Петропавловск", kk: "НЗМ Петропавл", en: "NIS Petropavlovsk" } },
    { value: "nis_taraz", label: { ru: "НИШ г. Тараз", kk: "НЗМ Тараз", en: "NIS Taraz" } },
    { value: "nis_taldykorgan", label: { ru: "НИШ г. Талдыкорган", kk: "НЗМ Талдықорған", en: "NIS Taldykorgan" } },
    { value: "nis_turkestan", label: { ru: "НИШ г. Туркестан", kk: "НЗМ Түркістан", en: "NIS Turkestan" } },
    { value: "nis_uralsk", label: { ru: "НИШ г. Уральск", kk: "НЗМ Орал", en: "NIS Uralsk" } },
    { value: "nis_ust_kamenogorsk", label: { ru: "НИШ г. Усть-Каменогорск", kk: "НЗМ Өскемен", en: "NIS Ust-Kamenogorsk" } },
    { value: "nis_semey", label: { ru: "НИШ г. Семей", kk: "НЗМ Семей", en: "NIS Semey" } },
    // Regular schools by city
    { value: "school_almaty", label: { ru: "Другая школа в Алматы", kk: "Алматыдағы басқа мектеп", en: "Other school in Almaty" } },
    { value: "school_astana", label: { ru: "Другая школа в Астане", kk: "Астанадағы басқа мектеп", en: "Other school in Astana" } },
    { value: "school_shymkent", label: { ru: "Другая школа в Шымкенте", kk: "Шымкенттегі басқа мектеп", en: "Other school in Shymkent" } },
    { value: "school_aktobe", label: { ru: "Другая школа в Актобе", kk: "Ақтөбедегі басқа мектеп", en: "Other school in Aktobe" } },
    { value: "school_semey", label: { ru: "Другая школа в Семее", kk: "Семейдегі басқа мектеп", en: "Other school in Semey" } },
    { value: "school_karaganda", label: { ru: "Другая школа в Карагандe", kk: "Қарағандыдағы басқа мектеп", en: "Other school in Karaganda" } },
    { value: "school_other", label: { ru: "Другая школа (другой город)", kk: "Басқа мектеп (басқа қала)", en: "Other school (other city)" } },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 max-w-2xl">
          <h1 className="text-4xl font-bold mb-8 text-center text-foreground">{t("register_title")}</h1>

          {isAuthenticated && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-start gap-3">
              <Info className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-green-800 dark:text-green-300">
                Вы вошли в систему. Эта регистрация будет связана с вашим аккаунтом, и вы сможете просмотреть её в
                личном кабинете.
              </p>
            </div>
          )}

          {isRegistrationClosed && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-red-800 dark:text-red-300">{t("registration_closed")}</p>
                <p className="text-sm text-red-700 dark:text-red-400 mt-1">{t("registration_closed_desc")}</p>
              </div>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-foreground">{t("register_title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="conference" className="text-foreground">
                    {t("conference")} <span className="text-red-500">*</span>
                  </Label>
                  {loadingConferences ? (
                    <div className="p-4 text-center text-muted-foreground">{t("loading")}</div>
                  ) : conferences.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">{t("no_conferences")}</div>
                  ) : (
                    <Select name="conference" required value={selectedConference} onValueChange={setSelectedConference}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("select_conference")} />
                      </SelectTrigger>
                      <SelectContent>
                        {conferences.map((conf) => (
                          <SelectItem key={conf.id} value={conf.id}>
                            <div className="flex flex-col gap-1 py-1">
                              <div className="font-semibold">{getConferenceName(conf)}</div>
                              <div className="text-xs text-muted-foreground flex items-center gap-3">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {getConferenceDate(conf)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {conf.location}
                                </span>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullname" className="text-foreground">
                    {t("full_name")}
                  </Label>
                  <Input id="fullname" name="fullname" type="text" required placeholder={t("full_name")} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="school" className="text-foreground">
                    {t("school")} <span className="text-red-500">*</span>
                  </Label>
                  <Select name="school" required>
                    <SelectTrigger>
                      <SelectValue placeholder={language === "ru" ? "Выберите школу" : language === "kk" ? "Мектепті таңдаңыз" : "Choose your school"} />
                    </SelectTrigger>
                    <SelectContent>
                      {kazakhstanSchools.map((school) => (
                        <SelectItem key={school.value} value={school.value}>
                          {school.label[language as keyof typeof school.label]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground">
                    {t("email")}
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="example@nis.edu.kz"
                    defaultValue={userEmail}
                    readOnly={isAuthenticated}
                    className={isAuthenticated ? "bg-muted" : ""}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="grade" className="text-foreground">
                    {t("grade")}
                  </Label>
                  <Input id="grade" name="grade" type="number" min="8" max="12" required placeholder="8-12" />
                </div>

                {selectedConference && (
                  <>
                    {loadingCommittees ? (
                      <div className="p-4 text-center text-muted-foreground">{t("loading")}</div>
                    ) : committees.length > 0 ? (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="primary_choice" className="text-foreground">
                            {t("primary_choice")} <span className="text-red-500">*</span>
                          </Label>
                          <Select value={primaryChoice} onValueChange={setPrimaryChoice} required>
                            <SelectTrigger>
                              <SelectValue placeholder={t("select_committee")} />
                            </SelectTrigger>
                            <SelectContent>
                              {committees.map((committee) => (
                                <SelectItem key={committee.id} value={committee.id}>
                                  {committee.name}
                                  {committee.topic && ` - ${committee.topic}`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="secondary_choice" className="text-foreground">
                            {t("secondary_choice")} <span className="text-red-500">*</span>
                          </Label>
                          <Select value={secondaryChoice} onValueChange={setSecondaryChoice} required>
                            <SelectTrigger>
                              <SelectValue placeholder={t("select_committee")} />
                            </SelectTrigger>
                            <SelectContent>
                              {committees
                                .filter((c) => c.id !== primaryChoice)
                                .map((committee) => (
                                  <SelectItem key={committee.id} value={committee.id}>
                                    {committee.name}
                                    {committee.topic && ` - ${committee.topic}`}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="third_choice" className="text-foreground">
                            {t("third_choice")} <span className="text-red-500">*</span>
                          </Label>
                          <Select value={thirdChoice} onValueChange={setThirdChoice} required>
                            <SelectTrigger>
                              <SelectValue placeholder={t("select_committee")} />
                            </SelectTrigger>
                            <SelectContent>
                              {committees
                                .filter((c) => c.id !== primaryChoice && c.id !== secondaryChoice)
                                .map((committee) => (
                                  <SelectItem key={committee.id} value={committee.id}>
                                    {committee.name}
                                    {committee.topic && ` - ${committee.topic}`}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    ) : (
                      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <p className="text-yellow-800 dark:text-yellow-400 font-medium mb-2">{t("no_committees")}</p>
                        <p className="text-sm text-yellow-700 dark:text-yellow-500">
                          {language === "ru"
                            ? "Создатель конференции еще не добавил комитеты. Пожалуйста, свяжитесь с организатором или попробуйте позже."
                            : language === "kk"
                              ? "Конференция жасаушысы әлі комитеттерді қоспаған. Ұйымдастырушымен байланысыңыз немесе кейінірек қайталап көріңіз."
                              : "The conference creator hasn't added committees yet. Please contact the organizer or try again later."}
                        </p>
                      </div>
                    )}
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="motivation" className="text-foreground">
                    {t("motivation")}
                  </Label>
                  <Textarea id="motivation" name="motivation" rows={4} placeholder={t("motivation")} />
                </div>

                {submitStatus.type && (
                  <div
                    className={`p-4 rounded-lg ${
                      submitStatus.type === "success"
                        ? "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                        : "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                    }`}
                  >
                    {submitStatus.message}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-[#006633] hover:bg-[#004d26]"
                  disabled={isSubmitting || isRegistrationClosed}
                >
                  {isSubmitting ? t("submitting") : t("submit")}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  )
}
