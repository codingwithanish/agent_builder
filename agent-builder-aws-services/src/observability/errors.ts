import { AppError } from '@/domain/types';

export class CustomAppError extends Error implements AppError {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: any;

  constructor(message: string, code: string, statusCode: number = 500, details?: any) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends CustomAppError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class CredentialError extends CustomAppError {
  constructor(message: string, details?: any) {
    super(message, 'CREDENTIAL_ERROR', 401, details);
    this.name = 'CredentialError';
  }
}

export class AWSServiceError extends CustomAppError {
  constructor(message: string, awsError?: any) {
    const details = awsError ? {
      awsErrorCode: awsError.name,
      awsErrorMessage: awsError.message,
      requestId: awsError.$metadata?.requestId,
    } : undefined;
    
    super(message, 'AWS_SERVICE_ERROR', 502, details);
    this.name = 'AWSServiceError';
  }
}

export class DeploymentError extends CustomAppError {
  constructor(message: string, details?: any) {
    super(message, 'DEPLOYMENT_ERROR', 500, details);
    this.name = 'DeploymentError';
  }
}

export class ArtifactError extends CustomAppError {
  constructor(message: string, details?: any) {
    super(message, 'ARTIFACT_ERROR', 400, details);
    this.name = 'ArtifactError';
  }
}

export function createErrorResponse(error: Error) {
  if (error instanceof CustomAppError) {
    return {
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
      ...(error.details && { details: error.details }),
      timestamp: new Date().toISOString(),
    };
  }

  return {
    error: 'Internal Server Error',
    code: 'INTERNAL_ERROR',
    statusCode: 500,
    timestamp: new Date().toISOString(),
  };
}