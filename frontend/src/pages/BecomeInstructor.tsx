import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Globe2, DollarSign, Clock, Users, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

const benefits = [
  {
    icon: Globe2,
    title: 'Global Reach',
    description: 'Teach students from over 100 countries and make a worldwide impact.'
  },
  {
    icon: DollarSign,
    title: 'Earn Money',
    description: 'Create a sustainable income stream by sharing your expertise.'
  },
  {
    icon: Clock,
    title: 'Flexible Schedule',
    description: 'Teach on your own terms. Create courses at your own pace.'
  },
  {
    icon: Users,
    title: 'Vibrant Community',
    description: 'Join a network of passionate educators and dedicated students.'
  }
];

const steps = [
  'Apply to become an instructor',
  'Create your first course',
  'Launch and start earning',
  'Engage with your students'
];

export default function BecomeInstructor() {
  return (
    <div className="pt-24 pb-16">
      {/* Hero Section */}
      <section className="relative px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto"
        >
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight">
            Teach the Next Generation of <span className="gradient-text">Developers</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
            Share your knowledge, inspire students worldwide, and build a rewarding career by teaching at CareerCode Academy.
          </p>
          <Link to="/apply">
            <Button size="lg" className="h-14 px-8 text-lg rounded-2xl shadow-lg shadow-primary-500/25">
              Apply Now
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* Benefits Section */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Why Teach With Us?</h2>
          <p className="text-gray-600 dark:text-gray-400">Discover the benefits of joining our instructor community.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {benefits.map((benefit, index) => (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="p-6 rounded-2xl glass-card text-center"
            >
              <div className="w-14 h-14 mx-auto bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-2xl flex items-center justify-center mb-6">
                <benefit.icon className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3">{benefit.title}</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {benefit.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it Works Section */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="bg-primary-50 dark:bg-primary-900/10 rounded-3xl p-8 md:p-12 lg:p-16 text-center lg:text-left flex flex-col lg:flex-row items-center gap-12">
          <div className="flex-1">
            <h2 className="text-3xl font-bold mb-6">How It Works</h2>
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div key={index} className="flex items-center gap-4 text-lg text-gray-700 dark:text-gray-300">
                  <CheckCircle2 className="w-6 h-6 text-primary-500 flex-shrink-0" />
                  <span>{step}</span>
                </div>
              ))}
            </div>
            <div className="mt-8">
              <Link to="/apply">
                <Button size="lg">Start Your Journey</Button>
              </Link>
            </div>
          </div>
          <div className="flex-1 w-full max-w-md">
            {/* Placeholder for an illustration or image */}
            <div className="aspect-square rounded-2xl gradient-bg opacity-80 shadow-2xl flex items-center justify-center">
              <Users className="w-32 h-32 text-white/50" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
