import React from 'react';
import { motion } from 'framer-motion';
import { Award, Download, Share2, Star, Calendar } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/utils';

const certificates = [
  { title: 'Full-Stack Web Development', issued: '2025-05-15', id: 'CERT-2025-001', grade: 'A+', skills: ['React', 'Node.js', 'MongoDB', 'TypeScript'] },
  { title: 'Web Fundamentals', issued: '2025-03-20', id: 'CERT-2025-002', grade: 'A', skills: ['HTML5', 'CSS3', 'JavaScript', 'Git'] },
];

export default function Certificate() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">My Certificates</h1>
        <p className="text-gray-500">You have earned {certificates.length} certificates.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {certificates.map((cert, i) => (
          <motion.div
            key={cert.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <GlassCard className="p-8 text-center relative overflow-hidden" glow>
              <div className="absolute top-0 right-0 w-40 h-40 bg-primary-500/5 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-40 h-40 bg-accent-500/5 rounded-full blur-3xl" />

              <div className="relative">
                <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-4">
                  <Award className="w-8 h-8 text-white" />
                </div>

                <h3 className="text-xl font-bold mb-1">Certificate of Completion</h3>
                <p className="text-gray-500 text-sm mb-4">This certifies that</p>
                <p className="text-2xl font-bold gradient-text mb-2">Sarah Johnson</p>
                <p className="text-gray-500 text-sm mb-4">has successfully completed</p>
                <p className="text-xl font-semibold mb-6">{cert.title}</p>

                <div className="flex items-center justify-center gap-2 mb-4">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  <span className="font-semibold">Grade: {cert.grade}</span>
                </div>

                <div className="flex items-center justify-center gap-1 text-sm text-gray-500 mb-6">
                  <Calendar className="w-4 h-4" /> Issued: {formatDate(cert.issued)}
                </div>

                <div className="flex flex-wrap justify-center gap-2 mb-6">
                  {cert.skills.map((skill) => (
                    <Badge key={skill} variant="primary" size="sm">{skill}</Badge>
                  ))}
                </div>

                <div className="text-xs text-gray-400 mb-6">Certificate ID: {cert.id}</div>

                <div className="flex items-center justify-center gap-3">
                  <Button variant="primary" size="sm" icon={<Download className="w-4 h-4" />}>Download PDF</Button>
                  <Button variant="outline" size="sm" icon={<Share2 className="w-4 h-4" />}>Share</Button>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
