

# MorrisWurm-TS: An AI-Driven Computer Worm Simulation

MorrisWurm-TS is an educational project that simulates the behavior and lifecycle of a conceptual computer worm in a controlled Node.js and TypeScript environment. It is designed to model the core stages of a worm's operation—reconnaissance, exploitation, replication, and C2 communication—with a key feature: its C2 server uses a **Generative AI (Gemini)** to create adaptive mutations in real-time.

The primary goal of this project is to provide a hands-on, observable model for understanding how modern, AI-enhanced malware could operate at a high level.

**Disclaimer:** ⚠️ This is a simulation for educational purposes ONLY. It does not contain any real-world exploits and should not be used for malicious activities. All "exploits" and "replications" are simulated against configurable, local test environments.

---

## Core Concepts

The simulation is built around a central loop that mimics a worm's lifecycle, orchestrated by the main `src/worm.ts` file.

1.  **Reconnaissance (Recon):** The worm scans its local network environment to identify potential targets.
2.  **Exploitation:** Upon finding a target, it attempts a *mock* breach. The success rate is dynamic and can be altered by the AI.
3.  **Replication:** If the exploit is "successful," the worm attempts to replicate itself to the target machine via SSH.
4.  **Command & Control (C2):** If an exploit fails, the worm reports the failure to a C2 server.
5.  **AI-Driven Mutation:** The C2 server, upon receiving a report, sends the failure context and worm source code to a **Generative AI (Gemini)** via a detailed prompt. The AI analyzes the failure and generates a new, custom TypeScript payload to overcome the obstacle. This payload is broadcast to all connected worm instances.
6.  **Live-Patching:** The worms execute the AI's code in a secure, sandboxed `vm` context to *dynamically patch their own modules in memory*. This allows the entire swarm to change its behavior instantly without restarting.
7.  **Dynamic Disguise Facade:** While running, the worm starts an Express.js web server that serves a dynamic-looking "Project Dashboard" page to mask its true purpose.
8.  **Time-To-Live (TTL):** The worm is designed with a `TTL_HOPS` limit to prevent infinite loops.

---

## Features

-   **AI-Driven Adaptation Engine:** Uses the Gemini API to analyze failures and generate intelligent, real-time code mutations.
-   **Live Network Scanning:** Utilizes `node-nmap` to perform actual network scans on the local subnet.
-   **Real-Time C2 Simulation:** The C2 server uses Socket.IO to broadcast mutations to all worm instances, enabling instant, swarm-wide updates.
-   **Live-Patching Engine:** The worm can receive and execute new code from the C2 to dynamically alter its own behavior mid-simulation.
-   **Swarm-Wide Evolution:** AI-generated mutations propagate instantly to all instances.
-   **Authenticated Encryption:** Uses AES-256-CBC with HMAC-SHA256 for secure C2 communications.
-   **Resilient Communication:** Queues C2 reports in memory if the server is unreachable.
-   **Simulated Lateral Movement:** Demonstrates replication via SSH and SFTP.
-   **Structured Logging:** Employs `winston` for clear, timestamped, and color-coded console output.

---

## Project Structure

```
morriswurm-ts/
├── src/
│   ├── modules/
│   │   ├── ai.ts       # NEW: The AI engine that calls the Gemini API
│   │   ├── c2.ts       # C2 client for reporting failures
│   │   ├── connector.ts# Real-time Socket.IO client for receiving mutations
│   │   ├── ... (other modules)
│   ├── c2-website.ts   # All-in-one AI-powered C2 server and visualizer UI
│   └── worm.ts         # Main orchestrator and live-patching engine
├── prompt.txt          # The master prompt for the Gemini AI model
├── ... (other files)
```

---

## Setup and Usage

Follow these steps to set up and run the simulation.

### Prerequisites

-   [Node.js](https://nodejs.org/) (v20 or later)
-   `npm` (comes with Node.js)
-   **nmap:** The `nmap` command-line tool must be installed on your system.
-   **Gemini API Key:** You must have a valid API key for the Gemini API. You can get one from [Google AI Studio](https://aistudio.google.com/).

### 1. Installation

Clone the repository and install the required npm packages:

```bash
git clone <repository_url>
cd morriswurm-ts
npm install
```

### 2. Configuration (Required)

The simulation uses environment variables to configure its secrets:

-   `API_KEY`: **(Required)** Your API key for the Gemini API. The C2 server will not generate mutations without this.
-   `SSH_USER`: The username for a target machine for replication (defaults to `testuser`).
-   `SSH_PASS`: The password for a target machine for replication (defaults to `password`).
-   `C2_PORT`: The port for the C2 server (defaults to `4000`).
-   `BOOTSTRAP_KEY`: A 64-character hex string for the initial shared secret.

You must set your API key in your shell before running the script:

```bash
export API_KEY="your_gemini_api_key_here"
export SSH_USER="your_test_user"
# ... other variables
```

### 3. Running the Simulation

The `dev` script starts both the AI-powered C2 website and the worm simulation.

```bash
npm run dev
```

Once running, **open your browser and navigate to `http://localhost:4000`** to see the live visualizer dashboard. When an exploit fails, you will see the C2 server call the AI to generate a new patch in real time.
