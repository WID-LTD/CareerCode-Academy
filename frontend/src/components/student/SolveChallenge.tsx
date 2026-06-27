import { useState } from 'react';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/Button';
import { Loader2, Send, AlertCircle } from 'lucide-react';
import CodeEditor from './CodeEditor';

interface SolveChallengeProps {
  challenge: any;
  submission: any;
  onSubmitted: () => void;
}

export default function SolveChallenge({ challenge, submission, onSubmitted }: SolveChallengeProps) {
  const [fileUrl, setFileUrl] = useState(submission?.file_url || '');
  const [textAnswer, setTextAnswer] = useState(submission?.text_answer || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const type = challenge.type || 'code';

  const handleOtherSubmit = async () => {
    setSaving(true); setError('');
    if (challenge.submission_type === 'link' && fileUrl && !fileUrl.startsWith('http')) {
      setError('Please enter a valid URL starting with http:// or https://');
      setSaving(false); return;
    }
    try {
      const payload: any = {};
      if (challenge.submission_type === 'file_upload' || challenge.submission_type === 'both') payload.fileUrl = fileUrl;
      if (challenge.submission_type === 'text' || challenge.submission_type === 'both') payload.textAnswer = textAnswer;
      if (challenge.submission_type === 'link') payload.fileUrl = fileUrl;
      const { data } = await api.post(`/challenges/${challenge.id}/submit`, payload);
      onSubmitted();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Submission failed');
    } finally { setSaving(false); }
  };

  // Code type
  if (type === 'code') {
    return (
      <div>
        <CodeEditor
          starterCode={challenge.starter_code}
          language={challenge.language}
          initialCode={submission?.code}
          challengeId={challenge.id}
          expectedOutput={challenge.expected_output}
          showExpected={true}
          onSubmit={async (code) => {
            try {
              const { data } = await api.post(`/challenges/${challenge.id}/submit`, { code });
              onSubmitted();
              return {
                passed: data.data.passed,
                score: data.data.score,
                output: data.data.output,
                expected_output: data.data.expected_output,
                testResults: data.data.testResults || [],
              };
            } catch (e: any) {
              setError(e.response?.data?.message || 'Submission failed');
              return { passed: false, score: 0, output: 'Failed to submit' };
            }
          }}
        />
        {error && (
          <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-sm text-red-400">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}
      </div>
    );
  }

  // Practical / Design / Media / Business / Essay types
  const subType = challenge.submission_type || 'file_upload';

  return (
    <div className="space-y-4">
      {subType === 'file_upload' || subType === 'both' || subType === 'link' ? (
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">
            {subType === 'link' ? 'Submission Link/URL' : 'File URL (upload a file and paste the URL)'}
          </label>
          <div className="flex gap-2">
            <input
              type="text" value={fileUrl} onChange={(e) => setFileUrl(e.target.value)}
              placeholder={subType === 'link' ? 'https://figma.com/file/...' : 'https://...'}
              className="flex-1 bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500/50"
            />
            {challenge.allowed_file_types && (
              <span className="text-[10px] text-gray-500 self-center flex-shrink-0">Allowed: {challenge.allowed_file_types}</span>
            )}
          </div>
        </div>
      ) : null}

      {subType === 'text' || subType === 'both' ? (
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Your Answer</label>
          <textarea
            value={textAnswer} onChange={(e) => setTextAnswer(e.target.value)}
            rows={5}
            className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500/50"
            placeholder="Write your answer here..."
          />
        </div>
      ) : null}

      <Button onClick={handleOtherSubmit} disabled={saving || (!fileUrl && !textAnswer)}>
        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}
        Submit
      </Button>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-sm text-red-400">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {submission && (
        <div className="p-3 rounded-xl bg-gray-800/50 text-sm">
          <p className="text-gray-400 text-xs mb-1">Previous submission:</p>
          {submission.file_url && <p className="text-primary-400 truncate">File: {submission.file_url}</p>}
          {submission.text_answer && <p className="text-gray-300 mt-1">{submission.text_answer}</p>}
          {submission.feedback && (
            <div className="mt-2 p-2 rounded-lg bg-amber-500/10 text-amber-400 text-xs">
              Feedback: {submission.feedback}
            </div>
          )}
        </div>
      )}
    </div>
  );
}