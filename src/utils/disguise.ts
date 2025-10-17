// Fix: Changed import to only use the default export of express.
// This allows using qualified types like `express.Request` to avoid conflicts with global DOM types.
import express from 'express';
import path from 'path';
import { logger } from './logger';

export const startDisguise = (): void => {
    // Fix: Explicitly type `app` with the qualified `express.Express` type.
    // This resolves overload errors on `app.use` by removing type ambiguity.
    const app: express.Express = express();
    const port = 3000;

    // Endpoint to serve dynamic-looking data for the facade
    // Fix: Explicitly type handler parameters with qualified `express.Request` and `express.Response` types.
    // This resolves the error where properties like `.json()` were not found due to type conflicts.
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
