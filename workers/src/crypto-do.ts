import bcrypt from 'bcryptjs';

// CPU-heavy password hashing lives here on purpose: Durable Objects allow
// up to 30s CPU per request, while plain Workers on the free plan allow
// only ~10ms — far too little for bcrypt. Routes call this DO instead of
// hashing inline.
export class AuthDO {
  async fetch(req: Request): Promise<Response> {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return Response.json({ success: false, message: 'Invalid JSON' }, { status: 400 });
    }
    try {
      if (body.action === 'hash') {
        if (!body.password) return Response.json({ success: false, message: 'password required' }, { status: 400 });
        const hash = await bcrypt.hash(body.password, 12);
        return Response.json({ success: true, hash });
      }
      if (body.action === 'verify') {
        if (!body.password || !body.hash) {
          return Response.json({ success: false, message: 'password and hash required' }, { status: 400 });
        }
        const ok = await bcrypt.compare(body.password, body.hash);
        return Response.json({ success: true, ok });
      }
      return Response.json({ success: false, message: 'Unknown action' }, { status: 400 });
    } catch (err: any) {
      return Response.json({ success: false, message: err?.message || 'Crypto error' }, { status: 500 });
    }
  }
}
