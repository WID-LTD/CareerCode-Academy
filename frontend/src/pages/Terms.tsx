import React from 'react';
import { motion } from 'framer-motion';
import { Scale, FileText } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';

const sections = [
  { title: '1. Acceptance of Terms', content: 'By accessing or using CareerCode Academy ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree, please do not use the Platform. We reserve the right to update these terms at any time, and continued use constitutes acceptance of changes.' },
  { title: '2. Account Registration', content: 'You must create an account to access certain features. You are responsible for maintaining the confidentiality of your credentials and for all activities under your account. You must be at least 13 years old to use the Platform.' },
  { title: '3. Subscriptions & Billing', content: 'Paid plans are billed in advance on a monthly or annual basis. You may cancel at any time, and access will continue until the end of the billing period. Refunds are handled in accordance with our 30-day money-back guarantee.' },
  { title: '4. Intellectual Property', content: 'All course materials, including videos, code samples, exercises, and documentation, are the intellectual property of CareerCode Academy. You may not redistribute, resell, or publicly share course content without written permission.' },
  { title: '5. User Conduct', content: 'You agree to use the Platform responsibly. Prohibited activities include harassment, cheating on assessments, attempting to bypass security measures, and using the Platform for any illegal purpose.' },
  { title: '6. Certification', content: 'Certificates are awarded upon successful completion of course requirements. We reserve the right to revoke certificates if fraud or policy violations are discovered. Certificate verification is available to employers.' },
  { title: '7. Limitation of Liability', content: 'CareerCode Academy provides educational content "as is" without warranties of any kind. We are not liable for any damages arising from your use of the Platform, including but not limited to loss of data or missed employment opportunities.' },
  { title: '8. Termination', content: 'We may suspend or terminate accounts for violations of these terms. You may delete your account at any time through settings. Upon termination, your access to paid content will cease.' },
  { title: '9. Governing Law', content: 'These terms are governed by the laws of the State of California. Any disputes shall be resolved through binding arbitration in San Francisco County.' },
  { title: '10. Contact', content: 'For questions about these terms, please contact us at legal@careercode.academy or through our Contact page.' },
];

export default function Terms() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <section className="py-20 relative">
        <div className="absolute inset-0 gradient-bg-subtle" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
            <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-6">
              <Scale className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              Terms of <span className="gradient-text">Service</span>
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Last updated: January 1, 2026
            </p>
          </motion.div>

          <GlassCard className="p-8 mb-8">
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
              Please read these Terms of Service carefully before using the CareerCode Academy platform.
              By accessing or using our service, you agree to be bound by these terms.
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
