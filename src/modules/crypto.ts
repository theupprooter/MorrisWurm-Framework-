import crypto from 'crypto';
import { logger } from '../utils';

export const generateKey = (): string => {
    const newKey = crypto.randomBytes(32).toString('hex');
    logger.info('Module [Crypto]: New session key generated.');
    return newKey;
};

export const rotateKey = (currentKey: string): string => {
    logger.info('Module [Crypto]: Rotating session key.');
    // Simple regeneration for simulation is sufficient
    return generateKey();
};
