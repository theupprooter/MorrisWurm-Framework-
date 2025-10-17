import React from 'react';
import { WifiIcon, WifiOffIcon, BugIcon } from './icons';

interface StatusBarProps {
    isConnected: boolean;
    wormCount: number;
}

const StatusBar: React.FC<StatusBarProps> = ({ isConnected, wormCount }) => {
    return (
        <div style={styles.statusBar}>
            <div style={styles.statusItem}>
                <span style={{...styles.icon, color: isConnected ? '#33ff33' : '#ef4444'}}>
                    {isConnected ? <WifiIcon /> : <WifiOffIcon />}
                </span>
                <span>{isConnected ? 'C2 Connected' : 'C2 Disconnected'}</span>
            </div>
            <div style={styles.statusItem}>
                <span style={styles.icon}><BugIcon /></span>
                <span>Active Worms: {wormCount}</span>
            </div>
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    statusBar: {
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
    },
    statusItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    icon: {
        display: 'flex',
        alignItems: 'center',
    }
};

export default StatusBar;
