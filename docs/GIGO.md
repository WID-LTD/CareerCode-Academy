# GiGo — AI study buddy

GiGo is the single CareerCode assistant. The old `AIStudyAssistant` widget and
its dead `/student/ai/chat` endpoint were removed.

## Models (Cloudflare Workers AI)

| Purpose | Model |
| --- | --- |
| Chat / quizzes | `@cf/meta/llama-3.3-70b-instruct-fp8-fast` |
| Speech-to-text | `@cf/openai/whisper-large-v3-turbo` |
| Text-to-speech | `@cf/myshell-ai/melotts` (fallback `@cf/deepgram/aura-1`) |

Audio is uploaded over HTTPS and transcribed **server-side**. The browser's
`SpeechRecognition` API is not used.

## Endpoints

All require a signed-in user.

- `POST /api/v1/ai/chat` — `{ messages, mode?, context?, conversationId? }`
- `POST /api/v1/ai/voice` — multipart `audio`, optional `messages`, `context`, `conversationId`
- `POST /api/v1/ai/tts` — `{ text, lang? }`
- `GET /api/v1/ai/config` — feature availability + daily limits
- `GET /api/v1/ai/conversations`
- `GET /api/v1/ai/conversations/:id`
- `DELETE /api/v1/ai/conversations/:id`
- `GET /api/v1/ai/health` (public binding check)

## Structured replies

The model must return JSON:

```json
{"blocks":[{"type":"text","markdown":"..."}],"followups":["..."]}
```

Supported blocks: `text`, `quiz`, `flashcards`, `plan`, `courses`. The server
extracts the first valid JSON object with a string-aware balanced-brace scanner,
validates quizzes (0-based index, letters, or option text), strips the JSON from
the plain reply, and retries once when a quiz was requested but not returned.
The frontend renders blocks; raw JSON is never shown in the chat.

## Limits

Per user per day: students 60 text / 20 voice / 40 TTS; instructors 200 / 60 /
120; admins higher. Usage is stored in `ai_usage` and shown in
**Admin → System Health**.

Feature flags: `ai_enabled`, `ai_voice_enabled`.
