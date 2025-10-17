
import { Target } from '../../types/index.ts';
import { logger } from '../utils/logger.ts';
import nmap from 'node-nmap';

const NMAP_RANGE = '192.168.1.0/24'; 
const PORTS_TO_SCAN = '22,80,445';

export const scanLocalNet = async (): Promise<Target[]> => {
    logger.info(`Module [Recon]: Starting nmap scan for ${NMAP_RANGE} on ports ${PORTS_TO_SCAN}...`);
    logger.info(`Module [Recon]: (This may take a few minutes and requires nmap to be installed on your system)`);

    return new Promise((resolve) => {
        const nmapScan = new nmap.NmapScan(NMAP_RANGE, `-p ${PORTS_TO_SCAN} -T4 -Pn`);

        nmapScan.on('complete', (data) => {
            const targets: Target[] = [];
            logger.info('Module [Recon]: Nmap scan complete. Parsing results...');
            
            data.forEach((host) => {
                if (host.status === 'up' && host.openPorts && host.openPorts.length > 0) {
                    const openPorts = host.openPorts.map(p => p.port);
                    targets.push({
                        ip: host.ip,
                        ports: openPorts,
                    });
                    logger.info(`Module [Recon]: Identified active target ${host.ip} with open ports: [${openPorts.join(', ')}]`);
                }
            });

            logger.info(`Module [Recon]: Found ${targets.length} potential targets.`);
            resolve(targets);
        });

        nmapScan.on('error', (error) => {
            logger.error(`Module [Recon]: Nmap scan error. Is nmap installed and in your PATH? Error: ${error}`);
            resolve([]); 
        });

        nmapScan.startScan();
    });
};