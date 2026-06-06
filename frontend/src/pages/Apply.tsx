import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import api from '@/lib/axios';

export default function Apply() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    country: '',
    state: '',
    professionalTitle: '',
    yearsExperience: '',
    specialization: '',
    githubUrl: '',
    linkedinUrl: '',
    portfolioUrl: '',
    bio: '',
    teachingExperience: '',
    interestedCourses: '',
    availability: '',
    motivation: ''
  });
  
  const [resume, setResume] = useState<File | null>(null);
  const [profileImage, setProfileImage] = useState<File | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'resume' | 'profileImage') => {
    if (e.target.files && e.target.files[0]) {
      if (type === 'resume') setResume(e.target.files[0]);
      if (type === 'profileImage') setProfileImage(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');
    
    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        data.append(key, value);
      });
      if (resume) data.append('resume', resume);
      if (profileImage) data.append('profileImage', profileImage);

      await api.post('/applications/instructor', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setIsSuccess(true);
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen pt-24 pb-16 flex items-center justify-center px-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full glass-card p-8 text-center rounded-3xl"
        >
          <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold mb-4">Application Received!</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Thank you for applying to teach at CareerCode Academy. Our team will review your extensive application and get back to you within 3-5 business days.
          </p>
          <Link to="/">
            <Button className="w-full">Return Home</Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="mb-10 text-center sm:text-left">
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">Comprehensive Instructor Application</h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            We are looking for industry experts. Please fill out all details so we can get to know you better.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl border border-red-100 dark:border-red-900/50">
            {errorMsg}
          </div>
        )}

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 sm:p-10 rounded-3xl"
        >
          <form onSubmit={handleSubmit} className="space-y-10">
            
            {/* 1. Personal Information */}
            <section>
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 flex items-center justify-center text-sm">1</span>
                Personal Information
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Full Name</label>
                  <Input name="fullName" value={formData.fullName} onChange={handleChange} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email Address</label>
                  <Input type="email" name="email" value={formData.email} onChange={handleChange} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Phone Number</label>
                  <Input type="tel" name="phone" value={formData.phone} onChange={handleChange} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Country</label>
                  <Input name="country" value={formData.country} onChange={handleChange} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">State / Province</label>
                  <Input name="state" value={formData.state} onChange={handleChange} required />
                </div>
              </div>
            </section>

            <hr className="border-gray-200 dark:border-gray-800" />

            {/* 2. Professional Details */}
            <section>
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 flex items-center justify-center text-sm">2</span>
                Professional Details
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Professional Title (e.g. Senior Frontend Engineer)</label>
                  <Input name="professionalTitle" value={formData.professionalTitle} onChange={handleChange} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Specialization</label>
                  <select 
                    name="specialization"
                    value={formData.specialization}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none"
                    required
                  >
                    <option value="" disabled>Select your field</option>
                    <option value="frontend">Frontend Development</option>
                    <option value="backend">Backend Development</option>
                    <option value="fullstack">Full-Stack Development</option>
                    <option value="mobile">Mobile Development</option>
                    <option value="data">Data Science & ML</option>
                    <option value="design">UI/UX Design</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Years of Experience</label>
                  <select 
                    name="yearsExperience"
                    value={formData.yearsExperience}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none"
                    required
                  >
                    <option value="" disabled>Select experience level</option>
                    <option value="1-3">1-3 years</option>
                    <option value="3-5">3-5 years</option>
                    <option value="5-10">5-10 years</option>
                    <option value="10+">10+ years</option>
                  </select>
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium mb-2">Short Professional Bio</label>
                <textarea 
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none resize-none"
                  required
                ></textarea>
              </div>
            </section>

            <hr className="border-gray-200 dark:border-gray-800" />

            {/* 3. Links & Uploads */}
            <section>
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 flex items-center justify-center text-sm">3</span>
                Links & Uploads
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-2">GitHub URL</label>
                  <Input type="url" name="githubUrl" value={formData.githubUrl} onChange={handleChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">LinkedIn URL</label>
                  <Input type="url" name="linkedinUrl" value={formData.linkedinUrl} onChange={handleChange} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Portfolio URL</label>
                  <Input type="url" name="portfolioUrl" value={formData.portfolioUrl} onChange={handleChange} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="p-4 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-center bg-gray-50/50 dark:bg-gray-800/30 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                  <label className="block text-sm font-medium mb-1 cursor-pointer">
                    <span className="text-primary-500 hover:underline">Upload Resume (PDF)</span>
                    <input type="file" accept=".pdf" className="hidden" onChange={(e) => handleFileChange(e, 'resume')} required />
                  </label>
                  <p className="text-xs text-gray-500">{resume ? resume.name : 'No file selected'}</p>
                </div>
                
                <div className="p-4 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-center bg-gray-50/50 dark:bg-gray-800/30 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                  <label className="block text-sm font-medium mb-1 cursor-pointer">
                    <span className="text-primary-500 hover:underline">Upload Profile Image</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'profileImage')} required />
                  </label>
                  <p className="text-xs text-gray-500">{profileImage ? profileImage.name : 'No file selected'}</p>
                </div>
              </div>
            </section>

            <hr className="border-gray-200 dark:border-gray-800" />

            {/* 4. Teaching Intentions */}
            <section>
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 flex items-center justify-center text-sm">4</span>
                Teaching Intentions
              </h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Previous Teaching Experience (If any)</label>
                  <textarea 
                    name="teachingExperience"
                    value={formData.teachingExperience}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none resize-none"
                  ></textarea>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">What courses are you interested in creating?</label>
                  <textarea 
                    name="interestedCourses"
                    value={formData.interestedCourses}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none resize-none"
                    required
                  ></textarea>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Time Availability</label>
                    <select 
                      name="availability"
                      value={formData.availability}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none"
                      required
                    >
                      <option value="" disabled>Select availability</option>
                      <option value="part-time">Part-time (0-10 hrs/week)</option>
                      <option value="half-time">Half-time (10-20 hrs/week)</option>
                      <option value="full-time">Full-time (20+ hrs/week)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Why do you want to teach at CareerCode?</label>
                  <textarea 
                    name="motivation"
                    value={formData.motivation}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Share your motivation and what makes you a great instructor..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none resize-none"
                    required
                  ></textarea>
                </div>
              </div>
            </section>

            <div className="pt-8 border-t border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-6">
              <p className="text-sm text-gray-500">
                By applying, you agree to our <Link to="/terms" className="text-primary-500 hover:underline">Terms of Service</Link> and <Link to="/privacy" className="text-primary-500 hover:underline">Privacy Policy</Link>.
              </p>
              <Button type="submit" size="lg" disabled={isSubmitting} className="w-full sm:w-auto min-w-[200px] h-14 text-lg">
                {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : 'Submit Application'}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
