import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, MapPin, Send, MessageSquare, Clock, CheckCircle, AlertCircle, Phone } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import SEO from '@/components/seo/SEO';
import { usePageContent } from '@/hooks/usePageContent';

const defaultContact = {
  heading: 'Get in Touch',
  subheading: 'Have a question, feedback, or just want to say hello? We would love to hear from you.',
  email: 'contact@widltd.com.ng',
  supportEmail: 'hello@careercode.com.ng',
  phone: '+234 816 496 1457',
  office: 'Agbara, Ogun State, Nigeria',
  hours: 'Mon–Fri, 8:00 AM – 6:00 PM WAT',
  successMessage: 'We will get back to you within 24 hours.',
};

export default function Contact() {
  const page = usePageContent('contact', defaultContact);
  const contact = { ...defaultContact, ...(page as any) };
  const contactInfo = [
    { icon: Mail, label: 'Email', value: contact.email, href: `mailto:${contact.email}` },
    { icon: Mail, label: 'Learner support', value: contact.supportEmail, href: `mailto:${contact.supportEmail}` },
    { icon: Phone, label: 'Phone', value: contact.phone, href: `tel:${String(contact.phone).replace(/\s+/g, '')}` },
    { icon: MapPin, label: 'Office', value: contact.office, href: `https://maps.google.com/?q=${encodeURIComponent(contact.office)}` },
    { icon: Clock, label: 'Hours', value: contact.hours, href: '' },
  ];
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await api.post('/contact', formData);
      setSubmitted(true);
      toast.success('Message sent successfully!');
    } catch (err) {
      toast.error('Failed to send message. Please try again later.');
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <SEO title="Contact" description="Contact CareerCode Academy, the education venture of WID LTD (RC 8824091), Agbara, Ogun State, Nigeria." />
      <section className="py-20 relative">
        <div className="absolute inset-0 gradient-bg-subtle" />
        <div className="max-w-screen-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              {contact.heading}
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              {contact.subheading}
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="space-y-4">
              {contactInfo.map((info) => {
                const content = (
                  <>
                    <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                      <info.icon className="w-5 h-5 text-primary-500" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">{info.label}</div>
                      <div className="font-medium text-sm text-gray-900 dark:text-white">{info.value}</div>
                    </div>
                  </>
                );
                return (
                  <GlassCard key={info.label} className="p-5" hover={false}>
                    {info.href ? (
                      <a href={info.href} className="flex items-center gap-4">{content}</a>
                    ) : (
                      <div className="flex items-center gap-4">{content}</div>
                    )}
                  </GlassCard>
                );
              })}
            </div>

            <div className="lg:col-span-2">
              <GlassCard className="p-8">
                {submitted ? (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12">
                    <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Message Sent!</h3>
                    <p className="text-gray-500">{contact.successMessage}</p>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid sm:grid-cols-2 gap-5">
                      <Input label="Your Name" placeholder="John Doe" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                      <Input label="Your Email" type="email" placeholder="john@example.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
                    </div>
                    <Input label="Subject" placeholder="How can we help?" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} required />
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Message</label>
                      <textarea
                        rows={6}
                        placeholder="Tell us more about your inquiry..."
                        className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 px-4 py-2.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all"
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        required
                      />
                    </div>
                    <Button type="submit" size="lg" icon={<Send className="w-4 h-4" />} disabled={sending}>
                      {sending ? 'Sending...' : 'Send Message'}
                    </Button>
                  </form>
                )}
              </GlassCard>
            </div>
          </div>
        </div>
      </section>
    </motion.div>
  );
}
