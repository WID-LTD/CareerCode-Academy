import React from 'react';
import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';

export default function Terms() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <section className="py-20 relative">
        <div className="absolute inset-0 gradient-bg-subtle" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
            <div className="w-14 h-14 rounded-xl bg-primary-500/10 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-7 h-7 text-primary-500" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              Terms of <span className="gradient-text">Service</span>
            </h1>
            <p className="text-gray-600 dark:text-gray-400">Last updated: January 1, 2026</p>
          </motion.div>

          <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">1. Acceptance of Terms</h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                By accessing or using CareerCode Academy (&ldquo;the Platform&rdquo;), you agree to be bound by these Terms of Service. 
                If you do not agree to all the terms, you may not access or use the Platform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">2. Accounts</h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                You are responsible for maintaining the confidentiality of your account credentials and for all activities 
                that occur under your account. You must notify us immediately of any unauthorized use of your account.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">3. Payments & Refunds</h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                All fees are charged in the currency specified at checkout. We offer a 30-day money-back guarantee on all 
                course purchases. Refund requests must be submitted within 30 days of purchase.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">4. Intellectual Property</h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                All course content, including videos, code samples, and documentation, is the intellectual property of 
                CareerCode Academy and WID LTD. You may not distribute, modify, or resell any content without written permission.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">5. Code of Conduct</h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Users must maintain a respectful and professional demeanor in all platform interactions. Harassment, 
                cheating, or any form of academic dishonesty will result in immediate account suspension.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">6. Limitation of Liability</h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                CareerCode Academy and WID LTD shall not be liable for any indirect, incidental, or consequential damages 
                arising from your use of the Platform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">7. Changes to Terms</h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                We reserve the right to modify these terms at any time. Users will be notified of material changes via email 
                or platform notification.
              </p>
            </section>
          </div>
        </div>
      </section>
    </motion.div>
  );
}
