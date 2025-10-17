import React from 'react';

const iconProps = {
    width: "1em",
    height: "1em",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round" as "round",
    strokeLinejoin: "round" as "round",
};

export const ConnectIcon: React.FC = () => <svg {...iconProps}><path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25" /><polyline points="8 16 12 12 8 8" /></svg>;
export const DisconnectIcon: React.FC = () => <svg {...iconProps}><path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25" /><line x1="8" y1="12" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="16" /></svg>;
export const ReportIcon: React.FC = () => <svg {...iconProps}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="18" x2="12" y2="12" /><line x1="12" y1="18" x2="9" y2="15" /><line x1="12" y1="18" x2="15" y2="15" /></svg>;
export const MutationIcon: React.FC = () => <svg {...iconProps}><path d="M12 2l-7 7h14l-7-7zM2 12l7 7v-7H2zM22 12l-7 7v-7h7z" /></svg>;
export const SystemIcon: React.FC = () => <svg {...iconProps}><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>;
export const ErrorIcon: React.FC = () => <svg {...iconProps}><path d="M18 6L6 18" /><path d="M6 6l12 12" /></svg>;
export const WifiIcon: React.FC = () => <svg {...iconProps}><path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M1.42 9a16 16 0 0 1 21.16 0" /><path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><line x1="12" y1="20" x2="12.01" y2="20" /></svg>;
export const WifiOffIcon: React.FC = () => <svg {...iconProps}><line x1="1" y1="1" x2="23" y2="23" /><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" /><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" /><path d="M10.71 5.05A16 16 0 0 1 22.58 9" /><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" /><path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><line x1="12" y1="20" x2="12.01" y2="20" /></svg>;
export const BugIcon: React.FC = () => <svg {...iconProps}><path d="M12 20c-3.3 0-6-2.7-6-6v-4c0-3.3 2.7-6 6-6s6 2.7 6 6v4c0 3.3-2.7 6-6 6z" /><path d="M12 20v-4" /><path d="M12 4V2" /><path d="M19 12h2" /><path d="M3 12h2" /><path d="m19 19-2-2" /><path d="m5 19 2-2" /><path d="m19 5-2 2" /><path d="m5 5 2 2" /></svg>;
