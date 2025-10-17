import { io, Socket } from 'socket.io-client';
import { LogEntry } from '../types';

const C2_URL = `http://localhost:${process.env.C2_PORT || 4000}`;

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

        this.socket.on('worm_event', (event: any) => {
            const log = this.formatEventToLog(event);
            onNewLog(log);
        });
    }

    private formatEventToLog(event: any): LogEntry {
        const { type, instanceId, data } = event;
        const timestamp = new Date().toLocaleTimeString();
        let message = '';
        let wormCount: number | undefined;

        switch (type) {
            case 'connect':
                message = `Worm connected [ID: ${instanceId}]`;
                wormCount = data.wormCount;
                break;
            case 'disconnect':
                message = `Worm disconnected [ID: ${instanceId}]`;
                wormCount = data.wormCount;
                break;
            case 'report':
                message = `Received failure report from [ID: ${instanceId}]: Type: ${data.type}, Target: ${data.targetIp}`;
                break;
            case 'mutation':
                message = `Broadcasted mutation to swarm in response to [ID: ${instanceId}].`;
                break;
            default:
                message = `Received unknown event: ${JSON.stringify(event)}`;
        }
        
        return { timestamp, type, message, wormCount };
    }
}

export const simulationService = new SimulationService();
