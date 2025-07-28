
import { Response } from "express";
import { Error as MongooseError } from "mongoose";

export interface ErrorResponse {
  success: false;
  error: string;
  details?: any;
}

export class TemplateError extends Error {
  public statusCode: number;
  public details?: any;

  constructor(message: string, statusCode: number = 500, details?: any) {
    super(message);
    this.name = "TemplateError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const handleTemplateError = (error: any, res: Response, operation: string): void => {
  console.error(`Template ${operation} error:`, error);

  // Custom TemplateError
  if (error instanceof TemplateError) {
    res.status(error.statusCode).json({
      success: false,
      error: error.message,
      ...(error.details && { details: error.details })
    });
    return;
  }

  // MongoDB/Mongoose Validation Error
  if (error.name === "ValidationError") {
    const validationErrors = Object.values(error.errors).map((err: any) => ({
      field: err.path,
      message: err.message,
      value: err.value
    }));

    res.status(400).json({
      success: false,
      error: "Validation failed",
      details: {
        fields: validationErrors,
        message: Object.values(error.errors).map((err: any) => err.message).join(", ")
      }
    });
    return;
  }

  // MongoDB Cast Error (Invalid ObjectId)
  if (error.name === "CastError") {
    const field = error.path === "_id" ? "Template ID" : error.path;
    res.status(400).json({
      success: false,
      error: `Invalid ${field} format`,
      details: {
        field: error.path,
        value: error.value,
        expectedType: error.kind
      }
    });
    return;
  }

  // MongoDB Duplicate Key Error
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    const value = error.keyValue[field];
    
    res.status(409).json({
      success: false,
      error: `${field} '${value}' already exists`,
      details: {
        field,
        value,
        constraint: "unique"
      }
    });
    return;
  }

  // MongoDB Connection Errors
  if (error.name === "MongoError" || error.name === "MongoServerError") {
    res.status(503).json({
      success: false,
      error: "Database connection error",
      details: {
        code: error.code,
        message: "Please try again later"
      }
    });
    return;
  }

  // MongoDB Network Errors
  if (error.name === "MongoNetworkError") {
    res.status(503).json({
      success: false,
      error: "Database network error",
      details: {
        message: "Unable to connect to database"
      }
    });
    return;
  }

  // MongoDB Timeout Errors
  if (error.name === "MongoTimeoutError") {
    res.status(408).json({
      success: false,
      error: "Database operation timed out",
      details: {
        message: "Request took too long to process"
      }
    });
    return;
  }

  // Rate Limit Errors (if using rate limiting)
  if (error.name === "RateLimitError") {
    res.status(429).json({
      success: false,
      error: "Too many requests",
      details: {
        message: "Please wait before making another request",
        retryAfter: error.retryAfter
      }
    });
    return;
  }

  // Authorization/Authentication Errors
  if (error.name === "UnauthorizedError" || error.status === 401) {
    res.status(401).json({
      success: false,
      error: "Unauthorized access",
      details: {
        message: "Please login to continue"
      }
    });
    return;
  }

  if (error.name === "ForbiddenError" || error.status === 403) {
    res.status(403).json({
      success: false,
      error: "Access denied",
      details: {
        message: "You don't have permission to perform this action"
      }
    });
    return;
  }

  // Memory/Resource Errors
  if (error.name === "RangeError" && error.message.includes("Maximum call stack")) {
    res.status(400).json({
      success: false,
      error: "Request too complex",
      details: {
        message: "Please simplify your request"
      }
    });
    return;
  }

  // JSON Parsing Errors
  if (error.name === "SyntaxError" && error.message.includes("JSON")) {
    res.status(400).json({
      success: false,
      error: "Invalid JSON format",
      details: {
        message: "Please check your request body format"
      }
    });
    return;
  }

  // File System Errors (if handling file uploads)
  if (error.code === "ENOENT") {
    res.status(404).json({
      success: false,
      error: "File not found",
      details: {
        message: "The requested file does not exist"
      }
    });
    return;
  }

  if (error.code === "EACCES") {
    res.status(403).json({
      success: false,
      error: "File access denied",
      details: {
        message: "Insufficient permissions to access file"
      }
    });
    return;
  }

  // Generic Error Handling
  const statusCode = error.statusCode || error.status || 500;
  const message = error.message || `Failed to ${operation} template`;

  // Don't expose internal error details in production
  const isProduction = process.env.NODE_ENV === "production";
  
  res.status(statusCode).json({
    success: false,
    error: isProduction ? "Internal server error" : message,
    ...((!isProduction || statusCode < 500) && {
      details: {
        operation,
        timestamp: new Date().toISOString(),
        ...(error.stack && !isProduction && { stack: error.stack })
      }
    })
  });
};

// Specific error creators for common template operations
export const createValidationError = (field: string, message: string) => {
  return new TemplateError(`${field}: ${message}`, 400, { field, type: "validation" });
};

export const createNotFoundError = (resource: string = "Template") => {
  return new TemplateError(`${resource} not found`, 404, { type: "not_found" });
};

export const createConflictError = (field: string, value: string) => {
  return new TemplateError(`${field} '${value}' already exists`, 409, { 
    field, 
    value, 
    type: "conflict" 
  });
};

export const createUnauthorizedError = (action: string) => {
  return new TemplateError(`Unauthorized to ${action}`, 403, { type: "unauthorized" });
};

export const createInvalidIdError = (resource: string = "Template") => {
  return new TemplateError(`Invalid ${resource} ID format`, 400, { type: "invalid_id" });
};
