import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = Router();

// Endpoint: POST /api/v1/student/ai/chat
router.post('/chat', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, message: 'Messages array is required' });
    }

    const lastMessage = messages[messages.length - 1];
    const userPrompt = lastMessage.content || '';

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      // Graceful fallback when API key is missing
      const promptLower = userPrompt.toLowerCase();
      let reply = '';

      if (promptLower.includes('summarize') || promptLower.includes('summary')) {
        reply = `Here is a structured summary of your current lesson (Demo Mode):

**Topic Overview:**
We are focusing on building scalable systems, state management, and modern styling practices.

**Key Learnings:**
1. **Separation of Concerns:** Keep presentation (UI) separate from state and business logic.
2. **State Management:** Use atomic and persisted store structures (like Zustand with local storage) to keep user session persistence clean.
3. **Database Consistency:** Derive status, priority, and computed values dynamically from live database records rather than maintaining stale duplicate columns.

*Tip: Please configure the GEMINI_API_KEY in the backend .env to enable real-time dynamic AI generation.*`;
      } else if (promptLower.includes('explain')) {
        reply = `Let's break down the concept (Demo Mode):

Imagine a library database. Instead of having a column in the \`books\` table called \`is_overdue\` (which changes every day and can easily become stale), you calculate it dynamically. You check:
1. If the book was borrowed,
2. If the due date is in the past,
3. And if it has not been returned yet.

Doing this calculation dynamically at the database query level ensures your data is always 100% correct and up-to-date.

*Tip: Please configure the GEMINI_API_KEY in the backend .env to enable real-time dynamic AI generation.*`;
      } else if (promptLower.includes('quiz')) {
        reply = `Here is a quick learning quiz for you (Demo Mode):

**Question 1:** Why is it better to compute assignment priority based on days left rather than storing it as a static column?
- A) Storing it statically uses too much memory.
- B) Time constantly moves forward; static values quickly become stale.
- C) Computed values are faster to query.

**Question 2:** Which of the following is an example of dynamic status calculation?
- A) Setting \`status = 'submitted'\` on a record and never updating it.
- B) Checking if a submission row exists for the given student and assignment at query time.

Think about the answers! 

*Tip: Please configure the GEMINI_API_KEY in the backend .env to enable real-time dynamic AI generation.*`;
      } else if (promptLower.includes('plan') || promptLower.includes('study plan')) {
        reply = `Here is your customized learning path plan (Demo Mode):

**Phase 1: Database Mechanics**
- Master SQL joins and dynamic CASE/COALESCE statements.
- Practice eliminating duplicate or stale state columns.

**Phase 2: API Integration**
- Integrate server-side SDKs securely using environment variables.
- Implement robust fallbacks and descriptive error boundaries.

**Phase 3: Frontend Polishing**
- Connect UI components to live backend routes.
- Implement micro-animations and seamless loading states.

*Tip: Please configure the GEMINI_API_KEY in the backend .env to enable real-time dynamic AI generation.*`;
      } else {
        reply = `Hi there! I am your AI Study Assistant.

Currently, I'm running in **Demo Mode** because the \`GEMINI_API_KEY\` environment variable has not been configured in the backend \`.env\` file. 

However, you can still ask me to:
- **Summarize** code lessons
- **Explain** technical concepts
- **Quiz** you on key programming topics
- Generate a customized **study plan**

*Admin note: Once you add GEMINI_API_KEY to your backend \`.env\` file, I will automatically use Gemini 1.5 Flash to answer any questions in real-time!*`;
      }

      return res.json({
        success: true,
        data: {
          role: 'assistant',
          content: reply
        }
      });
    }

    // Initialize Gemini AI SDK
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Format chat history for Google Gemini SDK.
    // The history needs to alternate between 'user' and 'model' turns, using the 'parts' field.
    const formattedHistory = messages.slice(0, -1).map((msg: any) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content || '' }]
    }));

    const chatSession = model.startChat({
      history: formattedHistory,
      generationConfig: {
        maxOutputTokens: 1000,
      }
    });

    const result = await chatSession.sendMessage(userPrompt);
    const response = result.response;
    const aiText = response.text();

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
