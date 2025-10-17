export interface LogEntry {
  timestamp: string;
  type: 'connect' | 'disconnect' | 'report' | 'mutation' | 'system' | 'error';
  message: string;
  wormCount?: number;
}
