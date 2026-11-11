import React from 'react';
import { motion } from 'framer-motion';
import {
  Target, Eye, Heart, Users, Award, Globe, Code2, BookOpen, Lightbulb,
  ArrowRight, ShieldCheck, MapPin, Mail, Phone, Building2, Rocket, Landmark, Cpu,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Link } from 'react-router-dom';
import SEO from '@/components/seo/SEO';
import { usePublicStats } from '@/hooks/usePublicStats';

const values = [
  { icon: ShieldCheck, title: 'Integrity in contracts', desc: 'We say what we will do, do what we said, and are clear when something changes.' },
  { icon: Code2, title: 'Rigor in engineering', desc: 'Practical work, tested systems and evidence of skill over shortcuts and hype.' },
  { icon: Users, title: 'Generosity in knowledge', desc: 'We share what we learn with learners, teams and the wider technology community.' },
  { icon: Globe, title: 'Accessibility', desc: 'Technology education should be reachable regardless of background, location or starting point.' },
];

const pillars = [
  { icon: Building2, title: 'Prime Technology Contracting', desc: 'Full-cycle enterprise delivery — requirements, deployment and ongoing support for mission-critical systems.' },
  { icon: Lightbulb, title: 'Strategic Technology Consultancy', desc: 'Independent advisory on architecture, security, cloud strategy and vendor selection.' },
  { icon: Rocket, title: 'Startup Innovation Bridge', desc: 'MVP acceleration, cohort programmes and the technical scaffolding startups need to reach production.' },
  { icon: Landmark, title: 'Venture Holding & Core IP Governance', desc: 'Building, incubating and governing proprietary technology ventures across the WID portfolio.' },
];

const ventures = ['XperienceStore', 'GiGo AI', 'MedStack', 'Nova Flix', 'Flink'];

export default function About() {
  const stats = usePublicStats();
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <SEO title="About" description="CareerCode Academy is the education venture of WID LTD (RC 8824091), a Nigerian technology company based in Agbara, Ogun State." />

      <section className="py-20 relative">
        <div className="absolute inset-0 gradient-bg-subtle" />
        <div className="max-w-screen-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-3xl mx-auto mb-16">
            <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-6">
              <Code2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-6">
              Practical Tech Education, <span className="gradient-text">Built by WID LTD</span>
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
              CareerCode Academy is the education venture of <strong>WID LTD</strong>, a Nigerian technology company
              built on the philosophy of <strong>Unlimited Capability</strong>. We help beginners become job-ready
              developers through structured curriculum, real projects and human support.
            </p>
            <p className="text-sm text-gray-500 mt-4 inline-flex items-center gap-1.5">
              <MapPin className="w-4 h-4" /> Agbara, Ogun State, Nigeria
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 mb-16">
            <GlassCard className="p-8">
              <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-primary-500" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Our Mission</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                To engineer dependable systems and learning experiences that institutions and startups alike can
                stake their growth on.
              </p>
            </GlassCard>
            <GlassCard className="p-8">
              <div className="w-12 h-12 rounded-xl bg-accent-500/10 flex items-center justify-center mb-4">
                <Eye className="w-6 h-6 text-accent-500" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Our Vision</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                A digitally self-reliant Africa delivering technology the world depends on — starting with the people
                who build it.
              </p>
            </GlassCard>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-screen-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-6">
            <GlassCard className="p-6 lg:col-span-2" hover={false}>
              <div className="flex items-center gap-3 mb-4">
                <img src="/wid-ltd-logo.png" alt="WID LTD" className="h-9 w-auto" />
                <div>
                  <h2 className="text-xl font-bold">WID LTD</h2>
                  <p className="text-xs text-gray-500">The Motivation for Innovation</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-5">
                WID LTD engineers dependable technology — from enterprise infrastructure to startup launches — powered
                by the Unlimited Capability philosophy. Its four operational pillars are Prime Technology Contracting,
                Strategic Technology Consultancy, the Startup Innovation Bridge, and Venture Holding & Core IP Governance.
              </p>
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3">
                  <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Legal entity</p>
                  <p className="mt-1 font-medium">WID LTD</p>
                </div>
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3">
                  <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Registration</p>
                  <p className="mt-1 font-medium">RC 8824091</p>
                </div>
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3">
                  <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Jurisdiction</p>
                  <p className="mt-1 font-medium">Federal Republic of Nigeria (CAC)</p>
                </div>
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3">
                  <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Registered</p>
                  <p className="mt-1 font-medium">September 2025 · Active</p>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-6" hover={false}>
              <h2 className="text-lg font-semibold mb-3">Contact WID LTD</h2>
              <div className="space-y-3 text-sm">
                <a href="mailto:contact@widltd.com.ng" className="flex items-center gap-2 hover:text-primary-600">
                  <Mail className="w-4 h-4 text-gray-400" /> contact@widltd.com.ng
                </a>
                <a href="tel:+2348164961457" className="flex items-center gap-2 hover:text-primary-600">
                  <Phone className="w-4 h-4 text-gray-400" /> +234 816 496 1457
                </a>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5" /> Agbara, Ogun State, Nigeria
                </div>
                <a href="https://widltd.com.ng" target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-primary-600">
                  <Globe className="w-4 h-4 text-gray-400" /> widltd.com.ng
                </a>
              </div>
              <p className="text-xs text-gray-500 mt-4">Office hours: Mon–Fri, 8:00 AM – 6:00 PM WAT.</p>
            </GlassCard>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-screen-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">The WID LTD <span className="gradient-text">Pillars</span></h2>
            <p className="text-gray-600 dark:text-gray-400">One company, four ways of building and supporting technology.</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {pillars.map((p, i) => (
              <motion.div key={p.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
                <GlassCard className="p-6 h-full">
                  <div className="w-11 h-11 rounded-xl bg-primary-500/10 grid place-items-center mb-4">
                    <p.icon className="w-5 h-5 text-primary-500" />
                  </div>
                  <h3 className="font-semibold mb-1.5">{p.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{p.desc}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-screen-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((v, i) => (
              <motion.div key={v.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                <GlassCard className="p-6 text-center h-full">
                  <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center mx-auto mb-4">
                    <v.icon className="w-6 h-6 text-primary-500" />
                  </div>
                  <h3 className="font-semibold mb-2">{v.title}</h3>
                  <p className="text-sm text-gray-500">{v.desc}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-screen-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Learners', value: stats.students },
              { label: 'Published courses', value: stats.courses },
              { label: 'Certificates issued', value: stats.certificates },
              { label: 'Alumni', value: stats.alumni },
            ].filter((s) => s.value > 0).map((s) => (
              <GlassCard key={s.label} className="p-5 text-center" hover={false}>
                <p className="text-3xl font-bold gradient-text font-display tabular-nums">{s.value.toLocaleString()}</p>
                <p className="text-sm text-gray-500 mt-1">{s.label}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-screen-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <GlassCard className="p-6 sm:p-8" hover={false}>
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <img src="/ike-wisdom-okemsinachi.jpg" alt="Ike Wisdom Okemsinachi" className="w-24 h-24 rounded-2xl object-cover" />
              <div className="flex-1">
                <h2 className="text-xl font-bold">Ike Wisdom Okemsinachi</h2>
                <p className="text-sm text-primary-500 font-medium">Founder & Chief Executive, WID LTD</p>
                <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                  Nigerian entrepreneur, full-stack software engineer and AI researcher. Sole inventor of the
                  Unified E-Commerce System (UES) architecture and a Cisco Networking Academy Junior Cybersecurity Analyst.
                  He leads WID LTD and its venture portfolio, including CareerCode Academy.
                </p>
              </div>
              <a href="https://widltd.com.ng/about.html" target="_blank" rel="noreferrer">
                <Button variant="outline" size="sm">WID LTD profile <ArrowRight className="w-3.5 h-3.5 ml-1" /></Button>
              </a>
            </div>
          </GlassCard>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-screen-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-3">Part of the <span className="gradient-text">WID venture portfolio</span></h2>
            <p className="text-gray-600 dark:text-gray-400">WID LTD builds and governs technology ventures across commerce, AI, health and media.</p>
          </motion.div>
          <div className="flex flex-wrap justify-center gap-2">
            {ventures.map((v) => (
              <span key={v} className="px-4 py-2 rounded-full border border-gray-200 dark:border-gray-800 text-sm text-gray-600 dark:text-gray-300">
                {v}
              </span>
            ))}
            <a href="https://widltd.com.ng/holdings.html" target="_blank" rel="noreferrer" className="px-4 py-2 rounded-full bg-primary-500 text-white text-sm font-medium">
              View holdings <ArrowRight className="w-3.5 h-3.5 inline ml-1" />
            </a>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-screen-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <GlassCard className="p-6 sm:p-8 md:p-12 text-center">
            <Heart className="w-12 h-12 text-primary-500 mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-4">Ready to Start Your Journey?</h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-xl mx-auto">
              Start with a course or a learning path, build real projects, and track your progress as you go.
            </p>
            <Link to="/signup">
              <Button size="lg">Get Started Free <ArrowRight className="w-5 h-5" /></Button>
            </Link>
          </GlassCard>
        </div>
      </section>
    </motion.div>
  );
}
