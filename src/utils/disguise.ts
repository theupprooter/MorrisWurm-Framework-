// Fix: Change import to use the default export from express to avoid type conflicts with global DOM types.
// FIX: Import the `Express`, `Request`, and `Response` types to disambiguate from global DOM types.
import express, { Express, Request, Response } from 'express';
import path from 'path';
import { logger } from './logger';

export const startDisguise = (): void => {
    // FIX: Explicitly type `app` to ensure Express's types are used for its methods, resolving overload errors.
    const app: Express = express();
    const port = 3000;

    // Endpoint to serve dynamic-looking data for the facade
    // FIX: Explicitly type handler parameters to resolve ambiguity with global DOM types, which was causing overload errors on `app.use`.
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
    // Fix: Explicitly provide path to resolve overload ambiguity.
    app.use('/', express.static(publicPath));

    app.listen(port, () => {
        logger.info(`Facade server is up on http://localhost:${port}`);
    });
};