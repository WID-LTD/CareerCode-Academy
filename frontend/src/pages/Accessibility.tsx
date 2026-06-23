import React from 'react';
import { motion } from 'framer-motion';
import { Accessibility } from 'lucide-react';

export default function AccessibilityPage() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <section className="py-20 relative">
        <div className="absolute inset-0 gradient-bg-subtle" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
            <div className="w-14 h-14 rounded-xl bg-primary-500/10 flex items-center justify-center mx-auto mb-4">
              <Accessibility className="w-7 h-7 text-primary-500" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              <span className="gradient-text">Accessibility</span> Statement
            </h1>
            <p className="text-gray-600 dark:text-gray-400">Last updated: January 1, 2026</p>
          </motion.div>

          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Our Commitment</h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                CareerCode Academy is committed to ensuring digital accessibility for all learners, including those 
                with disabilities. We continuously improve the user experience and apply relevant accessibility standards.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Standards</h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                We strive to conform to the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA. These guidelines 
                explain how to make web content more accessible to people with a wide range of disabilities.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Features</h2>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 leading-relaxed space-y-2">
                <li>Keyboard navigation support across all platform features</li>
                <li>Screen reader compatible interface elements</li>
                <li>Color contrast ratios meeting WCAG AA requirements</li>
                <li>Alternative text for all meaningful images and icons</li>
                <li>Responsive design that works with screen magnifiers</li>
                <li>Transcripts and captions for video content</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Feedback</h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                We welcome your feedback on the accessibility of CareerCode Academy. Please let us know if you 
                encounter any barriers by contacting our accessibility team at accessibility@careercode.academy 
                or calling +1 (555) 123-4567.
              </p>
            </section>
          </div>
        </div>
      </section>
    </motion.div>
  );
}
