import React from 'react';
import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';

export default function Privacy() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <section className="py-20 relative">
        <div className="absolute inset-0 gradient-bg-subtle" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
            <div className="w-14 h-14 rounded-xl bg-primary-500/10 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-7 h-7 text-primary-500" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              Privacy <span className="gradient-text">Policy</span>
            </h1>
            <p className="text-gray-600 dark:text-gray-400">Last updated: January 1, 2026</p>
          </motion.div>

          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">1. Information We Collect</h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                We collect information you provide when creating an account, including your name, email address, 
                and payment information. We also collect usage data such as course progress, quiz results, and 
                platform interactions to improve your learning experience.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">2. How We Use Your Information</h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Your information is used to provide and improve our services, process payments, send course-related 
                communications, and personalize your learning experience. We do not sell your personal data to third parties.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">3. Data Security</h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                We implement industry-standard security measures including encryption at rest and in transit, 
                regular security audits, and access controls to protect your personal information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">4. Data Retention</h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                We retain your account information for as long as your account is active. You may request deletion 
                of your account and associated data at any time by contacting our support team.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">5. Your Rights</h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                You have the right to access, correct, or delete your personal data. You may also request a copy 
                of your data in a portable format. Contact us at privacy@careercode.academy to exercise these rights.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">6. Contact</h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                For privacy-related inquiries, contact our Data Protection Officer at privacy@careercode.academy 
                or write to WID LTD, 123 Tech Street, Lagos, Nigeria.
              </p>
            </section>
          </div>
        </div>
      </section>
    </motion.div>
  );
}
