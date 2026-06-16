import React, { useState, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const faqs = [
  {
    question: 'Do I need prior coding experience to join?',
    answer:
      'Not at all! Our courses range from beginner to advanced levels. We have structured paths for complete beginners with no prior experience, as well as advanced tracks for experienced developers looking to upskill.',
  },
  {
    question: 'How long does it take to complete a course?',
    answer:
      'Course duration varies from 8 to 24 weeks depending on the program. Most students complete our flagship Full-Stack Web Development course in 16 weeks by dedicating 15-20 hours per week.',
  },
  {
    question: 'Is there a job guarantee?',
    answer:
      'We offer a 95% job placement rate within 6 months of graduation. Our career services team provides resume reviews, interview preparation, and direct connections with 500+ hiring partners.',
  },
  {
    question: 'What kind of projects will I build?',
    answer:
      'You will build real-world projects that mirror industry requirements. Examples include e-commerce platforms, social media dashboards, data visualization tools, and mobile apps that you can add to your portfolio.',
  },
  {
    question: 'Do you offer payment plans?',
    answer:
      'Yes! We offer flexible payment plans including monthly installments, income share agreements (ISA), and need-based scholarships. Contact our admissions team to discuss options that work for you.',
  },
  {
    question: 'Can I interact with instructors and mentors?',
    answer:
      'Absolutely! Each student is assigned a dedicated mentor who provides 1-on-1 guidance. Our instructors hold weekly live Q&A sessions, and you can ask questions in our community forums anytime.',
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const baseId = useId();

  return (
    <section className="py-20 relative">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="w-14 h-14 rounded-xl bg-primary-500/10 flex items-center justify-center mx-auto mb-4">
            <HelpCircle className="w-7 h-7 text-primary-500" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Frequently Asked <span className="gradient-text">Questions</span>
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Got questions? We've got answers. Can't find what you're looking for? Contact our support team.
          </p>
        </motion.div>

        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            const headingId = `${baseId}-h-${index}`;
            const panelId = `${baseId}-p-${index}`;
            return (
              <div
                key={index}
                className={cn(
                  'rounded-2xl border transition-all duration-300',
                  isOpen
                    ? 'border-primary-500/30 bg-primary-500/5'
                    : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white/50 dark:bg-gray-900/50'
                )}
              >
                <h3>
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    id={headingId}
                    className="flex items-center justify-between w-full p-5 text-left cursor-pointer"
                  >
                    <span className="font-medium text-gray-900 dark:text-white pr-4">
                      {faq.question}
                    </span>
                    <ChevronDown
                      className={cn(
                        'w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-300',
                        isOpen && 'rotate-180'
                      )}
                    />
                  </button>
                </h3>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      id={panelId}
                      role="region"
                      aria-labelledby={headingId}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-5 text-gray-600 dark:text-gray-400 leading-relaxed">
                        {faq.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
