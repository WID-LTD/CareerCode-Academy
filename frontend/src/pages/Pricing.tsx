import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, X, Sparkles, Rocket, Star, ArrowRight } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { NeonButton } from '@/components/ui/NeonButton';
import { cn } from '@/lib/utils';

const plans = [
  {
    name: 'Starter',
    price: 0,
    description: 'Perfect for exploring and getting started with coding.',
    features: [
      'Access to 10 free courses',
      'Basic community access',
      'Code playground',
      'Weekly newsletter',
      'Public forum support',
    ],
    missing: ['Project reviews', 'Mentorship sessions', 'Certificates', 'Job placement support'],
    cta: 'Get Started Free',
    popular: false,
  },
  {
    name: 'Pro',
    price: 49,
    period: '/month',
    description: 'For serious learners committed to career transformation.',
    features: [
      'All courses unlimited access',
      'Full community access',
      'Project reviews by mentors',
      'Monthly 1-on-1 mentorship',
      'Course certificates',
      'Career resources',
      'Priority support',
    ],
    missing: ['Job placement guarantee', 'Resume reviews'],
    cta: 'Start Pro',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 199,
    period: '/month',
    description: 'For teams and organizations investing in developer talent.',
    features: [
      'Everything in Pro',
      'Unlimited mentorship sessions',
      'Custom learning paths',
      'Team analytics dashboard',
      'Dedicated account manager',
      'Job placement guarantee',
      'Resume & interview prep',
      'API access',
    ],
    missing: [],
    cta: 'Contact Sales',
    popular: false,
  },
];

const faq = [
  { q: 'Can I switch plans anytime?', a: 'Yes, you can upgrade or downgrade at any time. Changes take effect immediately.' },
  { q: 'Is there a free trial for Pro?', a: 'Yes, we offer a 7-day free trial of Pro with full access to all features.' },
  { q: 'What payment methods do you accept?', a: 'We accept all major credit cards, PayPal, and cryptocurrency.' },
  { q: 'Can I get a refund?', a: 'Yes, we offer a 30-day money-back guarantee on all paid plans.' },
];

export default function Pricing() {
  const [yearly, setYearly] = useState(false);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <section className="py-20 relative">
        <div className="absolute inset-0 gradient-bg-subtle" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              Simple, <span className="gradient-text">Transparent</span> Pricing
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
              Choose the plan that fits your learning journey. All plans include access to our core platform.
            </p>

            <div className="inline-flex items-center gap-3 p-1.5 glass rounded-2xl">
              <button
                onClick={() => setYearly(false)}
                className={cn('px-6 py-2 rounded-xl text-sm font-medium transition-all', !yearly && 'bg-primary-500 text-white shadow-lg shadow-primary-500/25')}
              >
                Monthly
              </button>
              <button
                onClick={() => setYearly(true)}
                className={cn('px-6 py-2 rounded-xl text-sm font-medium transition-all', yearly && 'bg-primary-500 text-white shadow-lg shadow-primary-500/25')}
              >
                Yearly <span className="text-accent-500 font-semibold">Save 20%</span>
              </button>
            </div>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="relative"
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                    <span className="inline-flex items-center gap-1 px-4 py-1.5 bg-gradient-to-r from-primary-500 to-accent-500 text-white text-xs font-semibold rounded-full shadow-lg">
                      <Sparkles className="w-3 h-3" /> Most Popular
                    </span>
                  </div>
                )}
                <GlassCard className={cn('p-8 h-full', plan.popular && 'ring-2 ring-primary-500/50')}>
                  <div className="mb-6">
                    <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                    <p className="text-sm text-gray-500 mb-4">{plan.description}</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold">${yearly ? Math.round(plan.price * 0.8) : plan.price}</span>
                      {plan.price > 0 && <span className="text-gray-400 text-sm">{plan.period}</span>}
                    </div>
                    {plan.price === 0 && <span className="text-sm text-gray-400">forever free</span>}
                  </div>

                  <Link to={plan.price === 0 ? '/signup' : '/signup?plan=pro'}>
                    {plan.popular ? (
                      <NeonButton color="blue" className="w-full mb-6">{plan.cta}</NeonButton>
                    ) : (
                      <Button variant={plan.price === 0 ? 'outline' : 'primary'} className="w-full mb-6">{plan.cta}</Button>
                    )}
                  </Link>

                  <div className="space-y-3">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-3 text-sm">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                      </div>
                    ))}
                    {plan.missing.map((feature) => (
                      <div key={feature} className="flex items-start gap-3 text-sm text-gray-400">
                        <X className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>

          <div className="max-w-2xl mx-auto mt-16">
            <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
            <div className="space-y-3">
              {faq.map((item) => (
                <GlassCard key={item.q} className="p-5" hover={false}>
                  <h3 className="font-medium mb-1">{item.q}</h3>
                  <p className="text-sm text-gray-500">{item.a}</p>
                </GlassCard>
              ))}
            </div>
          </div>
        </div>
      </section>
    </motion.div>
  );
}
