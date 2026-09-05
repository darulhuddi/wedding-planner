import React, { useState, useEffect } from 'react';
import { Menu, X, ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { BrandMark } from '../brand';
import { useAuth } from '../../auth/AuthContext';

export interface NavbarProps {
  onOpenAuth: (mode: 'signup' | 'login') => void;
  onNavigate?: (route: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAuth, onNavigate }) => {
  const { user, loading: isAuthLoading, isAdmin, isAdminLoading } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Prevent background scroll when mobile drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const navLinks = [
    { name: 'Fitur', href: '#fitur' },
    { name: 'Cara Kerja', href: '#cara-kerja' },
    { name: 'Harga', href: '#harga' },
  ];

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const element = document.querySelector(href);
    if (element) {
      const navOffset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - navOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  const handleNavigateDestination = (destination: string) => {
    setMobileMenuOpen(false);
    if (onNavigate) {
      onNavigate(destination);
    } else {
      window.location.pathname = `/${destination}`;
    }
  };

  // Auth state resolution
  const isResolving = isAuthLoading || (user && isAdminLoading);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        isScrolled
          ? 'bg-ivory/95 backdrop-blur-md border-b border-beige shadow-soft py-3'
          : 'bg-transparent py-4 sm:py-6'
      }`}
    >
      <div className="w-full max-w-container mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
        <div className="flex items-center justify-between">
          {/* Brand Logo with adequate touch area */}
          <a
            href="#"
            className="flex items-center gap-2.5 sm:gap-3 group py-1"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <BrandMark size="md" className="shadow-xs transition-transform group-hover:scale-105" />
            <span className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-charcoal">
              Wed<span className="text-burgundy">Siap</span>
            </span>
          </a>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 lg:gap-10 text-sm font-medium text-charcoal-500">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className="transition-colors hover:text-burgundy py-2 tracking-wide"
              >
                {link.name}
              </a>
            ))}
          </nav>

          {/* Desktop Right CTA buttons */}
          <div className="hidden md:flex items-center gap-3">
            {isResolving ? (
              <div className="h-9 w-24 bg-beige-200/40 rounded-xl animate-pulse" />
            ) : !user ? (
              <>
                <button
                  onClick={() => onOpenAuth('login')}
                  className="text-sm font-medium text-charcoal hover:text-burgundy px-3.5 py-2.5 transition-colors cursor-pointer min-h-touch"
                >
                  Masuk
                </button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onOpenAuth('signup')}
                  icon={<ArrowRight className="w-3.5 h-3.5" />}
                  className="px-5 py-2.5 text-sm font-semibold shadow-sm"
                >
                  Mulai Gratis
                </Button>
              </>
            ) : isAdmin ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleNavigateDestination('admin')}
                icon={<ArrowRight className="w-3.5 h-3.5" />}
                className="px-5 py-2.5 text-sm font-semibold shadow-sm"
              >
                Admin
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleNavigateDestination('dashboard')}
                icon={<ArrowRight className="w-3.5 h-3.5" />}
                className="px-5 py-2.5 text-sm font-semibold shadow-sm"
              >
                Dashboard
              </Button>
            )}
          </div>

          {/* Mobile Hamburger Toggle (Touch area >= 44px) */}
          <div className="flex md:hidden items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="w-11 h-11 rounded-xl bg-ivory-200 border border-beige flex items-center justify-center text-charcoal hover:text-burgundy active:scale-95 transition-all min-h-touch min-w-touch"
              aria-label={mobileMenuOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Full Navigation Overlay & Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-[60px] z-50 md:hidden bg-ivory flex flex-col justify-between px-6 pt-4 pb-safe border-t border-beige animate-fadeIn overflow-y-auto">
          <nav className="flex flex-col space-y-2 pt-2">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className="text-lg font-serif font-semibold text-charcoal px-4 py-3.5 rounded-xl hover:bg-ivory-200 active:bg-ivory-300 transition-colors flex items-center justify-between min-h-touch border-b border-beige/40"
              >
                <span>{link.name}</span>
                <span className="text-xs text-charcoal-400 font-sans font-normal">Lihat →</span>
              </a>
            ))}
          </nav>

          <div className="pt-6 pb-6 border-t border-beige flex flex-col gap-3">
            {isResolving ? (
              <div className="h-12 w-full bg-beige-200/40 rounded-xl animate-pulse" />
            ) : !user ? (
              <>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth('login');
                  }}
                  className="w-full py-3.5 text-center text-sm font-semibold text-charcoal bg-white hover:bg-ivory-200 active:bg-ivory-300 rounded-xl border border-beige shadow-2xs min-h-touch cursor-pointer"
                >
                  Masuk ke Akun
                </button>
                <Button
                  variant="primary"
                  fullWidth
                  size="lg"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth('signup');
                  }}
                  icon={<ArrowRight className="w-4 h-4" />}
                >
                  Mulai Gratis Sekarang
                </Button>
              </>
            ) : isAdmin ? (
              <Button
                variant="primary"
                fullWidth
                size="lg"
                onClick={() => handleNavigateDestination('admin')}
                icon={<ArrowRight className="w-4 h-4" />}
              >
                Buka Admin
              </Button>
            ) : (
              <Button
                variant="primary"
                fullWidth
                size="lg"
                onClick={() => handleNavigateDestination('dashboard')}
                icon={<ArrowRight className="w-4 h-4" />}
              >
                Buka Dashboard
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
