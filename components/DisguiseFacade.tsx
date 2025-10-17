import React from 'react';

const DisguiseFacade: React.FC = () => {
    // The disguise server runs on port 3000
    const disguiseUrl = 'http://localhost:3000';

    return (
        <div style={styles.facadeContainer}>
            <iframe
                src={disguiseUrl}
                style={styles.iframe}
                title="Worm Disguise Facade"
                sandbox="" // Prevents scripts in iframe from accessing parent, for security
            />
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    facadeContainer: {
        flex: 1,
        border: '1px solid #333',
        borderRadius: '4px',
        overflow: 'hidden',
    },
    iframe: {
        width: '100%',
        height: '100%',
        border: 'none',
    }
};

export default DisguiseFacade;
