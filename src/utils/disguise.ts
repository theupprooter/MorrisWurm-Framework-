// Fix: Use a standard ES module import for Express and explicitly import Request and Response types
// to avoid conflicts with global DOM types.
import express, { Request, Response } from 'express';
import path from 'path';
import { logger } from './logger';

export const startDisguise = (): void => {
    const app = express();
    const port = 3000;

    // Endpoint to serve dynamic-looking data for the facade
    // Fix: Explicitly typing `req` and `res` with Express's types resolves
    // errors like "property 'json' does not exist".
    app.get('/weather', (req: Request, res: Response) => {
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
    // Fix: Correctly typing `app` by using the right import syntax for Express
    // resolves overload errors on `app.use`.
    app.use('/', express.static(publicPath));

    app.listen(port, () => {
        logger.info(`Facade server is up on http://localhost:${port}`);
    });
};
