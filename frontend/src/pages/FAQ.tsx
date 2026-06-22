import React, { useState, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle, Search, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GlassCard } from '@/components/ui/GlassCard';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Link } from 'react-router-dom';

const categories = [
  { name: 'Getting Started', icon: HelpCircle },
  { name: 'Courses & Curriculum', icon: HelpCircle },
  { name: 'Pricing & Payments', icon: HelpCircle },
  { name: 'Technical Support', icon: HelpCircle },
  { name: 'Certificates', icon: HelpCircle },
  { name: 'Career Services', icon: HelpCircle },
];

const faqs = [
  {
    category: 'Getting Started',
    items: [
      { q: 'How do I create an account?', a: 'Click the "Get Started" button on the homepage and fill in your details. You can sign up with your email or Google account. Verification is instant, and you can start learning immediately.' },
      { q: 'Is there a free trial?', a: 'Yes! We offer a 7-day free trial of our Pro plan with full access to all features. No credit card required for the Starter plan, which includes 10 free courses.' },
      { q: 'Do I need prior coding experience?', a: 'Not at all! Our courses range from beginner to advanced levels. We recommend starting with our "Intro to Programming" path if you are completely new to coding.' },
      { q: 'Can I switch plans later?', a: 'Absolutely. You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we will prorate your billing accordingly.' },
    ],
  },
  {
    category: 'Courses & Curriculum',
    items: [
      { q: 'How are courses structured?', a: 'Each course is divided into modules with video lessons, interactive coding exercises, quizzes, and hands-on projects. You learn by building real-world applications.' },
      { q: 'Can I learn at my own pace?', a: 'Yes! All courses are self-paced. You can access course materials 24/7 and learn at whatever speed works best for you.' },
      { q: 'Are the courses updated regularly?', a: 'We update our curriculum every quarter to reflect the latest industry trends, tools, and best practices. You get lifetime access to all updates.' },
      { q: 'What languages and frameworks do you teach?', a: 'We cover JavaScript, TypeScript, Python, React, Node.js, Next.js, MongoDB, PostgreSQL, Docker, AWS, and many more. Our full-stack path covers the most in-demand technologies.' },
    ],
  },
  {
    category: 'Pricing & Payments',
    items: [
      { q: 'What payment methods do you accept?', a: 'We accept all major credit cards (Visa, Mastercard, American Express), PayPal, and cryptocurrency. For enterprise plans, we also support invoicing.' },
      { q: 'Do you offer student discounts?', a: 'Yes! We offer a 50% discount for verified students. You can apply through our support team with your student ID or institutional email.' },
      { q: 'What is your refund policy?', a: 'We offer a 30-day money-back guarantee on all paid plans. If you are not satisfied, contact our support team for a full refund.' },
      { q: 'Can I gift a subscription?', a: 'Yes! You can purchase gift subscriptions for friends and family. Gift recipients get full access to the plan you choose.' },
    ],
  },
  {
    category: 'Technical Support',
    items: [
      { q: 'What browsers are supported?', a: 'We support the latest versions of Chrome, Firefox, Safari, and Edge. For the best experience, we recommend using Chrome.' },
      { q: 'Is there a mobile app?', a: 'Yes, our mobile app is available for both iOS and Android. You can watch lessons, complete exercises, and participate in discussions on the go.' },
      { q: 'How do I report a bug?', a: 'You can report bugs through our Help Center or email support@careercode.academy. We typically respond within 24 hours.' },
      { q: 'My code is not running. What should I do?', a: 'First, check our troubleshooting guide in the Help Center. If you are still stuck, our community forums and mentor support are available to help.' },
    ],
  },
  {
    category: 'Certificates',
    items: [
      { q: 'Do you provide certificates?', a: 'Yes! Upon completing a course, you receive a verified certificate that you can share on LinkedIn and add to your resume.' },
      { q: 'Are the certificates accredited?', a: 'Our certificates are industry-recognized but not academic credits. They demonstrate your practical skills to employers.' },
      { q: 'Can I verify a certificate?', a: 'Yes, employers can verify certificates through our verification page at /verify-certificate using the unique code on your certificate.' },
    ],
  },
  {
    category: 'Career Services',
    items: [
      { q: 'Do you offer job placement assistance?', a: 'Pro and Enterprise plans include career services such as resume reviews, portfolio building, mock interviews, and direct connections with 500+ hiring partners.' },
      { q: 'What is the job placement rate?', a: 'Our job placement rate is 95% within 6 months of graduation. This includes full-time roles, internships, and freelance opportunities.' },
      { q: 'Do you help with interview preparation?', a: 'Absolutely! We offer mock interviews with industry professionals, system design practice sessions, and access to our interview question bank.' },
    ],
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<{ category: number; item: number } | null>(null);
  const [activeCategory, setActiveCategory] = useState('Getting Started');
  const [searchQuery, setSearchQuery] = useState('');
  const baseId = useId();

  const filteredFaqs = faqs.map((cat) => ({
    ...cat,
    items: cat.items.filter(
      (item) =>
        item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.a.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  }));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <section className="py-20 relative">
        <div className="absolute inset-0 gradient-bg-subtle" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
            <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-6">
              <HelpCircle className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              Frequently Asked <span className="gradient-text">Questions</span>
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
              Everything you need to know about CareerCode Academy. Can not find what you are looking for? Contact our support team.
            </p>
            <div className="max-w-md mx-auto">
              <Input
                placeholder="Search questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search className="w-4 h-4" />}
              />
            </div>
          </motion.div>

          <div className="flex flex-wrap gap-2 mb-8 justify-center">
            {categories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => setActiveCategory(cat.name)}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-medium transition-all',
                  activeCategory === cat.name
                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                    : 'glass hover:bg-white/80 dark:hover:bg-gray-800/80'
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="space-y-8">
            {filteredFaqs.map((category, catIdx) =>
              category.items.length > 0 && (activeCategory === category.name || activeCategory === 'All') ? (
                <div key={category.name}>
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center">
                      <HelpCircle className="w-4 h-4 text-primary-500" />
                    </span>
                    {category.name}
                  </h2>
                  <div className="space-y-3">
                    {category.items.map((faq, itemIdx) => {
                      const isOpen = openIndex?.category === catIdx && openIndex?.item === itemIdx;
                      const headingId = `${baseId}-h-${catIdx}-${itemIdx}`;
                      const panelId = `${baseId}-p-${catIdx}-${itemIdx}`;
                      return (
                        <div
                          key={faq.q}
                          className={cn(
                            'rounded-2xl border transition-all duration-300',
                            isOpen
                              ? 'border-primary-500/30 bg-primary-500/5'
                              : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white/50 dark:bg-gray-900/50'
                          )}
                        >
                          <h3>
                            <button
                              onClick={() => setOpenIndex(isOpen ? null : { category: catIdx, item: itemIdx })}
                              aria-expanded={isOpen}
                              aria-controls={panelId}
                              id={headingId}
                              className="flex items-center justify-between w-full p-5 text-left cursor-pointer"
                            >
                              <span className="font-medium text-gray-900 dark:text-white pr-4">
                                {faq.q}
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
                                  {faq.a}
                                </p>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null
            )}
          </div>

          <div className="mt-12 text-center">
            <GlassCard className="p-8">
              <MessageCircle className="w-10 h-10 text-primary-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Still Have Questions?</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Our support team is here to help you with anything you need.
              </p>
              <Link to="/contact">
                <Button>Contact Support</Button>
              </Link>
            </GlassCard>
          </div>
        </div>
      </section>
    </motion.div>
  );
}
