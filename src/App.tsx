import React, { useState, useEffect } from 'react';
import { simulationService } from './services/simulationService';
import { LogEntry } from '../types';
import Terminal from './components/Terminal';
import StatusBar from './components/StatusBar';

const App: React.FC = () => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [wormCount, setWormCount] = useState(0);

    useEffect(() => {
        const handleNewLog = (log: LogEntry) => {
            setLogs(prevLogs => [...prevLogs.slice(-200), log]); // Keep last 200 logs
            if (log.wormCount !== undefined) {
                setWormCount(log.wormCount);
            }
        };

        simulationService.connect(handleNewLog, setIsConnected);

    }, []);

    return (
        <div style={styles.appContainer}>
            <header style={styles.header}>
                <h1 style={styles.title}>MorrisWurm-TS Visualizer</h1>
                <StatusBar isConnected={isConnected} wormCount={wormCount} />
            </header>
            <main style={styles.mainContent}>
                <div style={styles.leftPanel}>
                    <h2 style={styles.panelTitle}>C2 Activity Log</h2>
                    <Terminal logs={logs} />
                </div>
            </main>
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    appContainer: {
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        backgroundColor: '#1e1e1e',
        color: '#d4d4d4',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 20px',
        backgroundColor: '#252526',
        borderBottom: '1px solid #333',
    },
    title: {
        margin: 0,
        fontSize: '1.5em',
    },
    mainContent: {
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
    },
    leftPanel: {
        flex: 1,
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
    },
    panelTitle: {
        marginTop: 0,
        marginBottom: '15px',
        borderBottom: '1px solid #444',
        paddingBottom: '10px',
    }
};

export default App;
