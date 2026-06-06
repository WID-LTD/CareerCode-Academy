import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { isDatabaseAvailable } from '../config/db';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.constructor.name === 'ValidationError' && { errors: (err as any).errors }),
    });
    return;
  }

  // Handle database connection errors
  const errMessage = (err.message || '').toLowerCase();
  if (
    errMessage.includes('econnrefused') ||
    errMessage.includes('etimedout') ||
    errMessage.includes('database') ||
    errMessage.includes('connect')
  ) {
    console.error('Database error:', err.message);
    res.status(503).json({
      success: false,
      message: 'Service temporarily unavailable. Database connection issue.',
    });
    return;
  }

  console.error('Unhandled error:', err);

  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
}
