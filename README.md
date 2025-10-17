
# MorrisWurm-TS: A Conceptual Computer Worm Simulation

MorrisWurm-TS is an educational project that simulates the behavior and lifecycle of a conceptual computer worm in a controlled Node.js and TypeScript environment. It is designed to model the core stages of a worm's operation—reconnaissance, exploitation, replication, and C2 communication—without using real-world exploits or causing any actual harm.

The primary goal of this project is to provide a hands-on, observable model for understanding how self-replicating malware operates at a high level.

**Disclaimer:** ⚠️ This is a simulation for educational purposes ONLY. It does not contain any real-world exploits and should not be used for malicious activities. All "exploits" and "replications" are simulated against configurable, local test environments.

---

## Core Concepts

The simulation is built around a central loop that mimics a worm's lifecycle, orchestrated by the main `src/worm.ts` file.

1.  **Reconnaissance (Recon):** The worm scans its local network environment (`192.168.1.0/24`) to identify potential targets. It looks for machines with common open ports like `22` (SSH), `80` (HTTP), and `445` (SMB).
2.  **Exploitation:** Upon finding a target, it attempts a *mock* breach. In the current version, this is a simple 50% probability check to simulate the success or failure of an exploit.
3.  **Replication:** If the exploit is "successful," the worm attempts to replicate itself to the target machine. It uses the `ssh2` library to connect with weak, pre-configured credentials, copies its own source code (`worm.ts`) via SFTP, and simulates remote execution.
4.  **Command & Control (C2):** If an exploit fails, the worm reports the failure to a mock C2 server. It can also periodically check for "mutations" or new modules from the C2 to alter its behavior.
5.  **Disguise Facade:** While running, the worm starts a simple Express.js web server that serves a harmless-looking "To-Do List" webpage. This acts as a facade to mask the process's true purpose.
6.  **Time-To-Live (TTL):** The worm is designed with a `TTL_HOPS` limit. After a set number of successful replications (hops), it terminates itself to prevent an infinite loop in the simulation.

---

## Features

-   **Live Network Scanning:** Utilizes the `node-nmap` library to perform actual network scans on the local subnet, identifying active hosts.
-   **Modular Architecture:** Logic is cleanly separated into modules for each stage of the worm's lifecycle (`recon`, `exploit`, `c2`, `crypto`, `connector`).
-   **Simulated Lateral Movement:** Demonstrates replication via SSH and SFTP, a common vector for real-world worms.
-   **Configurable Credentials:** SSH credentials for replication can be set via environment variables (`SSH_USER`, `SSH_PASS`) for easy testing in a controlled VM environment.
-   **Structured Logging:** Employs `winston` for clear, timestamped, and color-coded console output, making it easy to follow the worm's actions in real-time.
-   **Type-Safe Codebase:** Written entirely in TypeScript with strict compiler settings for robustness and clarity.

---

## Project Structure

```
morriswurm-ts/
├── public/
│   └── index.html      # Static HTML for the disguise facade server
├── src/
│   ├── modules/
│   │   ├── c2.ts       # Mock C2: Reporting failures, fetching updates
│   │   ├── connector.ts# Mock P2P: Syncing with other worm variants
│   │   ├── crypto.ts   # Mock cryptography: Key generation/rotation
│   │   ├── exploit.ts  # Mock breach logic and error reporting
│   │   └── recon.ts    # Network scanning for potential targets
│   ├── utils/
│   │   ├── disguise.ts # The Express.js facade server
│   │   ├── index.ts    # Barrel file for easy exports
│   │   └── logger.ts   # Winston logger configuration
│   └── worm.ts         # Main orchestrator and simulation loop
├── types/
│   └── index.ts        # TypeScript interfaces (Target, ErrorLog)
├── package.json        # Project dependencies and scripts
├── tsconfig.json       # TypeScript compiler options
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

The replication module uses SSH to connect to targets. To test this, you can run a target VM with an SSH server. The worm uses the following environment variables for credentials:

-   `SSH_USER`: The username for the target machine (defaults to `testuser`).
-   `SSH_PASS`: The password for the target machine (defaults to `password`).

You can set these in your shell before running the script:

```bash
export SSH_USER="your_test_user"
export SSH_PASS="your_test_password"
```

### 3. Running the Simulation

Execute the main script using the `dev` command defined in `package.json`:

```bash
npm run dev
```

### Expected Output

You will see logs in your console as the worm initializes, starts its facade server, and begins its scan-exploit-replicate loop.

```
2023-10-27 10:30:00 info: MorrisWurm slithering awake...
2023-10-27 10:30:00 info: Facade server is up on http://localhost:3000
2023-10-27 10:30:00 info: Module [Crypto]: New session key generated.
2023-10-27 10:30:00 info: Module [Recon]: Starting nmap scan for 192.168.1.0/24 on ports 22,80,445...
...
2023-10-27 10:31:05 info: Module [Recon]: Identified active target 192.168.1.10 with open ports: [22]
2023-10-27 10:31:05 info: Module [Exploit]: Attempting breach on 192.168.1.10 on ports [22]...
2023-10-27 10:31:06 info: Module [Exploit]: SUCCESS - Gained access to 192.168.1.10.
2023-10-27 10:31:06 info: Module [Replicate]: Initiating self-replication sequence to 192.168.1.10...
...
```

To verify the disguise facade is running, open a new terminal and use `curl` or visit the URL in your browser:

```bash
curl http://localhost:3000
```

You should see the HTML of the "Project Dashboard" to-do list page.
