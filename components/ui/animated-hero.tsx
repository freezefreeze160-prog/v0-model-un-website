"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { MoveRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface AnimatedHeroProps {
  titles: string[]
  staticText: string
  description: string
  primaryLabel: string
  primaryHref: string
  secondaryLabel: string
  secondaryHref: string
}

export function AnimatedHero({
  titles,
  staticText,
  description,
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
}: AnimatedHeroProps) {
  const [titleNumber, setTitleNumber] = useState(0)

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setTitleNumber((prev) => (prev === titles.length - 1 ? 0 : prev + 1))
    }, 2200)
    return () => clearTimeout(timeoutId)
  }, [titleNumber, titles])

  return (
    <div className="w-full">
      <div className="container mx-auto px-4">
        <div className="flex gap-8 py-24 lg:py-40 items-center justify-center flex-col">
          <div className="flex gap-4 flex-col items-center">
            <h1 className="text-5xl md:text-7xl max-w-3xl tracking-tighter text-center font-semibold text-foreground">
              <span>{staticText}</span>
              <span className="relative flex w-full justify-center overflow-hidden text-center md:pb-4 md:pt-1 h-[1.2em]">
                &nbsp;
                {titles.map((title, index) => (
                  <motion.span
                    key={index}
                    className="absolute font-bold text-primary"
                    initial={{ opacity: 0, y: 80 }}
                    transition={{ type: "spring", stiffness: 60, damping: 14 }}
                    animate={
                      titleNumber === index
                        ? { y: 0, opacity: 1 }
                        : { y: titleNumber > index ? -80 : 80, opacity: 0 }
                    }
                  >
                    {title}
                  </motion.span>
                ))}
              </span>
            </h1>

            <p className="text-lg md:text-xl leading-relaxed tracking-tight text-muted-foreground max-w-2xl text-center text-balance">
              {description}
            </p>
          </div>
          <div className="flex flex-row gap-3">
            <Button asChild size="lg" variant="outline" className="gap-2 bg-transparent">
              <Link href={secondaryHref}>{secondaryLabel}</Link>
            </Button>
            <Button asChild size="lg" className="gap-2 group">
              <Link href={primaryHref}>
                {primaryLabel}
                <MoveRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
