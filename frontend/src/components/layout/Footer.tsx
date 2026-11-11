import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, MapPin, Phone, Clock, Globe, Linkedin } from 'lucide-react';

const footerLinks = {
  Platform: [
    { label: 'Courses', path: '/courses' },
    { label: 'Pricing', path: '/pricing' },
    { label: 'Community', path: '/community' },
    { label: 'Blog', path: '/blog' },
    { label: 'FAQ', path: '/faq' },
  ],
  Company: [
    { label: 'About', path: '/about' },
    { label: 'Teach on CareerCode', path: '/become-instructor' },
    { label: 'Careers', path: '/careers' },
    { label: 'Contact', path: '/contact' },
    { label: 'Partners', path: '/partners' },
    { label: 'Press', path: '/press' },
    { label: 'Board of Directors', path: '/board' },
  ],
  Support: [
    { label: 'Help Center', path: '/help' },
    { label: 'Terms of Service', path: '/terms' },
    { label: 'Privacy Policy', path: '/privacy' },
    { label: 'Cookie Policy', path: '/cookies' },
    { label: 'Accessibility', path: '/accessibility' },
  ],
};

export function Footer() {
  return (
    <footer className="relative border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 backdrop-blur-xl">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-primary-500/5 pointer-events-none" />
      <div className="max-w-screen-4xl mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16 relative">
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 sm:gap-8">
          <div className="col-span-1 xs:col-span-2 sm:col-span-2 md:col-span-2 lg:col-span-2">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <img src="/wid-ltd-logo.png" alt="WID LTD" className="h-8 sm:h-9 w-auto" />
              <span className="text-lg sm:text-xl font-bold gradient-text">CareerCode</span>
            </Link>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed max-w-xs sm:max-w-sm mb-4">
              CareerCode Academy is the education venture of <strong>WID LTD</strong> (RC 8824091) —
              practical, project-based learning for people building technology careers.
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
              WID LTD — “The Motivation for Innovation.” Registered in Nigeria, September 2025.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://widltd.com.ng"
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-primary-100 dark:hover:bg-primary-900/40 hover:text-primary-600 transition-all"
                aria-label="WID LTD website"
              >
                <Globe className="w-4 h-4" />
              </a>
              <a
                href="https://ng.linkedin.com/in/ike-wisdom-31804b336"
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-primary-100 dark:hover:bg-primary-900/40 hover:text-primary-600 transition-all"
                aria-label="Ike Wisdom Okemsinachi on LinkedIn"
              >
                <Linkedin className="w-4 h-4" />
              </a>
              <a
                href="mailto:contact@widltd.com.ng"
                className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-primary-100 dark:hover:bg-primary-900/40 hover:text-primary-600 transition-all"
                aria-label="Email WID LTD"
              >
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>

          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 text-sm sm:text-base">
                {title}
              </h3>
              <ul className="space-y-2 sm:space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.path}
                      className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-gray-200 dark:border-gray-800">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-col xs:flex-row flex-wrap items-center gap-3 xs:gap-4 sm:gap-6 text-xs sm:text-sm text-gray-500">
              <a href="mailto:contact@widltd.com.ng" className="flex items-center gap-1.5 hover:text-primary-600">
                <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                contact@widltd.com.ng
              </a>
              <a href="tel:+2348164961457" className="flex items-center gap-1.5 hover:text-primary-600">
                <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                +234 816 496 1457
              </a>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Agbara, Ogun State, Nigeria
              </div>
              <div className="hidden sm:flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                Mon–Fri, 8:00 AM – 6:00 PM WAT
              </div>
            </div>
            <p className="text-xs sm:text-sm text-gray-400 text-center xs:text-left">
              &copy; {new Date().getFullYear()} WID LTD. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
