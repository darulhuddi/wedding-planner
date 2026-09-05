import React from 'react';
import { Heart } from 'lucide-react';
import { BrandMark } from '../brand';

export const Footer: React.FC = () => {
  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith('#')) {
      e.preventDefault();
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <footer className="bg-ivory border-t border-beige pt-10 sm:pt-12 pb-8 pb-safe">
      <div className="w-full max-w-container mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 pb-8 sm:pb-10 border-b border-beige">
          {/* Brand Col */}
          <div className="sm:col-span-2 space-y-3">
            <div className="flex items-center gap-2.5">
              <BrandMark size="md" />
              <span className="font-serif text-xl font-bold tracking-tight text-charcoal">
                Wed<span className="text-burgundy">Siap</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-charcoal-400 max-w-sm leading-relaxed">
              Plan your wedding, together. Workspace persiapan pernikahan modern untuk pasangan Indonesia.
            </p>
            <div className="flex items-center gap-2.5 pt-1">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="w-11 h-11 rounded-full bg-ivory-200 border border-beige flex items-center justify-center text-charcoal-400 hover:text-burgundy hover:border-burgundy-200 transition-colors min-h-touch min-w-touch"
                aria-label="Instagram WedSiap"
              >
                <svg className="w-4 h-4 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                </svg>
              </a>
              <a
                href="https://tiktok.com"
                target="_blank"
                rel="noreferrer"
                className="w-11 h-11 rounded-full bg-ivory-200 border border-beige flex items-center justify-center text-charcoal-400 hover:text-burgundy hover:border-burgundy-200 transition-colors min-h-touch min-w-touch"
                aria-label="TikTok WedSiap"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.81 4.47 6.3 6.3 0 0 0 1.94-4.47V8.82a8.28 8.28 0 0 0 4.84 1.55V6.92c-.34.01-.68-.07-1-.23z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-charcoal mb-3">
              Product
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm text-charcoal-400">
              <li>
                <a
                  href="#fitur"
                  onClick={(e) => handleNavClick(e, '#fitur')}
                  className="hover:text-burgundy transition-colors py-1 inline-block"
                >
                  Fitur
                </a>
              </li>
              <li>
                <a
                  href="#cara-kerja"
                  onClick={(e) => handleNavClick(e, '#cara-kerja')}
                  className="hover:text-burgundy transition-colors py-1 inline-block"
                >
                  Cara Kerja
                </a>
              </li>
              <li>
                <a
                  href="#harga"
                  onClick={(e) => handleNavClick(e, '#harga')}
                  className="hover:text-burgundy transition-colors py-1 inline-block"
                >
                  Harga
                </a>
              </li>
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-charcoal mb-3">
              Support
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm text-charcoal-400">
              <li>
                <a href="#faq" className="hover:text-burgundy transition-colors py-1 inline-block">
                  FAQ
                </a>
              </li>
              <li>
                <a href="mailto:support@wedflow.id" className="hover:text-burgundy transition-colors py-1 inline-block">
                  Bantuan
                </a>
              </li>
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-charcoal mb-3">
              Company
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm text-charcoal-400">
              <li>
                <a href="#tentang" className="hover:text-burgundy transition-colors py-1 inline-block">
                  Tentang
                </a>
              </li>
              <li>
                <a href="#kontak" className="hover:text-burgundy transition-colors py-1 inline-block">
                  Kontak
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-charcoal-300 text-center sm:text-left">
          <p>© 2026 WedSiap. All rights reserved.</p>
          <div className="flex items-center gap-1.5">
            <span>Dibuat dengan</span>
            <Heart className="w-3 h-3 fill-burgundy text-burgundy" />
            <span>untuk calon pengantin Indonesia</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
