// FIX: Import the `Express`, `Request`, and `Response` types to disambiguate from global DOM types.
import express, { Express, Request, Response } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { logger } from './utils/logger';
import { encrypt, decrypt } from './modules/crypto';

// FIX: Explicitly type `app` as `Express` to resolve type ambiguities with global DOM types that cause overload errors on `app.use`.
const app: Express = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Allow all origins for this simulation
    }
});

const PORT = 4000;

// This is a pre-canned "Gemini-generated" code payload.
// It's a string containing a JS expression that evaluates to an object.
const MUTATION_CODE = `
({
    attemptExploit: async (target, key, successRate) => {
        logger.warn(\`[MUTATION ACTIVE] C2 deployed a new exploit variant. This test variant always fails.\`);
        await new Promise(resolve => setTimeout(resolve, 200));
        return false;
    },
    getLastError: () => {
        return { type: 'mutated_auth_fail', details: 'The C2-provided exploit variant was ineffective.' };
    }
})
`;

app.use(express.json());

// Endpoint for worms to report failures
// FIX: Explicitly type handler parameters to resolve ambiguity with global DOM types, which was causing overload errors on `app.use`.
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

        // This simulates the "tasking" part. Based on the report, we broadcast a mutation to all connected clients.
        logger.info(`C2 Server: Broadcasting mutation to all clients.`);
        
        // Encrypt the mutation code with the key the worm just provided.
        const encryptedCode = encrypt({ code: MUTATION_CODE }, key);
        
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