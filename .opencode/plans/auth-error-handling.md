# Goal: Robust auth error handling + backend wake-up

## Problems
1. Backend starts even when DB init fails — `GET /auth/me` and `POST /auth/login` return generic 500
2. Login shows "Invalid email or password" when backend is down or DB uninitialized
3. No wake-up mechanism for cold-boot backends (Render)
4. No persistent loading — cold-boot fails instantly with misleading error

## Plan

### 1. Backend: `backend/src/middleware/errorHandler.ts`
Add detection for "relation does not exist" and "column does not exist" PG errors. Return 503 with a clear message instead of generic 500:

```typescript
function isUninitializedDbError(e: Error) {
  const msg = (e?.message || '').toLowerCase();
  return msg.includes('relation') || msg.includes('does not exist') || msg.includes('column');
}

// In the error handler, BEFORE the generic 500 fallback:
if (isUninitializedDbError(err)) {
  return res.status(503).json({
    success: false,
    message: 'Database is still initializing — please try again in a moment.',
  });
}
```

### 2. Frontend: `frontend/src/hooks/useAuth.ts`
Replace fragile substring matching with reliable status-code checks in the `login` catch block:

```typescript
catch (err: any) {
  if (!err.response) {
    toast.error('Cannot reach server — please check your connection.');
  } else if (err.response.status === 503) {
    toast.error('Service temporarily unavailable — please try again.');
  } else if (err.response.status === 500) {
    toast.error('Server error — please try again later.');
  } else if (err.response.status === 401) {
    const msg = err.response.data?.message || '';
    if (msg.includes('verify your email')) {
      navigate(`/auth/verify-pending?email=${encodeURIComponent(email)}`);
      toast.error('Please verify your email address.');
    } else {
      toast.error('Invalid email or password.');
    }
  } else {
    toast.error(err.response.data?.message || 'An unexpected error occurred.');
  }
}
```

### 3. Frontend: `frontend/src/App.tsx`
Add backend wake-up on initial mount. Call `GET /health` to pre-warm cold boots:

```typescript
// Add near the auth initialization:
const [backendReady, setBackendReady] = useState(false);

useEffect(() => {
  const wakeUp = async () => {
    try {
      await api.get('/health', { timeout: 15000 });
    } catch { /* ignore — server might still boot */ }
    setBackendReady(true);
  };
  wakeUp();
}, []);

// Gate the entire app on `backendReady` (in addition to `initialized`)
```

### 4. Frontend: `frontend/src/pages/public/Login.tsx`
Add persistent loading — keep spinner for 30s on cold boot before showing error:

```typescript
const [loginTimeout, setLoginTimeout] = useState(false);

const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();
  setLoginTimeout(false);
  const timeoutId = setTimeout(() => setLoginTimeout(true), 30000);
  
  try {
    await login(email, password);
  } finally {
    clearTimeout(timeoutId);
  }
};

// Show a persistent "Still connecting..." message after 5s of loading
```

## Files to Change
- `backend/src/middleware/errorHandler.ts` — add DB uninitialized detection
- `frontend/src/hooks/useAuth.ts` — fix login error handling  
- `frontend/src/App.tsx` — add wake-up mechanism
- `frontend/src/pages/public/Login.tsx` — add persistent loading + timeout
