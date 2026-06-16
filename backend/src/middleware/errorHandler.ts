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

  // Handle database connection errors
  function isDbError(e: any): boolean {
    const msg = (e?.message || '').toLowerCase();
    return msg.includes('econnrefused') || msg.includes('etimedout') ||
           msg.includes('connect') || msg.includes('database') ||
           msg.includes('timeout') || msg.includes('closed');
  }

  if (isDbError(err)) {
    console.error('Database error:', err.message);
    res.status(503).json({
      success: false,
      message: 'Service temporarily unavailable — database connection issue.',
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
