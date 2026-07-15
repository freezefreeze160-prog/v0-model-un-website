"use client"

import { useEffect, useRef, useState } from "react"
import { useLanguage } from "@/contexts/language-context"
import { Flame, Scale, Shield, HeartPulse, GraduationCap, Users, ChevronDown } from "lucide-react"

/**
 * Cinematic landing hero:
 *  – full-screen black void with a glowing, subtly glitching UN-style emblem
 *  – if /landing/hero-emblem.mp4 exists it plays as the background,
 *    otherwise the animated SVG emblem is shown (same art direction)
 *  – as the user scrolls, the darkness dissolves into the flag wall,
 *    global-issues grid and diplomat quotes.
 */

const FLAGS: { code: string; name: string; css: React.CSSProperties }[] = [
  { code: "kz", name: "Kazakhstan", css: { background: "radial-gradient(circle at 50% 42%, #fec50c 0 14%, transparent 15%), #00afca" } },
  { code: "un", name: "United Nations", css: { background: "radial-gradient(circle at 50% 50%, #ffffff 0 10%, transparent 11%), #5b92e5" } },
  { code: "us", name: "USA", css: { background: "linear-gradient(0deg, #b22234 7.7%, #fff 7.7% 15.4%, #b22234 15.4% 23.1%, #fff 23.1% 30.8%, #b22234 30.8% 38.5%, #fff 38.5% 46.2%, #b22234 46.2% 53.9%, #fff 53.9% 61.6%, #b22234 61.6% 69.3%, #fff 69.3% 77%, #b22234 77% 84.7%, #fff 84.7% 92.4%, #b22234 92.4%)", position: "relative" } },
  { code: "fr", name: "France", css: { background: "linear-gradient(90deg, #0055a4 33.3%, #fff 33.3% 66.6%, #ef4135 66.6%)" } },
  { code: "de", name: "Germany", css: { background: "linear-gradient(0deg, #ffce00 33.3%, #dd0000 33.3% 66.6%, #000 66.6%)" } },
  { code: "jp", name: "Japan", css: { background: "radial-gradient(circle at 50% 50%, #bc002d 0 18%, transparent 19%), #fff" } },
  { code: "cn", name: "China", css: { background: "radial-gradient(circle at 18% 30%, #ffde00 0 8%, transparent 9%), #de2910" } },
  { code: "gb", name: "United Kingdom", css: { background: "linear-gradient(90deg, transparent 42%, #fff 42% 58%, transparent 58%), linear-gradient(0deg, transparent 36%, #fff 36% 64%, transparent 64%), linear-gradient(90deg, transparent 45%, #c8102e 45% 55%, transparent 55%), linear-gradient(0deg, transparent 41%, #c8102e 41% 59%, transparent 59%), #012169", backgroundBlendMode: "normal" } },
  { code: "tr", name: "Türkiye", css: { background: "radial-gradient(circle at 42% 50%, #e30a17 0 9%, transparent 10%), radial-gradient(circle at 38% 50%, #fff 0 12%, transparent 13%), #e30a17" } },
  { code: "in", name: "India", css: { background: "radial-gradient(circle at 50% 50%, #000080 0 6%, transparent 7%), linear-gradient(0deg, #128807 33.3%, #fff 33.3% 66.6%, #f93 66.6%)" } },
  { code: "br", name: "Brazil", css: { background: "radial-gradient(circle at 50% 50%, #002776 0 14%, transparent 15%), radial-gradient(circle at 50% 50%, #fedf00 0 26%, transparent 27%), #009c3b" } },
  { code: "za", name: "South Africa", css: { background: "linear-gradient(0deg, #002395 42%, #fff 42% 46%, #007a4d 46% 54%, #fff 54% 58%, #de3831 58%)" } },
  { code: "eg", name: "Egypt", css: { background: "linear-gradient(0deg, #000 33.3%, #fff 33.3% 66.6%, #ce1126 66.6%)" } },
  { code: "kr", name: "South Korea", css: { background: "radial-gradient(circle at 50% 50%, #cd2e3a 0 9%, transparent 10%), radial-gradient(circle at 50% 56%, #0047a0 0 12%, transparent 13%), #fff" } },
  { code: "ua", name: "Ukraine", css: { background: "linear-gradient(0deg, #ffd700 50%, #005bbb 50%)" } },
  { code: "ae", name: "UAE", css: { background: "linear-gradient(90deg, #ff0000 28%, transparent 28%), linear-gradient(0deg, #000 33.3%, #fff 33.3% 66.6%, #00732f 66.6%)" } },
]

const EMBLEM_MERIDIANS = [0, 30, 60, 90, 120, 150]

export function LandingHero() {
  const { t } = useLanguage()
  const [progress, setProgress] = useState(0) // 0 at top → 1 when hero fully scrolled away
  const [videoAvailable, setVideoAvailable] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => {
      const el = wrapperRef.current
      if (!el) return
      const total = el.offsetHeight - window.innerHeight
      const passed = Math.min(Math.max(-el.getBoundingClientRect().top, 0), total)
      setProgress(total > 0 ? passed / total : 0)
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const heroOpacity = Math.max(1 - progress * 1.15, 0)
  const heroScale = 1 + progress * 0.18

  const issues = [
    { icon: Flame, title: t("landing_issue_climate"), desc: t("landing_issue_climate_desc") },
    { icon: Shield, title: t("landing_issue_security"), desc: t("landing_issue_security_desc") },
    { icon: Scale, title: t("landing_issue_rights"), desc: t("landing_issue_rights_desc") },
    { icon: HeartPulse, title: t("landing_issue_health"), desc: t("landing_issue_health_desc") },
    { icon: GraduationCap, title: t("landing_issue_education"), desc: t("landing_issue_education_desc") },
    { icon: Users, title: t("landing_issue_inequality"), desc: t("landing_issue_inequality_desc") },
  ]

  const quotes = [
    { text: t("landing_quote_1"), author: "Dag Hammarskjöld" },
    { text: t("landing_quote_2"), author: "Kofi Annan" },
    { text: t("landing_quote_3"), author: "Eleanor Roosevelt" },
  ]

  return (
    <>
      {/* ── Act I: the black void with the glowing emblem ─────────────────── */}
      <div ref={wrapperRef} className="relative h-[160vh] bg-black">
        <div className="sticky top-0 flex h-screen flex-col items-center justify-center overflow-hidden">
          {/* video background slot (drops in when /landing/hero-emblem.mp4 exists) */}
          <video
            className="absolute inset-0 h-full w-full object-cover"
            style={{ opacity: videoAvailable ? heroOpacity : 0 }}
            src="/landing/hero-emblem.mp4"
            autoPlay
            muted
            loop
            playsInline
            onCanPlay={() => setVideoAvailable(true)}
            onError={() => setVideoAvailable(false)}
          />

          {/* animated SVG emblem fallback */}
          {!videoAvailable && (
            <div
              className="landing-emblem pointer-events-none absolute inset-0 flex items-center justify-center"
              style={{ opacity: heroOpacity, transform: `scale(${heroScale})` }}
              aria-hidden
            >
              <svg viewBox="0 0 400 400" className="h-[68vmin] w-[68vmin]">
                <defs>
                  <radialGradient id="emblemGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="rgba(125, 211, 252, 0.28)" />
                    <stop offset="55%" stopColor="rgba(56, 189, 248, 0.10)" />
                    <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
                  </radialGradient>
                </defs>
                <circle cx="200" cy="200" r="190" fill="url(#emblemGlow)" />

                {/* globe grid — azimuthal projection */}
                <g className="emblem-lines" stroke="#a5e8ff" fill="none" strokeWidth="1.4">
                  <circle cx="200" cy="185" r="105" />
                  <circle cx="200" cy="185" r="78" opacity="0.85" />
                  <circle cx="200" cy="185" r="50" opacity="0.75" />
                  <circle cx="200" cy="185" r="22" opacity="0.65" />
                  {EMBLEM_MERIDIANS.map((deg) => (
                    <line
                      key={deg}
                      x1="200"
                      y1="80"
                      x2="200"
                      y2="290"
                      transform={`rotate(${deg} 200 185)`}
                      opacity="0.7"
                    />
                  ))}
                </g>

                {/* laurel branches */}
                <g className="emblem-lines" stroke="#a5e8ff" fill="none" strokeWidth="2">
                  <path d="M 78 300 C 60 250, 62 190, 92 140" opacity="0.95" />
                  <path d="M 322 300 C 340 250, 338 190, 308 140" opacity="0.95" />
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <g key={i} opacity="0.9">
                      <path d={`M ${80 - i * 1.5} ${288 - i * 27} q -22 -8 -30 8 q 20 12 30 -8`} transform={`rotate(${-i * 4} 90 220)`} />
                      <path d={`M ${320 + i * 1.5} ${288 - i * 27} q 22 -8 30 8 q -20 12 -30 -8`} transform={`rotate(${i * 4} 310 220)`} />
                    </g>
                  ))}
                </g>
              </svg>
            </div>
          )}

          {/* particles */}
          <div className="landing-particles absolute inset-0" style={{ opacity: heroOpacity }} aria-hidden />

          {/* title */}
          <div
            className="relative z-10 px-4 text-center"
            style={{ opacity: heroOpacity, transform: `translateY(${progress * -40}px)` }}
          >
            <p className="mb-3 text-sm uppercase tracking-[0.4em] text-sky-200/70">Model United Nations</p>
            <h1 className="landing-title text-5xl font-bold text-white md:text-7xl">MUN Kazakhstan</h1>
            <p className="mx-auto mt-4 max-w-xl text-balance text-sky-100/60 md:text-lg">
              {t("landing_tagline")}
            </p>
          </div>

          {/* scroll hint */}
          <div
            className="absolute bottom-8 flex flex-col items-center gap-1 text-sky-200/60"
            style={{ opacity: Math.max(1 - progress * 4, 0) }}
          >
            <span className="text-xs uppercase tracking-widest">{t("landing_scroll")}</span>
            <ChevronDown className="h-5 w-5 animate-bounce" />
          </div>

          {/* dissolve into the light */}
          <div
            className="pointer-events-none absolute inset-0 bg-background"
            style={{ opacity: Math.max((progress - 0.82) * 5.6, 0) }}
          />
        </div>
      </div>

      {/* ── Act II: the flags of the world ────────────────────────────────── */}
      <section className="overflow-hidden border-b border-border bg-background py-14">
        <h2 className="mb-2 text-center text-3xl font-bold text-foreground md:text-4xl">
          {t("landing_flags_title")}
        </h2>
        <p className="mx-auto mb-10 max-w-2xl px-4 text-center text-muted-foreground">
          {t("landing_flags_desc")}
        </p>
        {[0, 1].map((row) => (
          <div key={row} className="landing-marquee mb-4" data-reverse={row === 1 ? "true" : undefined}>
            <div className="landing-marquee-track">
              {[...FLAGS, ...FLAGS].map((flag, i) => (
                <span
                  key={`${flag.code}-${i}`}
                  className="landing-flag"
                  style={flag.css}
                  role="img"
                  aria-label={flag.name}
                  title={flag.name}
                />
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* ── Act III: the problems the world debates ───────────────────────── */}
      <section className="bg-accent/30 py-16 md:py-24">
        <div className="container mx-auto max-w-6xl px-4">
          <h2 className="mb-2 text-center text-3xl font-bold text-foreground md:text-4xl">
            {t("landing_issues_title")}
          </h2>
          <p className="mx-auto mb-12 max-w-2xl text-center text-muted-foreground">
            {t("landing_issues_desc")}
          </p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {issues.map((issue) => (
              <div
                key={issue.title}
                className="group rounded-2xl border-2 border-border bg-card p-6 transition-colors hover:border-primary"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                  <issue.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-1.5 font-bold text-foreground">{issue.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{issue.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Act IV: voices of diplomacy ───────────────────────────────────── */}
      <section className="border-b border-border bg-background py-16 md:py-20">
        <div className="container mx-auto max-w-5xl px-4">
          <div className="grid gap-6 md:grid-cols-3">
            {quotes.map((quote) => (
              <figure key={quote.author} className="rounded-2xl bg-muted/60 p-6">
                <blockquote className="mb-4 text-sm italic leading-relaxed text-foreground/90">
                  “{quote.text}”
                </blockquote>
                <figcaption className="text-xs font-semibold uppercase tracking-wider text-primary">
                  — {quote.author}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
