import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Endpoint: POST /api/v1/student/ai/chat
router.post('/chat', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { messages } = req.body;
    const user = req.user; // Context awareness: we know who is talking

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, message: 'Messages array is required' });
    }

    const token = process.env.CLOUDFLARE_AI_TOKEN;
    // Extract Account ID dynamically from S3 endpoint or use hardcoded fallback from env
    const s3Endpoint = process.env.S3_ENDPOINT || '';
    const accountIdMatch = s3Endpoint.match(/https:\/\/([a-f0-9]+)\.r2\.cloudflarestorage\.com/);
    const accountId = accountIdMatch ? accountIdMatch[1] : 'ae5f7e6e4a91cf13a04d8343c445e583';

    if (!token || !accountId) {
      // Graceful fallback when API key is missing
      return res.json({
        success: true,
        data: {
          role: 'assistant',
          content: `Hi ${user?.firstName || 'there'}! I am your AI Study Assistant.\n\nCurrently, I'm running in **Demo Mode** because the \`CLOUDFLARE_AI_TOKEN\` has not been configured in the backend \`.env\` file.\n\n*Admin note: Configure CLOUDFLARE_AI_TOKEN to enable real-time Llama-3.1-8b-instruct!*`
        }
      });
    }

    // Cloudflare Workers AI Model
    const model = '@cf/meta/llama-3.1-8b-instruct';
    
    // Ideally this goes through AI Gateway: https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_name}/workers-ai/
    // We are using the standard direct REST endpoint here for testing.
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

    // Format chat history for Cloudflare Workers AI (Llama 3 format)
    // Add cool features: System prompt with personality and context awareness
    const formattedMessages = [
      {
        role: 'system',
        content: `You are an elite, highly encouraging, and brilliant coding mentor for CareerCode Academy. 
Your student's name is ${user?.firstName || 'Developer'}. Address them warmly.
Rules:
1. Always format your responses beautifully using Markdown.
2. Keep your explanations concise, deep, and easy to understand.
3. If appropriate, challenge the student with a tiny, 1-minute thought exercise or coding question to ensure they understand the concept.`
      },
      ...messages.map((msg: any) => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content || ''
      }))
    ];

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: formattedMessages,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Cloudflare AI Error]:', errorText);
      throw new Error(`AI API Error: ${response.status}`);
    }

    const data: any = await response.json();
    const aiText = data.result?.response || 'I am sorry, I could not generate a response at this time.';

    return res.json({
      success: true,
      data: {
        role: 'assistant',
        content: aiText
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
