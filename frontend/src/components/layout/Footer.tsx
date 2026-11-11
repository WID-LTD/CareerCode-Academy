import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Code2,
  Github,
  Twitter,
  Linkedin,
  Youtube,
  Mail,
  MapPin,
  Phone,
} from 'lucide-react';

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

const socialLinks = [
  { icon: Github, href: '#', label: 'GitHub' },
  { icon: Twitter, href: '#', label: 'Twitter' },
  { icon: Linkedin, href: '#', label: 'LinkedIn' },
  { icon: Youtube, href: '#', label: 'YouTube' },
];

export function Footer() {
  return (
    <footer className="relative border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 backdrop-blur-xl">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-primary-500/5 pointer-events-none" />
      <div className="max-w-screen-4xl mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16 relative">
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 sm:gap-8">
          <div className="col-span-1 xs:col-span-2 sm:col-span-2 md:col-span-2 lg:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 sm:w-10 sm:h-10 gradient-bg rounded-xl flex items-center justify-center overflow-hidden">
                <img src="/screen.png" alt="CareerCode Logo" className="w-full h-full object-contain" />
              </div>
              <span className="text-lg sm:text-xl font-bold gradient-text">CareerCode</span>
            </Link>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed max-w-xs sm:max-w-sm mb-6">
              Empowering the next generation of developers with industry-focused,
              project-based learning. Transform your career with hands-on coding
              experience and expert mentorship.
            </p>
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-primary-100 dark:hover:bg-primary-900/40 hover:text-primary-600 dark:hover:text-primary-400 transition-all duration-200"
                  aria-label={social.label}
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
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
            <div className="flex flex-col xs:flex-row items-center gap-3 xs:gap-4 sm:gap-6 text-xs sm:text-sm text-gray-500">
              <div className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                hello@careercode.com.ng
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                San Francisco, CA
              </div>
              <div className="hidden sm:flex items-center gap-1.5">
                <Phone className="w-4 h-4" />
                +1 (555) 123-4567
              </div>
            </div>
            <p className="text-xs sm:text-sm text-gray-400 text-center xs:text-left">
              &copy; {new Date().getFullYear()} CareerCode Academy. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
