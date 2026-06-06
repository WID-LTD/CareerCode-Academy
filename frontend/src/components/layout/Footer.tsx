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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 relative">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
          <div className="col-span-2 md:col-span-2 lg:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 gradient-bg rounded-xl flex items-center justify-center overflow-hidden">
                <img src="/screen.png" alt="CareerCode Logo" className="w-full h-full object-contain" />
              </div>
              <span className="text-xl font-bold gradient-text">CareerCode</span>
            </Link>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed max-w-sm mb-6">
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
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                {title}
              </h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.path}
                      className="text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-1.5">
                <Mail className="w-4 h-4" />
                hello@careercode.academy
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                San Francisco, CA
              </div>
              <div className="flex items-center gap-1.5">
                <Phone className="w-4 h-4" />
                +1 (555) 123-4567
              </div>
            </div>
            <p className="text-sm text-gray-400">
              &copy; {new Date().getFullYear()} CareerCode Academy. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
