
import crypto from 'crypto';
import { logger } from '../utils/logger.ts';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;
const HMAC_ALGORITHM = 'sha256';

export const generateKey = (): string => {
    const newKey = crypto.randomBytes(32).toString('hex');
    logger.info('Module [Crypto]: New 256-bit session key generated.');
    return newKey;
};

export const rotateKey = (currentKey: string): string => {
    logger.info('Module [Crypto]: Rotating session key.');
    return generateKey();
};

export const encrypt = (data: object, hexKey: string): string => {
    const key = Buffer.from(hexKey, 'hex');
    const iv = crypto.randomBytes(IV_LENGTH);
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const plainText = JSON.stringify(data);
    
    const encryptedBuffer = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);

    const hmac = crypto.createHmac(HMAC_ALGORITHM, key);
    hmac.update(iv);
    hmac.update(encryptedBuffer);
    const mac = hmac.digest();

    return Buffer.concat([iv, mac, encryptedBuffer]).toString('base64');
};

export const decrypt = (payload: string, hexKey: string): object | null => {
    try {
        const key = Buffer.from(hexKey, 'hex');
        const payloadBuffer = Buffer.from(payload, 'base64');
        const hmacLength = crypto.createHmac(HMAC_ALGORITHM, key).digest().length;

        const iv = payloadBuffer.subarray(0, IV_LENGTH);
        const receivedMac = payloadBuffer.subarray(IV_LENGTH, IV_LENGTH + hmacLength);
        const encrypted = payloadBuffer.subarray(IV_LENGTH + hmacLength);
        
        const hmac = crypto.createHmac(HMAC_ALGORITHM, key);
        hmac.update(iv);
        hmac.update(encrypted);
        const expectedMac = hmac.digest();

        if (!crypto.timingSafeEqual(receivedMac, expectedMac)) {
            logger.error('Module [Crypto]: Decryption failed: HMAC verification failed.');
            return null;
        }

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        const decryptedBuffer = Buffer.concat([decipher.update(encrypted), decipher.final()]);
        const decrypted = decryptedBuffer.toString('utf8');

        return JSON.parse(decrypted);
    } catch (error: any) {
        logger.error(`Module [Crypto]: Decryption failed with error: ${error.message}`);
        return null;
    }
};