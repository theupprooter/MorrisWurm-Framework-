// types/index.ts

// --- Shared Types ---

export interface Target {
  ip: string;
  ports: number[];
}

export interface ErrorLog {
  type: string;
  details: string;
  targetIp: string;
}

// --- Frontend Specific Types ---

export interface LogEntry {
  timestamp: string;
  type: 'connect' | 'disconnect' | 'report' | 'mutation' | 'system' | 'error';
  message: string;
  wormCount?: number;
}

// Defines the structure of the real-time events sent from C2 to the UI
export interface WormEvent {
  type: 'connect' | 'disconnect' | 'report' | 'mutation';
  instanceId: string;
  data: {
    wormCount?: number;
    mutation?: string;
  } | ErrorLog;
}
