import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';
import { ConnectIcon, ReportIcon, MutationIcon, SystemIcon, ErrorIcon, DisconnectIcon } from './icons';

interface TerminalProps {
    logs: LogEntry[];
}

const getLogStyle = (type: LogEntry['type']) => {
    switch (type) {
        case 'connect': return { color: '#33ff33', icon: <ConnectIcon /> }; // Green
        case 'disconnect': return { color: '#fca5a5', icon: <DisconnectIcon /> }; // Light Red
        case 'report': return { color: '#facc15', icon: <ReportIcon /> }; // Yellow
        case 'mutation': return { color: '#60a5fa', icon: <MutationIcon /> }; // Blue
        case 'system': return { color: '#9ca3af', icon: <SystemIcon /> }; // Gray
        case 'error': return { color: '#ef4444', icon: <ErrorIcon /> }; // Red
        default: return { color: '#d4d4d4', icon: <SystemIcon /> };
    }
};

const Terminal: React.FC<TerminalProps> = ({ logs }) => {
    const endOfLogsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        endOfLogsRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    return (
        <div style={styles.terminalContainer}>
            {logs.map((log, index) => {
                const { color, icon } = getLogStyle(log.type);
                return (
                    <div key={index} style={{ ...styles.logEntry, color }}>
                        <span style={styles.icon}>{icon}</span>
                        <span style={styles.timestamp}>{log.timestamp}</span>
                        <span style={styles.message}>{log.message}</span>
                    </div>
                );
            })}
            <div ref={endOfLogsRef} />
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    terminalContainer: {
        backgroundColor: '#121212',
        border: '1px solid #333',
        borderRadius: '4px',
        padding: '10px',
        overflowY: 'auto',
        flex: 1,
        fontFamily: "'Menlo', 'Monaco', 'Courier New', monospace",
        fontSize: '0.9em',
        color: '#d4d4d4',
    },
    logEntry: {
        display: 'flex',
        alignItems: 'center',
        marginBottom: '5px',
        whiteSpace: 'pre-wrap',
    },
    icon: {
        marginRight: '10px',
        flexShrink: 0,
    },
    timestamp: {
        color: '#6b7280',
        marginRight: '10px',
    },
    message: {
        flex: 1,
    }
};

export default Terminal;
