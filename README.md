

# MorrisWurm-TS: A Conceptual Computer Worm Simulation

MorrisWurm-TS is an educational project that simulates the behavior and lifecycle of a conceptual computer worm in a controlled Node.js and TypeScript environment. It is designed to model the core stages of a worm's operation—reconnaissance, exploitation, replication, and C2 communication—without using real-world exploits or causing any actual harm.

The primary goal of this project is to provide a hands-on, observable model for understanding how self-replicating malware operates at a high level.

**Disclaimer:** ⚠️ This is a simulation for educational purposes ONLY. It does not contain any real-world exploits and should not be used for malicious activities. All "exploits" and "replications" are simulated against configurable, local test environments.

---

## Core Concepts

The simulation is built around a central loop that mimics a worm's lifecycle, orchestrated by the main `src/worm.ts` file.

1.  **Reconnaissance (Recon):** The worm scans its local network environment (`192.168.1.0/24`) to identify potential targets. It looks for machines with common open ports like `22` (SSH), `80` (HTTP), and `445` (SMB).
2.  **Exploitation:** Upon finding a target, it attempts a *mock* breach. The success rate of this breach is configurable, simulating the varying effectiveness of different exploits.
3.  **Replication:** If the exploit is "successful," the worm attempts to replicate itself to the target machine. It uses the `ssh2` library to connect with weak, pre-configured credentials, copies its own source code (`worm.ts`) via SFTP, and simulates remote execution.
4.  **Command & Control (C2):** If an exploit fails, the worm reports the failure to a mock C2 server. This communication is resilient; if the C2 is down, reports are queued in memory to be sent later. The C2 communicates back using a real-time, broadcast-based system.
5.  **Dynamic Mutation:** The C2 server, upon receiving a report, can broadcast a new payload of TypeScript code to all connected worm instances simultaneously via Socket.IO. The worm executes this code in a secure, sandboxed `vm` context to *dynamically patch its own modules (like `recon`, `exploit`, and `replication`) in memory*. This allows the entire swarm to change its behavior instantly without restarting.
6.  **Dynamic Disguise Facade:** While running, the worm starts an Express.js web server that serves a dynamic-looking "Project Dashboard" page. The page fetches data from a mock `/weather` API endpoint on the same server, making it appear as a legitimate web app to mask the process's true purpose.
7.  **Time-To-Live (TTL):** The worm is designed with a `TTL_HOPS` limit. After a set number of successful replications (hops), it terminates itself to prevent an infinite loop in the simulation.

---

## Features

-   **Live Network Scanning:** Utilizes the `node-nmap` library to perform actual network scans on the local subnet.
-   **Real-Time C2 Simulation:** The C2 server uses Socket.IO to broadcast mutations to all worm instances, enabling instant, swarm-wide updates.
-   **Live-Patching Engine:** The worm can receive and execute new code from the C2 to dynamically alter its own behavior mid-simulation.
-   **Authenticated Encryption:** Uses AES-256-CBC with HMAC-SHA256 to ensure C2 communications are confidential and tamper-proof.
-   **Resilient Communication:** Queues C2 reports in memory if the server is unreachable, preventing data loss.
-   **Strategic Key Rotation:** Rotates its encryption key after every 3rd failed exploit attempt.
-   **Simulated Lateral Movement:** Demonstrates replication via SSH and SFTP.
-   **Configurable Secrets:** Can be configured via environment variables for easy testing.
-   **Structured Logging:** Employs `winston` for clear, timestamped, and color-coded console output.
-   **Type-Safe Codebase:** Written entirely in TypeScript with strict compiler settings.

---

## Project Structure

```
morriswurm-ts/
├── public/
│   └── index.html      # Dynamic HTML/JS for the disguise facade server
├── src/
│   ├── modules/
│   │   ├── c2.ts       # Resilient C2 client: Reporting failures with in-memory queue
│   │   ├── connector.ts# Real-time Socket.IO client for receiving C2 broadcasts
│   │   ├── crypto.ts   # AES-256-CBC + HMAC-SHA256 implementation
│   │   ├── exploit.ts  # Mock breach logic (can be patched at runtime)
│   │   ├── mutations.ts# Collection of C2-deployable code payloads
│   │   ├── recon.ts    # Network scanning for potential targets
│   │   └── replication.ts# Self-replication logic via SSH/SFTP
│   ├── utils/
│   │   ├── disguise.ts # The Express.js facade server with mock API
│   │   ├── index.ts    # Barrel file for easy exports
│   │   └── logger.ts   # Winston logger configuration
│   ├── c2-server.ts    # Standalone mock C2 server with Socket.IO
│   └── worm.ts         # Main orchestrator, mutation engine, and simulation loop
├── types/
│   └── index.ts        # TypeScript interfaces (Target, ErrorLog)
├── package.json        # Project dependencies and scripts
└── README.md           # You are here!
```

---

## Setup and Usage

Follow these steps to set up and run the simulation.

### Prerequisites

-   [Node.js](https://nodejs.org/) (v16 or later)
-   `npm` (comes with Node.js)
-   **nmap:** The `nmap` command-line tool must be installed on your system and available in your system's PATH.
    -   **On macOS (Homebrew):** `brew install nmap`
    -   **On Debian/Ubuntu:** `sudo apt-get install nmap`
    -   **On Windows:** Download from the [official nmap website](https://nmap.org/download.html).

### 1. Installation

Clone the repository and install the required npm packages:

```bash
git clone <repository_url>
cd morriswurm-ts
npm install
```

### 2. Configuration (Optional)

The worm uses environment variables to configure its secrets:

-   `SSH_USER`: The username for a target machine for replication (defaults to `testuser`).
-   `SSH_PASS`: The password for a target machine for replication (defaults to `password`).
-   `BOOTSTRAP_KEY`: A 64-character hex string (32 bytes) used as the initial shared secret for encrypted C2 communication. If not provided, a random key is generated on startup.

You can set these in your shell before running the script:

```bash
export SSH_USER="your_test_user"
export SSH_PASS="your_test_password"
export BOOTSTRAP_KEY="a1b2c3d4e5f6a7b8a1b2c3d4e5f6a7b8a1b2c3d4e5f6a7b8a1b2c3d4e5f6a7b8"
```

### 3. Running the Simulation

The `dev` script uses `concurrently` to start both the C2 server and the worm simulation in the same terminal.

```bash
npm run dev
```

### Expected Output

You will see logs from both the C2 server and the worm instance, distinguished by their prefixes (`[0]` and `[1]`).

```
[0] 2023-10-27 12:00:00 info: Mock C2 server is listening on http://localhost:4000
[1] 2023-10-27 12:00:01 info: MorrisWurm slithering awake... [PID: 12345]
[1] 2023-10-27 12:00:01 info: Facade server is up on http://localhost:3000
[1] 2023-10-27 12:00:01 info: Module [Connector]: Initializing real-time connection to C2...
[1] 2023-10-27 12:00:01 info: Module [Crypto]: New 256-bit session key generated.
[0] 2023-10-27 12:00:02 info: C2 Server: Client connected: some_socket_id
[1] 2023-10-27 12:00:02 info: Module [Connector]: Successfully connected to C2 server with socket ID some_socket_id. Awaiting instructions.
...
[1] 2023-10-27 12:01:05 warn: Module [Exploit]: FAILED - Could not breach 192.168.1.10.
[1] 2023-10-27 12:01:05 warn: Module [C2]: Encrypting and reporting failure to C2 for instance 12345: conn_fail on 192.168.1.10
[0] 2023-10-27 12:01:06 info: C2 Server: Received valid report from instance 12345: {"type":"conn_fail",...}
[0] 2023-10-27 12:01:06 info: C2 Server: Broadcasting mutation to all clients.
[1] 2023-10-27 12:01:06 info: Module [Connector]: Received mutation broadcast from C2. Decrypting and applying...
[1] 2023-10-27 12:01:06 info: Module [Mutation]: Applying new code received from C2...
[1] 2023-10-27 12:01:06 info: Module [Mutation]: Successfully applied live patch to module: 'exploit'.
...
[1] 2023-10-27 12:01:12 info: [MUTATION ACTIVE] Using high-success-rate exploit (75%) on 192.168.1.11.
...
```