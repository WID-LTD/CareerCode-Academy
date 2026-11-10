import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Loader2, Upload, ArrowRight, User, Briefcase, Link2, BookOpen, Sparkles, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import api from '@/lib/axios';
import { Turnstile } from '@/components/security/Turnstile';

const steps = [
  { title: 'Personal Info', icon: User },
  { title: 'Professional', icon: Briefcase },
  { title: 'Links & Uploads', icon: Link2 },
  { title: 'Teaching', icon: BookOpen },
  { title: 'Review', icon: Sparkles },
];

const specializations = [
  { value: 'frontend', label: 'Frontend Development' },
  { value: 'backend', label: 'Backend Development' },
  { value: 'fullstack', label: 'Full-Stack Development' },
  { value: 'mobile', label: 'Mobile Development' },
  { value: 'data', label: 'Data Science & ML' },
  { value: 'design', label: 'UI/UX Design' },
  { value: 'devops', label: 'DevOps & Cloud' },
  { value: 'security', label: 'Cybersecurity' },
];

const experienceLevels = [
  { value: '1-3', label: '1-3 years' },
  { value: '3-5', label: '3-5 years' },
  { value: '5-10', label: '5-10 years' },
  { value: '10+', label: '10+ years' },
];

const availabilityOptions = [
  { value: 'part-time', label: 'Part-time (0-10 hrs/week)' },
  { value: 'half-time', label: 'Half-time (10-20 hrs/week)' },
  { value: 'full-time', label: 'Full-time (20+ hrs/week)' },
];

export default function Apply() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
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
  
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
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

  const validateStep = () => {
    switch (step) {
      case 0: return formData.fullName && formData.email && formData.phone && formData.country;
      case 1: return formData.professionalTitle && formData.yearsExperience && formData.specialization;
      case 2: return formData.linkedinUrl && resume && profileImage;
      case 3: return formData.interestedCourses && formData.availability;
      default: return true;
    }
  };

  const canProceed = validateStep();

  const handleNext = () => {
    if (!canProceed) return;
    setStep(Math.min(step + 1, 4));
  };

  const handleBack = () => {
    setStep(Math.max(step - 1, 0));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrorMsg('');
    
    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        data.append(key, value);
      });
      data.append('turnstileToken', captchaToken || '');
      if (resume) data.append('resume', resume);
      if (profileImage) data.append('profileImage', profileImage);

      await api.post('/applications/instructor', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setIsSuccess(true);
    } catch (error: any) {
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
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 10, stiffness: 200 }}
            className="w-20 h-20 bg-success-500/10 text-success-500 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle2 className="w-10 h-10" />
          </motion.div>
          <h2 className="text-2xl font-bold mb-4">Application Received!</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Thank you for applying to teach at CareerCode Academy. Our team will review your application and get back to you within 3-5 business days.
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
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">
            Become an <span className="gradient-text">Instructor</span>
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Share your expertise with thousands of aspiring developers worldwide.
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-0 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          {steps.map((s, i) => {
            const StepIcon = s.icon;
            return (
              <div key={i} className="flex items-center gap-0 min-w-0">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  i === step ? 'bg-primary-500/20 text-primary-600 dark:text-primary-400 border border-primary-500/30' :
                  i < step ? 'bg-success-500/10 text-success-500' :
                  'text-gray-400'
                }`}>
                  <StepIcon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="hidden sm:inline">{s.title}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`w-4 sm:w-8 h-px mx-1 ${i < step ? 'bg-success-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
                )}
              </div>
            );
          })}
        </div>

        {errorMsg && (
          <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl border border-red-100 dark:border-red-900/50 text-sm">
            {errorMsg}
          </div>
        )}

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 sm:p-10 rounded-3xl"
        >
          <form onSubmit={(e) => { e.preventDefault(); if (step < 4) handleNext(); else handleSubmit(); }}>
            <AnimatePresence mode="wait">
              {/* Step 0: Personal Info */}
              {step === 0 && (
                <motion.div
                  key="step-0"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <User className="w-5 h-5 text-primary-500" /> Personal Information
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <Input label="Full Name" name="fullName" value={formData.fullName} onChange={handleChange} required />
                    <Input label="Email Address" type="email" name="email" value={formData.email} onChange={handleChange} required />
                    <Input label="Phone Number" type="tel" name="phone" value={formData.phone} onChange={handleChange} required />
                    <Input label="Country" name="country" value={formData.country} onChange={handleChange} required />
                    <Input label="State / Province" name="state" value={formData.state} onChange={handleChange} required />
                  </div>
                </motion.div>
              )}

              {/* Step 1: Professional */}
              {step === 1 && (
                <motion.div
                  key="step-1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-primary-500" /> Professional Details
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <Input label="Professional Title" placeholder="e.g. Senior Frontend Engineer" name="professionalTitle" value={formData.professionalTitle} onChange={handleChange} required />
                    <div>
                      <label className="block text-sm font-medium mb-2">Specialization</label>
                      <select name="specialization" value={formData.specialization} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none" required>
                        <option value="" disabled>Select your field</option>
                        {specializations.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Years of Experience</label>
                      <select name="yearsExperience" value={formData.yearsExperience} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none" required>
                        <option value="" disabled>Select experience level</option>
                        {experienceLevels.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Short Professional Bio</label>
                    <textarea name="bio" value={formData.bio} onChange={handleChange} rows={3} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none resize-none" required />
                  </div>
                </motion.div>
              )}

              {/* Step 2: Links & Uploads */}
              {step === 2 && (
                <motion.div
                  key="step-2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Link2 className="w-5 h-5 text-primary-500" /> Links & Uploads
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <Input label="GitHub URL" type="url" name="githubUrl" value={formData.githubUrl} onChange={handleChange} />
                    <Input label="LinkedIn URL" type="url" name="linkedinUrl" value={formData.linkedinUrl} onChange={handleChange} required />
                    <Input label="Portfolio URL" type="url" name="portfolioUrl" value={formData.portfolioUrl} onChange={handleChange} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="p-6 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-center bg-gray-50/50 dark:bg-gray-800/30 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <FileText className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                      <label className="block text-sm font-medium mb-1 cursor-pointer">
                        <span className="text-primary-500 hover:underline">Upload Resume (PDF)</span>
                        <input type="file" accept=".pdf" className="hidden" onChange={(e) => handleFileChange(e, 'resume')} required />
                      </label>
                      <p className="text-xs text-gray-500">{resume ? resume.name : 'No file selected'}</p>
                      {resume && (
                        <Badge variant="success" size="sm" className="mt-2">Uploaded</Badge>
                      )}
                    </div>
                    
                    <div className="p-6 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-center bg-gray-50/50 dark:bg-gray-800/30 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                      <label className="block text-sm font-medium mb-1 cursor-pointer">
                        <span className="text-primary-500 hover:underline">Upload Profile Image</span>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'profileImage')} required />
                      </label>
                      <p className="text-xs text-gray-500">{profileImage ? profileImage.name : 'No file selected'}</p>
                      {profileImage && (
                        <Badge variant="success" size="sm" className="mt-2">Uploaded</Badge>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Teaching */}
              {step === 3 && (
                <motion.div
                  key="step-3"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-primary-500" /> Teaching Intentions
                  </h2>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">Previous Teaching Experience</label>
                      <textarea name="teachingExperience" value={formData.teachingExperience} onChange={handleChange} rows={3} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none resize-none" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">What courses are you interested in creating?</label>
                      <textarea name="interestedCourses" value={formData.interestedCourses} onChange={handleChange} rows={3} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none resize-none" required />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium mb-2">Time Availability</label>
                        <select name="availability" value={formData.availability} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none" required>
                          <option value="" disabled>Select availability</option>
                          {availabilityOptions.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Why do you want to teach at CareerCode?</label>
                      <textarea name="motivation" value={formData.motivation} onChange={handleChange} rows={4} placeholder="Share your motivation and what makes you a great instructor..." className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none resize-none" required />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 4: Review */}
              {step === 4 && (
                <motion.div
                  key="step-4"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary-500" /> Review & Submit
                  </h2>
                  <p className="text-gray-500">Please review your information before submitting.</p>

                  <div className="space-y-3">
                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Personal Info</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        <div><span className="text-gray-500">Name:</span> {formData.fullName}</div>
                        <div><span className="text-gray-500">Email:</span> {formData.email}</div>
                        <div><span className="text-gray-500">Phone:</span> {formData.phone}</div>
                        <div><span className="text-gray-500">Country:</span> {formData.country}</div>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Professional</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        <div><span className="text-gray-500">Title:</span> {formData.professionalTitle}</div>
                        <div><span className="text-gray-500">Specialization:</span> {specializations.find(s => s.value === formData.specialization)?.label}</div>
                        <div><span className="text-gray-500">Experience:</span> {formData.yearsExperience}</div>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Files</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        <div><span className="text-gray-500">Resume:</span> {resume ? 'Uploaded' : 'Missing'}</div>
                        <div><span className="text-gray-500">Profile Image:</span> {profileImage ? 'Uploaded' : 'Missing'}</div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
              {step > 0 ? (
                <Button type="button" variant="outline" onClick={handleBack} icon={<ArrowLeft className="w-4 h-4" />}>
                  Previous
                </Button>
              ) : (
                <div />
              )}
              <Turnstile onToken={setCaptchaToken} />
              <Button type="submit" disabled={!canProceed && step < 4} loading={isSubmitting} className="sm:min-w-[160px]">
                {step < 4 ? (
                  <>Next <ArrowRight className="w-4 h-4" /></>
                ) : (
                  isSubmitting ? 'Submitting...' : 'Submit Application'
                )}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
