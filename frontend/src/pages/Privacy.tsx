import React from 'react';
import { motion } from 'framer-motion';
import { Shield, FileText } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';

const sections = [
  { title: '1. Information We Collect', content: 'We collect information you provide directly, including name, email address, payment information, and profile details. We also automatically collect usage data such as pages visited, time spent on courses, and interaction patterns to improve our platform.' },
  { title: '2. How We Use Your Information', content: 'Your information is used to provide and improve our educational services, process payments, send updates and marketing communications (with consent), personalize your learning experience, and analyze platform usage to enhance our curriculum.' },
  { title: '3. Data Sharing & Disclosure', content: 'We do not sell your personal information. We may share data with trusted third-party service providers who help us operate the platform (payment processors, cloud hosting, analytics). These providers are contractually bound to protect your data.' },
  { title: '4. Data Security', content: 'We implement industry-standard security measures including encryption at rest and in transit, regular security audits, and strict access controls. However, no method of transmission over the Internet is 100% secure.' },
  { title: '5. Your Rights', content: 'You have the right to access, correct, or delete your personal data. You can manage your data through account settings or by contacting us. You may opt out of marketing communications at any time.' },
  { title: '6. Cookies', content: 'We use cookies and similar technologies to enhance your experience, analyze usage, and deliver relevant content. You can manage cookie preferences through your browser settings. See our Cookie Policy for more details.' },
  { title: '7. Data Retention', content: 'We retain your account information for as long as your account is active. Course progress and certificates are retained indefinitely to maintain your learning history. Deleted account data is purged within 90 days.' },
  { title: '8. Children Privacy', content: 'The Platform is not intended for children under 13. We do not knowingly collect data from children. If you believe a child has provided us with personal data, please contact us immediately.' },
  { title: '9. International Transfers', content: 'Your data may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place through standard contractual clauses and data processing agreements.' },
  { title: '10. Changes to This Policy', content: 'We may update this Privacy Policy periodically. Material changes will be notified via email or platform notice. Continued use after changes constitutes acceptance of the updated policy.' },
];

export default function Privacy() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <section className="py-20 relative">
        <div className="absolute inset-0 gradient-bg-subtle" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
            <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-6">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              Privacy <span className="gradient-text">Policy</span>
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Last updated: January 1, 2026
            </p>
          </motion.div>

          <GlassCard className="p-8 mb-8">
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              At CareerCode Academy, we take your privacy seriously. This policy describes how we collect, 
              use, and protect your personal information when you use our platform.
            </p>
          </GlassCard>

          <div className="space-y-6">
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
        </div>
      </section>
    </motion.div>
  );
}
