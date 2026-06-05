import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, Clock, User, Tag, Share2, Bookmark } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/utils';

const postData = {
  'landing-first-dev-job': {
    title: 'The Complete Guide to Landing Your First Developer Job in 2025',
    content: `Landing your first developer job can feel like an impossible challenge, but with the right strategy, it's entirely achievable. This comprehensive guide will walk you through every step of the process.

## 1. Build a Strong Foundation

Before you start applying, ensure you have a solid understanding of the fundamentals. Focus on:

- **Data Structures & Algorithms**: Arrays, linked lists, trees, graphs, sorting, and searching
- **Version Control**: Git and GitHub workflows
- **One Framework**: Go deep with React, Vue, or Angular
- **Backend Basics**: REST APIs, databases, authentication

## 2. Create a Portfolio That Stands Out

Your portfolio is your ticket to getting noticed. Build 3-4 substantial projects that demonstrate:

- Full-stack capabilities
- Clean, well-documented code
- Real-world problem solving
- Proper use of modern tools and practices

## 3. Master the Job Search

### Resume Tips
- Keep it to one page
- Highlight impact, not just responsibilities
- Include links to your GitHub and portfolio
- Tailor it for each application

### Networking
- Attend tech meetups and conferences
- Engage on LinkedIn and Twitter
- Contribute to open source projects
- Join developer communities

## 4. Ace the Interview

### Technical Preparation
- Practice coding challenges daily (LeetCode, HackerRank)
- Review system design basics
- Prepare behavioral stories using the STAR method
- Do mock interviews with peers

### Common Questions
- "Tell me about yourself"
- "Why do you want to work here?"
- "Describe a challenging project"
- Technical coding challenges

## 5. Negotiate Your Offer

When you receive an offer, remember to:
- Research market rates for your role and location
- Consider the total compensation package
- Don't be afraid to negotiate respectfully
- Get everything in writing

The journey to landing your first developer job is a marathon, not a sprint. Stay consistent, keep learning, and don't get discouraged by rejections. Every "no" brings you closer to the right "yes."`,
    image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&h=600&fit=crop',
    author: 'Sarah Mitchell',
    role: 'VP of Student Success',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
    date: '2025-03-15',
    readTime: '8 min read',
    category: 'Career Advice',
    tags: ['job search', 'interviews', 'portfolio'],
  },
};

export default function BlogPost() {
  const { slug } = useParams();
  const post = postData[slug as keyof typeof postData];

  if (!post) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Post Not Found</h2>
          <Link to="/blog"><Button>Back to Blog</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="relative h-[40vh] overflow-hidden">
        <img src={post.image} alt={post.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/60 to-transparent" />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-32 relative z-10 pb-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Link to="/blog" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to Blog
          </Link>

          <div className="flex items-center gap-3 mb-4">
            <Badge variant="primary" size="md">{post.category}</Badge>
            <div className="flex items-center gap-1 text-sm text-gray-400"><Clock className="w-4 h-4" /> {post.readTime}</div>
            <div className="flex items-center gap-1 text-sm text-gray-400"><Calendar className="w-4 h-4" /> {formatDate(post.date)}</div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-8">{post.title}</h1>

          <GlassCard className="p-8 sm:p-12 prose prose-gray dark:prose-invert max-w-none">
            <div className="flex items-center gap-4 mb-8 pb-8 border-b border-gray-200 dark:border-gray-800">
              <img src={post.avatar} alt={post.author} className="w-14 h-14 rounded-full object-cover" />
              <div>
                <div className="font-semibold text-gray-900 dark:text-white">{post.author}</div>
                <div className="text-sm text-gray-500">{post.role}</div>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Button variant="ghost" size="sm" icon={<Bookmark className="w-4 h-4" />}>Save</Button>
                <Button variant="ghost" size="sm" icon={<Share2 className="w-4 h-4" />}>Share</Button>
              </div>
            </div>

            <div className="leading-relaxed whitespace-pre-line text-gray-700 dark:text-gray-300">
              {post.content}
            </div>

            <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                <Tag className="w-4 h-4" /> Tags:
              </div>
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <Badge key={tag} variant="default" size="md">{tag}</Badge>
                ))}
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </motion.div>
  );
}
