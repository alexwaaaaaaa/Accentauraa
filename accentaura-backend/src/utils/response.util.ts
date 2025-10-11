import { Response } from 'express';

/**
 * Response Utility Functions
 * 
 * Mobile app expects:
 * - Direct JSON responses (not wrapped)
 * - Error responses with { message: string } format
 */

/**
 * Send success response with direct data
 * Mobile app expects the data directly, not wrapped in { success: true, data: {...} }
 * 
 * @param res - Express response object
 * @param data - Data to send (will be sent directly)
 * @param statusCode - HTTP status code (default: 200)
 */
export function sendSuccess<T>(res: Response, data: T, statusCode: number = 200): void {
  res.status(statusCode).json(data);
}

/**
 * Send error response
 * Mobile app expects { message: string } format for errors
 * 
 * @param res - Express response object
 * @param message - Error message
 * @param statusCode - HTTP status code (default: 500)
 * @param details - Optional additional error details
 */
export function sendError(
  res: Response,
  message: string,
  statusCode: number = 500,
  details?: any
): void {
  const errorResponse: { message: string; details?: any } = { message };
  
  if (details !== undefined) {
    errorResponse.details = details;
  }
  
  res.status(statusCode).json(errorResponse);
}

/**
 * Send validation error response
 * 
 * @param res - Express response object
 * @param errors - Validation error details
 */
export function sendValidationError(res: Response, errors: any): void {
  sendError(res, 'Validation failed', 400, errors);
}

/**
 * Send unauthorized error response
 * 
 * @param res - Express response object
 * @param message - Error message (default: 'Unauthorized')
 */
export function sendUnauthorized(res: Response, message: string = 'Unauthorized'): void {
  sendError(res, message, 401);
}

/**
 * Send forbidden error response
 * 
 * @param res - Express response object
 * @param message - Error message (default: 'Forbidden')
 */
export function sendForbidden(res: Response, message: string = 'Forbidden'): void {
  sendError(res, message, 403);
}

/**
 * Send not found error response
 * 
 * @param res - Express response object
 * @param message - Error message (default: 'Resource not found')
 */
export function sendNotFound(res: Response, message: string = 'Resource not found'): void {
  sendError(res, message, 404);
}

/**
 * Send conflict error response
 * 
 * @param res - Express response object
 * @param message - Error message (default: 'Resource conflict')
 */
export function sendConflict(res: Response, message: string = 'Resource conflict'): void {
  sendError(res, message, 409);
}

/**
 * Send internal server error response
 * 
 * @param res - Express response object
 * @param message - Error message (default: 'Internal server error')
 */
export function sendInternalError(res: Response, message: string = 'Internal server error'): void {
  sendError(res, message, 500);
}

/**
 * Send service unavailable error response
 * 
 * @param res - Express response object
 * @param service - Service name
 * @param message - Error message
 */
export function sendServiceUnavailable(
  res: Response,
  service: string,
  message: string = 'Service unavailable'
): void {
  sendError(res, `${service} service unavailable: ${message}`, 503);
}
