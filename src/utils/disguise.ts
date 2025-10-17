import express from 'express';
import path from 'path';
import { logger } from './logger';

export const startDisguise = (): void => {
    const app = express();
    const port = 3000;

    const publicPath = path.join(__dirname, '../../public');
    // Fix: Explicitly provide path to resolve overload ambiguity.
    app.use('/', express.static(publicPath));

    app.listen(port, () => {
        logger.info(`Facade server is up on http://localhost:${port}`);
    });
};
