import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import fs from 'fs';
import path from 'path';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    const body: any = { success: false, message: err.message };
    const appErr = err as any;
    if (appErr.errors) {
      body.errors = appErr.errors;
    }
    res.status(err.statusCode).json(body);
    return;
  }

  // Handle database connection errors (including DNS/network storms toward
  // the managed Postgres host: EAI_AGAIN/ENOTFOUND/ENETUNREACH surface as
  // generic Errors, so match them explicitly instead of leaking 500s).
  function isDbError(e: any): boolean {
    const msg = (e?.message || '').toLowerCase();
    const code = (e?.code || '').toLowerCase();
    return msg.includes('econnrefused') || msg.includes('etimedout') ||
           msg.includes('connect') || msg.includes('database') ||
           msg.includes('timeout') || msg.includes('closed') ||
           msg.includes('eai_again') || msg.includes('enotfound') ||
           msg.includes('enetunreach') || msg.includes('getaddrinfo') ||
           code === 'eai_again' || code === 'enotfound' || code === 'enetunreach';
  }

  if (isDbError(err)) {
    console.error('Database error:', err.message);
    res.status(503).json({
      success: false,
      message: 'Service temporarily unavailable — database connection issue.',
    });
    return;
  }

  // Handle uninitialized database errors (table/column missing after cold boot).
  // NOTE: match precise Postgres "does not exist" phrases only — a bare
  // substring check for "column" masks unrelated errors.
  function isUninitializedDb(e: any): boolean {
    const msg = (e?.message || '').toLowerCase();
    return msg.includes('relation') && msg.includes('does not exist') ||
           msg.includes('column') && msg.includes('does not exist');
  }

  if (isUninitializedDb(err)) {
    console.error('Database schema error — tables may not be initialized:', err.message);
    res.status(503).json({
      success: false,
      message: 'Service temporarily unavailable — database schema is missing an object. The team has been notified.',
    });
    return;
  }

  // Handle AggregateError (e.g. pool connection failures)
  if (typeof AggregateError !== 'undefined' && err instanceof AggregateError) {
    const aggMsg = err.errors?.some((e: any) => isDbError(e));
    if (aggMsg) {
      console.error('Database connection error (aggregate):', err.message);
      res.status(503).json({
        success: false,
        message: 'Service temporarily unavailable — database connection issue.',
      });
      return;
    }
  }

  try {
    const logPath = path.join(process.cwd(), 'error.log');
    const logMessage = `[${new Date().toISOString()}] Unhandled error: ${err.message}\nStack: ${err.stack}\n\n`;
    fs.appendFileSync(logPath, logMessage);
  } catch (logErr) {
    console.error('Failed to write to error log:', logErr);
  }

  console.error('Unhandled error:', err);

  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
}
