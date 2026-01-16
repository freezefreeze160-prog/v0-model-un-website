"use client"

import { useLanguage } from "@/contexts/language-context"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { Globe, Users, Award, BookOpen, MessageSquare, Target } from "lucide-react"

export default function AboutPage() {
  const { t } = useLanguage()

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-12">
            <div className="inline-block p-3 bg-[#0055aa]/10 rounded-full mb-4">
              <Globe className="h-12 w-12 text-[#0055aa]" />
            </div>
            <h1 className="text-5xl font-bold mb-4 text-foreground">{t("about_title")}</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">{t("about_desc")}</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            <Card className="border-2 hover:border-[#0055aa] transition-colors">
              <CardContent className="p-8">
                <div className="bg-[#0055aa]/10 w-14 h-14 rounded-lg flex items-center justify-center mb-4">
                  <Globe className="h-7 w-7 text-[#0055aa]" />
                </div>
                <h3 className="font-bold text-xl mb-3 text-foreground">Международный опыт</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Участвуйте в конференциях по всему миру и представляйте различные страны
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-[#0055aa] transition-colors">
              <CardContent className="p-8">
                <div className="bg-[#0055aa]/10 w-14 h-14 rounded-lg flex items-center justify-center mb-4">
                  <MessageSquare className="h-7 w-7 text-[#0055aa]" />
                </div>
                <h3 className="font-bold text-xl mb-3 text-foreground">Дипломатия</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Развивайте навыки переговоров, дипломатии и международного сотрудничества
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-[#0055aa] transition-colors">
              <CardContent className="p-8">
                <div className="bg-[#0055aa]/10 w-14 h-14 rounded-lg flex items-center justify-center mb-4">
                  <BookOpen className="h-7 w-7 text-[#0055aa]" />
                </div>
                <h3 className="font-bold text-xl mb-3 text-foreground">Критическое мышление</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Анализируйте глобальные проблемы и разрабатывайте инновационные решения
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-[#0055aa] transition-colors">
              <CardContent className="p-8">
                <div className="bg-[#0055aa]/10 w-14 h-14 rounded-lg flex items-center justify-center mb-4">
                  <Users className="h-7 w-7 text-[#0055aa]" />
                </div>
                <h3 className="font-bold text-xl mb-3 text-foreground">Нетворкинг</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Знакомьтесь с единомышленниками из разных стран и создавайте связи
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-[#0055aa] transition-colors">
              <CardContent className="p-8">
                <div className="bg-[#0055aa]/10 w-14 h-14 rounded-lg flex items-center justify-center mb-4">
                  <Award className="h-7 w-7 text-[#0055aa]" />
                </div>
                <h3 className="font-bold text-xl mb-3 text-foreground">Лидерство</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Станьте лидером и вдохновляйте других на позитивные изменения
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-[#0055aa] transition-colors">
              <CardContent className="p-8">
                <div className="bg-[#0055aa]/10 w-14 h-14 rounded-lg flex items-center justify-center mb-4">
                  <Target className="h-7 w-7 text-[#0055aa]" />
                </div>
                <h3 className="font-bold text-xl mb-3 text-foreground">Достижения</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Получайте награды и признание за ваш вклад в решение мировых проблем
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-gradient-to-br from-[#0055aa] to-[#003d7a] text-white">
            <CardContent className="p-12 text-center">
              <h2 className="text-3xl font-bold mb-4">Готовы присоединиться?</h2>
              <p className="text-lg mb-6 text-white/90">
                Станьте частью международного сообщества молодых дипломатов и лидеров
              </p>
              <a
                href="/register"
                className="inline-block bg-white text-[#0055aa] px-8 py-3 rounded-lg font-semibold hover:bg-white/90 transition-colors"
              >
                Зарегистрироваться
              </a>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  )
}
