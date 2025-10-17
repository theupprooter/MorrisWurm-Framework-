

import { io, Socket } from 'socket.io-client';
import { LogEntry, WormEvent, ErrorLog } from '../types/index.ts';

const C2_URL = window.location.origin;

type LogCallback = (log: LogEntry) => void;
type ConnectionCallback = (isConnected: boolean) => void;

class SimulationService {
    private socket: Socket | null = null;

    public connect(onNewLog: LogCallback, onConnectionChange: ConnectionCallback): void {
        if (this.socket) return;

        this.socket = io(C2_URL, {
            reconnectionAttempts: 5,
            reconnectionDelay: 3000,
        });

        this.socket.on('connect', () => {
            onConnectionChange(true);
            onNewLog({
                timestamp: new Date().toLocaleTimeString(),
                type: 'system',
                message: 'Successfully connected to C2 server.',
            });
        });

        this.socket.on('disconnect', () => {
            onConnectionChange(false);
            onNewLog({
                // FIX: Corrected a malformed Date instantiation that contained a pasted URL.
                timestamp: new Date().toLocaleTimeString(),
                type: 'system',
                message: 'Disconnected from C2 server.',
            });
        });

        this.socket.on('connect_error', (err) => {
            onConnectionChange(false);
            onNewLog({
                timestamp: new Date().toLocaleTimeString(),
                type: 'error',
                message: `C2 connection error: ${err.message}`,
            });
        });

        this.socket.on('worm_event', (event: WormEvent) => {
            const log = this.formatEventToLog(event);
            onNewLog(log);
        });
    }

    private formatEventToLog(event: WormEvent): LogEntry {
        const { type, instanceId, data } = event;
        const timestamp = new Date().toLocaleTimeString();
        let message = '';
        let wormCount: number | undefined;

        switch (type) {
            case 'connect':
                message = `Worm connected [ID: ${instanceId}]`;
                wormCount = (data as { wormCount?: number }).wormCount;
                break;
            case 'disconnect':
                message = `Worm disconnected [ID: ${instanceId}]`;
                wormCount = (data as { wormCount?: number }).wormCount;
                break;
            case 'report':
                const reportData = data as ErrorLog;
                message = `Received failure report from [ID: ${instanceId}]: Type: ${reportData.type}, Target: ${reportData.targetIp}, Details: ${reportData.details}`;
                break;
            case 'mutation':
                 const mutationData = data as { mutation: string };
                message = `Broadcasted mutation to swarm. Details: ${mutationData.mutation}`;
                break;
            default:
                message = `Received unknown event: ${JSON.stringify(event)}`;
        }
        
        return { timestamp, type, message, wormCount };
    }
}

export const simulationService = new SimulationService();