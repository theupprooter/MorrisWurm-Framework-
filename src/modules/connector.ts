import { logger } from '../utils';

export const syncVariants = async (currentKey: string): Promise<void> => {
    logger.info('Module [Connector]: Syncing state with peer variants...');
    await new Promise(resolve => setTimeout(resolve, 400));
};
