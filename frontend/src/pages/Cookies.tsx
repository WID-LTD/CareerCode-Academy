import React from 'react';
import { motion } from 'framer-motion';
import { Cookie, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GlassCard } from '@/components/ui/GlassCard';

const sections = [
  { title: '1. What Are Cookies', content: 'Cookies are small text files stored on your device by your web browser. They help websites remember your preferences, login status, and other information to provide a better browsing experience.' },
  { title: '2. How We Use Cookies', content: 'We use cookies to authenticate your account, remember your preferences (including theme and language settings), analyze platform usage to improve our services, deliver relevant content and marketing, and maintain session state during course playback.' },
  { title: '3. Types of Cookies We Use', content: 'Essential cookies are required for the platform to function (login, security). Analytics cookies help us understand how you interact with our platform. Preference cookies remember your settings. Marketing cookies track your engagement with our campaigns.' },
  { title: '4. Third-Party Cookies', content: 'Some third-party services we use may place cookies on your device. These include payment processors (Stripe), analytics providers, and video hosting platforms. We do not control these cookies and recommend reviewing their privacy policies.' },
  { title: '5. Managing Cookies', content: 'You can control and delete cookies through your browser settings. Most browsers allow you to block or delete cookies. Note that disabling essential cookies may affect platform functionality, including login and course progress tracking.' },
  { title: '6. Cookie Retention', content: 'Session cookies expire when you close your browser. Persistent cookies remain on your device for up to 12 months or until manually deleted. You can clear cookies at any time through your browser settings.' },
  { title: '7. Do Not Track', content: 'Our platform does not respond to Do Not Track (DNT) signals at this time. We follow industry standards and provide you with control over cookies through browser settings.' },
  { title: '8. Updates to This Policy', content: 'We may update this Cookie Policy from time to time. Changes will be posted on this page with an updated effective date. We encourage you to review this policy periodically.' },
];

const cookieTable = [
  { name: 'session_id', purpose: 'Authentication and session management', duration: 'Session', type: 'Essential' },
  { name: 'auth_token', purpose: 'Remember login status across pages', duration: '7 days', type: 'Essential' },
  { name: 'theme_pref', purpose: 'Remember dark/light mode preference', duration: '1 year', type: 'Preference' },
  { name: 'course_progress', purpose: 'Track course completion progress', duration: '1 year', type: 'Preference' },
  { name: 'ga_analytics', purpose: 'Analyze platform usage patterns', duration: '2 years', type: 'Analytics' },
  { name: 'marketing_ref', purpose: 'Track referral and campaign sources', duration: '90 days', type: 'Marketing' },
];

export default function Cookies() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <section className="py-20 relative">
        <div className="absolute inset-0 gradient-bg-subtle" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
            <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-6">
              <Cookie className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              Cookie <span className="gradient-text">Policy</span>
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Last updated: January 1, 2026
            </p>
          </motion.div>

          <GlassCard className="p-8 mb-8">
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              This Cookie Policy explains how CareerCode Academy uses cookies and similar tracking 
              technologies to enhance your experience on our platform.
            </p>
          </GlassCard>

          <div className="space-y-6 mb-12">
            {sections.map((section, i) => (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <GlassCard className="p-6" hover={false}>
                  <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary-500 flex-shrink-0" />
                    {section.title}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    {section.content}
                  </p>
                </GlassCard>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl font-bold text-center mb-6">Cookies We <span className="gradient-text">Use</span></h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-semibold">Cookie Name</th>
                    <th className="text-left py-3 px-4 font-semibold">Purpose</th>
                    <th className="text-left py-3 px-4 font-semibold">Duration</th>
                    <th className="text-left py-3 px-4 font-semibold">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {cookieTable.map((cookie) => (
                    <tr key={cookie.name} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-3 px-4 font-mono text-xs text-primary-500">{cookie.name}</td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{cookie.purpose}</td>
                      <td className="py-3 px-4 text-gray-500">{cookie.duration}</td>
                      <td className="py-3 px-4">
                        <span className={cn(
                          'px-2 py-0.5 rounded-lg text-xs font-medium',
                          cookie.type === 'Essential' && 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
                          cookie.type === 'Preference' && 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
                          cookie.type === 'Analytics' && 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
                          cookie.type === 'Marketing' && 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                        )}>
                          {cookie.type}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </section>
    </motion.div>
  );
}
