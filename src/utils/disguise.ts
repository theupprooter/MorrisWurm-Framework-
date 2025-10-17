
// Fix: Changed express import to `require` and added explicit types to the handler to resolve type conflicts.
import express = require('express');
import path from 'path';
import { logger } from './logger';

export const startDisguise = (): void => {
    const app = express();
    const port = 3000;

    // Endpoint to serve dynamic-looking data for the facade
    app.get('/weather', (req: express.Request, res: express.Response) => {
        res.json({
            city: 'Metro City',
            temp: 72,
            forecast: 'Partly Cloudy',
            tasks: [
                'Submit quarterly report',
                'Update marketing materials',
                'Onboard new vendor',
                'Plan team offsite'
            ]
        });
    });

    const publicPath = path.join(__dirname, '../../public');
    app.use('/', express.static(publicPath));

    app.listen(port, () => {
        logger.info(`Facade server is up on http://localhost:${port}`);
    });
};
