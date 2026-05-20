import { useEffect, useState } from "react"
import { Link } from "wouter"
import { Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"

const navLinks = [
  { name: "Services", href: "/services" },
  { name: "Research", href: "/research" },
  { name: "Open Source", href: "/open-source" },
  { name: "About", href: "/about" },
]

const legalLinks = [
  { name: "Legal", href: "/legal" },
]

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 50)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <>
      <nav
        className={cn(
          "fixed top-0 left-0 right-0 z-50 px-xl transition-[padding] duration-300",
          isScrolled ? "py-md" : "py-lg",
        )}
      >
        <div className="glass max-w-7xl mx-auto rounded-pill flex items-center justify-between px-xl py-md">
          <Link href="/" className="text-2xl font-sans font-bold text-primary tracking-tighter relative z-50">
            tanh<span className="text-accent"> </span>lab
          </Link>

          {/* Desktop */}
          <div className="hidden md:flex items-center gap-jumbo">
            {[...navLinks, ...legalLinks].map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-sm font-medium text-secondary hover:text-primary transition-colors"
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Mobile toggle */}
          <button
            aria-label="Toggle menu"
            className="md:hidden relative z-[60] text-primary"
            onClick={() => setIsMobileMenuOpen((v) => !v)}
          >
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </nav>

      {/* Mobile overlay — rendered outside <nav> to escape .glass backdrop-filter containing block */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-app/50 backdrop-blur-2xl z-40 flex flex-col items-center justify-center md:hidden">
          <div className="flex flex-col items-center gap-jumbo">
            {[...navLinks, ...legalLinks].map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="font-display text-4xl text-primary hover:text-accent transition-colors"
              >
                {link.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
