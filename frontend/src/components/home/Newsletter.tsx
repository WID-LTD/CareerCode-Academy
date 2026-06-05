import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Mail, Bell } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function Newsletter() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail('');
    }
  };

  return (
    <section className="py-20 relative">
      <div className="absolute inset-0 gradient-bg opacity-5" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-card p-8 sm:p-12 text-center relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

          <div className="relative">
            <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-6">
              <Mail className="w-8 h-8 text-white" />
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Stay <span className="gradient-text">Updated</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-xl mx-auto mb-8">
              Get weekly insights, course updates, and career tips delivered straight to your inbox.
              Join 10,000+ developers already leveling up.
            </p>

            {subscribed ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center justify-center gap-3 text-green-600 dark:text-green-400 font-semibold"
              >
                <Bell className="w-5 h-5" />
                You're subscribed! Check your inbox for confirmation.
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="max-w-md mx-auto flex gap-3">
                <div className="flex-1 relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all"
                  />
                </div>
                <Button type="submit" icon={<Send className="w-4 h-4" />}>
                  Subscribe
                </Button>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
