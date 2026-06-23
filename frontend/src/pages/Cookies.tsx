import React from 'react';
import { motion } from 'framer-motion';
import { Cookie } from 'lucide-react';

export default function Cookies() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <section className="py-20 relative">
        <div className="absolute inset-0 gradient-bg-subtle" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
            <div className="w-14 h-14 rounded-xl bg-primary-500/10 flex items-center justify-center mx-auto mb-4">
              <Cookie className="w-7 h-7 text-primary-500" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              Cookie <span className="gradient-text">Policy</span>
            </h1>
            <p className="text-gray-600 dark:text-gray-400">Last updated: January 1, 2026</p>
          </motion.div>

          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">1. What Are Cookies</h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Cookies are small text files stored on your device by your web browser. They help us remember your 
                preferences, authenticate your session, and improve your overall experience on our platform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">2. How We Use Cookies</h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                We use essential cookies for authentication and security. Analytics cookies help us understand how 
                you use the platform. Preference cookies remember your settings like theme and language preferences.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">3. Types of Cookies We Use</h2>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 leading-relaxed space-y-2">
                <li><strong>Essential:</strong> Required for platform functionality (authentication, security)</li>
                <li><strong>Analytics:</strong> Help us understand usage patterns (page views, feature adoption)</li>
                <li><strong>Preferences:</strong> Remember your settings (theme, language, course progress)</li>
                <li><strong>Session:</strong> Temporary cookies that expire when you close your browser</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">4. Managing Cookies</h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                You can control and manage cookies through your browser settings. Disabling certain cookies may 
                affect platform functionality, including the ability to log in or complete courses.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">5. Third-Party Cookies</h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                We use trusted third-party services (such as analytics providers and payment processors) that may 
                set their own cookies. These cookies are governed by the respective third-party privacy policies.
              </p>
            </section>
          </div>
        </div>
      </section>
    </motion.div>
  );
}
