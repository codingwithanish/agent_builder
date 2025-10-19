import { STSClient, GetCallerIdentityCommand, AssumeRoleCommand } from '@aws-sdk/client-sts';
import { CredentialProviderPort } from '@/domain/interfaces';
import { AWSCredentials } from '@/domain/types';
import { CredentialError } from '@/observability/errors';
import { logger } from '@/observability/logger';
import { config } from './config';

export class CredentialResolver implements CredentialProviderPort {
  async resolveCredentials(headers: Record<string, string>): Promise<AWSCredentials> {
    logger.debug('Resolving AWS credentials', { allowHeaderCreds: config.ALLOW_HEADER_CREDS });

    // 1. Try header-based credentials first if allowed
    if (config.ALLOW_HEADER_CREDS) {
      const headerCreds = this.extractFromHeaders(headers);
      if (headerCreds) {
        logger.debug('Using credentials from headers');
        return headerCreds;
      }
    }

    // 2. Try environment variables
    const envCreds = this.extractFromEnvironment();
    if (envCreds) {
      logger.debug('Using credentials from environment');
      return envCreds;
    }

    // 3. Default AWS SDK credential chain will be used by individual clients
    logger.debug('Using default AWS credential chain');
    return {
      accessKeyId: '',
      secretAccessKey: '',
      region: headers['x-aws-region'] || config.DEFAULT_AWS_REGION
    };
  }

  async validateCredentials(credentials: AWSCredentials): Promise<boolean> {
    try {
      const stsClient = new STSClient({
        region: credentials.region || config.DEFAULT_AWS_REGION,
        ...(credentials.accessKeyId && {
          credentials: {
            accessKeyId: credentials.accessKeyId,
            secretAccessKey: credentials.secretAccessKey,
            ...(credentials.sessionToken && { sessionToken: credentials.sessionToken })
          }
        })
      });

      const command = new GetCallerIdentityCommand({});
      const response = await stsClient.send(command);
      
      logger.info('Credentials validated successfully', {
        account: response.Account,
        userId: response.UserId,
        arn: response.Arn
      });

      return true;
    } catch (error) {
      logger.error('Credential validation failed', { error });
      return false;
    }
  }

  async assumeRole(credentials: AWSCredentials, roleArn: string): Promise<AWSCredentials> {
    try {
      const stsClient = new STSClient({
        region: credentials.region || config.DEFAULT_AWS_REGION,
        ...(credentials.accessKeyId && {
          credentials: {
            accessKeyId: credentials.accessKeyId,
            secretAccessKey: credentials.secretAccessKey,
            ...(credentials.sessionToken && { sessionToken: credentials.sessionToken })
          }
        })
      });

      const command = new AssumeRoleCommand({
        RoleArn: roleArn,
        RoleSessionName: `agent-builder-${Date.now()}`,
        DurationSeconds: 3600, // 1 hour
      });

      const response = await stsClient.send(command);

      if (!response.Credentials) {
        throw new CredentialError('Failed to assume role - no credentials returned');
      }

      const assumedCredentials: AWSCredentials = {
        accessKeyId: response.Credentials.AccessKeyId!,
        secretAccessKey: response.Credentials.SecretAccessKey!,
        sessionToken: response.Credentials.SessionToken!,
        region: credentials.region
      };

      logger.info('Role assumed successfully', {
        roleArn,
        expiration: response.Credentials.Expiration
      });

      return assumedCredentials;
    } catch (error) {
      logger.error('Failed to assume role', { roleArn, error });
      throw new CredentialError(`Failed to assume role ${roleArn}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private extractFromHeaders(headers: Record<string, string>): AWSCredentials | null {
    const accessKeyId = headers['x-aws-access-key-id'];
    const secretAccessKey = headers['x-aws-secret-access-key'];

    if (!accessKeyId || !secretAccessKey) {
      return null;
    }

    return {
      accessKeyId,
      secretAccessKey,
      sessionToken: headers['x-aws-session-token'],
      region: headers['x-aws-region'] || config.DEFAULT_AWS_REGION
    };
  }

  private extractFromEnvironment(): AWSCredentials | null {
    const accessKeyId = config.AWS_ACCESS_KEY_ID;
    const secretAccessKey = config.AWS_SECRET_ACCESS_KEY;

    if (!accessKeyId || !secretAccessKey) {
      return null;
    }

    return {
      accessKeyId,
      secretAccessKey,
      sessionToken: config.AWS_SESSION_TOKEN,
      region: config.DEFAULT_AWS_REGION
    };
  }
}