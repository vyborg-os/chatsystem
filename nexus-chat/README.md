# NexusChat

NexusChat is a modern office messaging system designed for teams working on the same network. Created by Vyborg, this application provides a seamless communication experience with a beautiful UI and smooth user experience.

## Features

- **Simple Authentication**: Just enter your username to get started
- **System Information Collection**: Automatically collects basic PC information
- **Group Chat**: Real-time messaging with all connected users
- **File Sharing**: Easily share files with your team
- **Emoji Support**: Express yourself with a wide range of emojis
- **Link Sharing**: Share links directly in the chat
- **Voice Notes**: Record and send voice messages
- **Modern UI**: Clean, responsive design for a great user experience

## Technology Stack

- **Frontend**: React with TypeScript, Material-UI
- **Backend**: Node.js with Express
- **Real-time Communication**: Socket.io
- **File Handling**: Multer

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository or download the source code

2. Install frontend dependencies:
```bash
cd nexus-chat
npm install
```

3. Install backend dependencies:
```bash
cd server
npm install
```

### Running the Application

1. Start the backend server:
```bash
cd server
npm start
```

2. In a new terminal, start the frontend:
```bash
# From the root directory
npm start
```

3. Access the application in your browser at `http://localhost:3000`

## Usage

1. Enter your username on the login screen
2. Start chatting with your colleagues
3. Use the attachment button to share files
4. Click the emoji button to add emojis to your messages
5. Hold the microphone button to record voice messages
6. View all connected users by clicking the users icon

## Network Configuration

Since this application is designed to work across PCs on the same network:

1. Make sure all computers are connected to the same network
2. The server will display its local IP address on startup
3. Other users should connect to `http://<server-ip>:3000`

## Created By

Vyborg

---

Feel free to contribute to this project by submitting pull requests or reporting issues.
