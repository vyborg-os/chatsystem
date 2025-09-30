const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const GameBot = require('./gamebot');
const os = require('os');

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// Create HTTP server and Socket.io instance
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Set up file storage for shared files
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

// Serve uploaded files with CORS headers
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
}, express.static(uploadDir));

// Store users, messages, and credentials in memory (in a real app, you would use a database)
const users = {};
const messages = [];
const directMessages = {};
const gameBot = new GameBot();
const userCredentials = {
  // Pre-populated demo users
  'demo': {
    passkey: '1234',
    createdAt: new Date().toISOString(),
    displayName: 'Demo'
  },
  'test': {
    passkey: '1234',
    createdAt: new Date().toISOString(),
    displayName: 'Test'
  },
  'admin': {
    passkey: 'admin123',
    createdAt: new Date().toISOString(),
    displayName: 'Admin User'
  },
  'superadmin': {
    passkey: 'super123',
    createdAt: new Date().toISOString(),
    displayName: 'Super Admin',
    role: 'superadmin'
  },
  'vyborg': {
    passkey: '1234',
    createdAt: new Date().toISOString(),
    displayName: 'Vyborg'
  }
};

// Track used usernames to ensure uniqueness
const usedUsernames = new Set(['demo', 'test', 'admin', 'superadmin', 'vyborg']);

// Debug function to log the current state (disabled for performance)
function logUserState() {
  // Logging disabled to improve performance
}
const adminUsers = {
  'admin': {
    role: 'admin',
    badge: 'System Admin'
  },
  'moderator': {
    role: 'moderator',
    badge: 'Content Moderator'
  },
  'vyborg': {
    role: 'superadmin',
    badge: '⭐ Super Admin'
  },
  'test': {
    role: 'superadmin',
    badge: '⭐ Super Admin'
  }
};
const managerUsers = {
  'manager': {
    role: 'manager',
    badge: 'Team Manager'
  }
};

// Debug function to check user state
function logUserState() {
  // console.log('Current users:', Object.keys(users).length);
  // console.log('User credentials:', Object.keys(userCredentials).length);
  // console.log('Used usernames:', usedUsernames.size);
}

const MAX_MESSAGES = 100; // Store last 100 messages

// Socket.io connection handler
io.on('connection', (socket) => {
  // Connection logging disabled for performance
  
  // Handle reconnection attempts with stored session
  socket.on('reconnect', (userData) => {
    const { username, passkey } = userData;
    
    // Check if username exists and passkey is correct
    if (userCredentials[username.toLowerCase()] && 
        userCredentials[username.toLowerCase()].passkey === passkey) {
      
      // Check if user was previously connected
      const existingUser = Object.values(users).find(user => 
        user.username.toLowerCase() === username.toLowerCase()
      );
      
      if (existingUser) {
        // If user is already logged in, disconnect the previous session
        const existingSocketId = existingUser.id;
        if (io.sockets.sockets.get(existingSocketId) && existingSocketId !== socket.id) {
          io.sockets.sockets.get(existingSocketId).disconnect();
        }
        if (existingSocketId !== socket.id) {
          delete users[existingSocketId];
        }
      }
      
      const isAdmin = adminUsers[username.toLowerCase()];
      const isManager = managerUsers[username.toLowerCase()];
      
      // Create user object with new socket id
      const user = {
        id: socket.id,
        username: username,
        profilePic: userData.profilePic || null,
        systemInfo: userData.systemInfo || 'Unknown',
        isTyping: false,
        isRecording: false,
        role: userCredentials[username.toLowerCase()]?.role || (isAdmin ? isAdmin.role : (isManager ? isManager.role : 'user')),
        badge: isAdmin ? isAdmin.badge : (isManager ? isManager.badge : null),
        lastSeen: new Date().toISOString(),
        status: 'online'
      };
      
      // Store user in users object
      users[socket.id] = user;
      
      // User reconnected successfully
      
      // Send login success to the user
      socket.emit('loginSuccess', user);
      
      // Notify all clients about the reconnected user
      io.emit('userJoined', { users: Object.values(users) });
      
      // Send current user list and message history to the reconnected user
      socket.emit('initialData', {
        users: Object.values(users),
        messages: messages
      });
    } else {
      socket.emit('reconnectFailed', { 
        error: 'Session expired. Please login again.'
      });
    }
  });

  // User signup
  socket.on('signup', (userData) => {
    const userId = socket.id;
    const username = userData.username;
    
    // Signup attempt processing
    
    // Validate username
    if (!username || username.trim() === '') {
      // Empty username validation
      socket.emit('signupFailed', { 
        error: 'Username is required.'
      });
      return;
    }
    
    // Convert username to lowercase for case-insensitive comparison
    const lowercaseUsername = username.toLowerCase();
    
    // Check if username is already taken in userCredentials
    if (userCredentials[lowercaseUsername]) {
        // Username already exists
      socket.emit('signupFailed', { 
        error: 'Username already taken. Please choose another username.'
      });
      return;
    }
    
    // Check if username is in usedUsernames set but not in userCredentials
    // This is an inconsistent state that needs to be fixed
    if (usedUsernames.has(lowercaseUsername)) {
      // Fixing inconsistent state
      usedUsernames.delete(lowercaseUsername);
    }
    
    
    // Validate passkey
    if (!userData.passkey || userData.passkey.length !== 4) {
      socket.emit('signupFailed', { 
        error: 'Passkey must be 4 digits.'
      });
      return;
    }
    
    try {
      // Store user credentials - consistently use lowercase for the key
      userCredentials[lowercaseUsername] = {
        passkey: userData.passkey,
        createdAt: new Date().toISOString(),
        displayName: username  // Store the original display name with proper casing
      };
      
      // Add username to reserved set
      usedUsernames.add(lowercaseUsername);
      
      // console.log(`User signed up: ${username}`);
      // console.log(`Added to userCredentials and usedUsernames with key: ${lowercaseUsername}`);
      logUserState();
      
      // Debug check to verify user was properly stored
      if (userCredentials[lowercaseUsername]) {
        // console.log(`Verified: User ${username} successfully stored in userCredentials with key: ${lowercaseUsername}`);
        // console.log(`Stored data: ${JSON.stringify(userCredentials[lowercaseUsername])}`);
      } else {
        // console.log(`ERROR: Failed to store user ${username} in userCredentials!`);
      }
      
      // Send back the username in the success response
      socket.emit('signupSuccess', { 
        username: username,
        id: socket.id
      });
    } catch (error) {
      console.error('Error during signup:', error);
      socket.emit('signupFailed', { 
        error: 'An error occurred during signup. Please try again.'
      });
    }
  });
  
  // User login
  socket.on('login', (loginData) => {
    const userId = socket.id;
    const username = loginData.username;
    const passkey = loginData.passkey;
    
    // console.log(`Login attempt: ${username}`);
    // console.log(`Received credentials: username=${username}, passkey=${passkey}`);
    logUserState();
    
    // Convert username to lowercase for case-insensitive comparison
    const lowercaseUsername = username.toLowerCase();
    
    // Check if username exists in userCredentials
    if (!userCredentials[lowercaseUsername]) {
      // console.log(`Login failed: Username ${username} not found in userCredentials`);
      
      // If username is in usedUsernames but not in userCredentials, this is an inconsistent state
      if (usedUsernames.has(lowercaseUsername)) {
        // console.log(`Inconsistent state detected: ${username} is in usedUsernames but not in userCredentials. Removing from usedUsernames.`);
        usedUsernames.delete(lowercaseUsername);
      }
      
      socket.emit('loginFailed', { 
        error: 'Invalid username or passkey.'
      });
      return;
    }
    
    // console.log(`Username ${username} found in userCredentials, checking passkey...`);
    // console.log(`Stored passkey: ${userCredentials[lowercaseUsername].passkey}, Provided passkey: ${passkey}`);
    
    // Check if passkey is correct
    if (userCredentials[lowercaseUsername].passkey !== passkey) {
      // console.log(`Login failed: Incorrect passkey for ${username}`);
      socket.emit('loginFailed', { 
        error: 'Invalid username or passkey.'
      });
      return;
    }
    
    // console.log(`Login successful for ${username}`);
    
    // Check if user is already logged in with another socket
    Object.keys(users).forEach(socketId => {
      if (users[socketId].username && users[socketId].username.toLowerCase() === lowercaseUsername && socketId !== userId) {
        // console.log(`User ${username} is already logged in with socket ${socketId}. Disconnecting previous session.`);
        io.to(socketId).emit('forceDisconnect', { reason: 'You have been logged in from another device.' });
        delete users[socketId];
      }
    });
    
    // Get display name from credentials or use the provided username
    const displayName = userCredentials[lowercaseUsername].displayName || username;
    
    // Check if user is an admin or manager
    const isAdmin = adminUsers[lowercaseUsername];
    const isManager = managerUsers[lowercaseUsername];
    
    // Create user object
    const user = {
      id: userId,
      username: displayName, // Send display name to client for UI display
      lowercaseUsername: lowercaseUsername, // Store lowercase for consistent comparisons
      loginTime: new Date().toISOString(),
      profilePic: null, // Will be updated later if needed
      systemInfo: loginData.systemInfo || 'Unknown',
      isTyping: false,
      isRecording: false,
      role: isAdmin ? isAdmin.role : (isManager ? isManager.role : 'user'),
      badge: isAdmin ? isAdmin.badge : (isManager ? isManager.badge : null),
      lastSeen: new Date().toISOString(),
      status: 'online'
    };
    
    // Store user in users object
    users[userId] = user;
    
    // console.log(`User logged in: ${username} with ID ${userId}`);
    // console.log(`User object: ${JSON.stringify(user)}`);
    
    // Send login success to the user
    socket.emit('loginSuccess', user);
    
    // Notify all clients about the new user
    io.emit('userJoined', { users: Object.values(users) });
    
    // Send current user list and message history to the new user
    socket.emit('initialData', {
      users: Object.values(users),
      messages: messages
    });
  });
  
  // Legacy register handler for backward compatibility
  socket.on('register', (userData) => {
    const userId = socket.id;
    const username = userData.username;
    const passkey = userData.passkey || '1234'; // Default passkey if not provided
    const lowercaseUsername = username.toLowerCase();
    
    // Check if username is already in use by another active user
    const existingUser = Object.values(users).find(user => 
      user.username.toLowerCase() === lowercaseUsername && user.id !== userId
    );
    
    // Check if username is in the reserved set but not in userCredentials
    // This is an inconsistent state that needs to be fixed
    if (usedUsernames.has(lowercaseUsername) && !userCredentials[lowercaseUsername]) {
      // console.log(`Inconsistent state: Username ${username} is in usedUsernames but not in userCredentials. Removing from usedUsernames.`);
      usedUsernames.delete(lowercaseUsername);
    }
    
    // If username exists in userCredentials but user is trying to register with it
    if (userCredentials[lowercaseUsername]) {
      // Username is already registered, reject registration
      socket.emit('registrationFailed', { 
        error: 'Username already registered. Please login or choose another username.'
      });
      return;
    }
    
    // If username is in use by another active session
    if (existingUser) {
      // Username is already taken, reject registration
      socket.emit('registrationFailed', { 
        error: 'Username already taken. Please choose another username.'
      });
      return;
    }
    
    // Add username to reserved set and store credentials
    usedUsernames.add(lowercaseUsername);
    
    // Store user credentials for future login
    userCredentials[lowercaseUsername] = {
      passkey: passkey,
      displayName: username,
      createdAt: new Date().toISOString()
    };
    
    const isAdmin = adminUsers[lowercaseUsername];
    const isManager = managerUsers[lowercaseUsername];
    
    users[userId] = {
      id: userId,
      username: username,
      profilePic: userData.profilePic || null,
      systemInfo: userData.systemInfo || 'Unknown',
      isTyping: false,
      isRecording: false,
      role: isAdmin ? isAdmin.role : (isManager ? isManager.role : 'user'),
      badge: isAdmin ? isAdmin.badge : (isManager ? isManager.badge : null),
      lastSeen: new Date().toISOString(),
      status: 'online'
    };
    
    // console.log(`User registered: ${username}`);
    io.emit('userJoined', { users: Object.values(users) });
    
    // Send current user list and message history to the new user
    socket.emit('initialData', {
      users: Object.values(users),
      messages: messages
    });
  });
  
  // Handle chat messages
  socket.on('message', (message) => {
    const newMessage = {
      id: uuidv4(),
      ...message,
      timestamp: new Date().toISOString(),
      readBy: [socket.id], // Mark as read by sender
      edited: false,
      deleted: false,
      replyTo: message.replyTo || null,
      reactions: {}
    };
    
    // Check if this is a direct message
    if (message.recipientId) {
      // Initialize DM container if it doesn't exist
      const dmKey = [socket.id, message.recipientId].sort().join('-');
      if (!directMessages[dmKey]) {
        directMessages[dmKey] = [];
      }
      
      // Add message to DMs
      directMessages[dmKey].push(newMessage);
      
      // Send only to recipient and sender
      io.to(message.recipientId).emit('directMessage', newMessage);
      socket.emit('directMessage', newMessage);
    } else {
      // Regular group message
      messages.push(newMessage);
      io.emit('message', newMessage);
    }
  });
  
  // Handle direct message history request
  socket.on('getDirectMessages', (data) => {
    const { otherUserId } = data;
    if (!otherUserId) return;
    
    const dmKey = [socket.id, otherUserId].sort().join('-');
    const dmHistory = directMessages[dmKey] || [];
    
    socket.emit('directMessageHistory', {
      userId: otherUserId,
      messages: dmHistory
    });
  });
  
  // Handle message editing
  socket.on('editMessage', (data) => {
    const { messageId, newContent } = data;
    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    
    if (messageIndex !== -1) {
      // Only allow editing own messages
      if (messages[messageIndex].userId === socket.id) {
        messages[messageIndex].text = newContent;
        messages[messageIndex].edited = true;
        messages[messageIndex].editedAt = new Date().toISOString();
        
        io.emit('messageUpdated', messages[messageIndex]);
      }
    }
  });
  
  // Handle message deletion
  socket.on('deleteMessage', (data) => {
    const { messageId } = data;
    // console.log('Delete request for message:', messageId, 'from socket:', socket.id);
    
    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    
    if (messageIndex !== -1) {
      const message = messages[messageIndex];
      // console.log('Found message:', message.id, 'userId:', message.userId, 'socket.id:', socket.id);
      
      // Check multiple ways to identify ownership
      const currentUser = users[socket.id];
      const canDelete = (
        message.userId === socket.id ||
        (currentUser && message.username === currentUser.username) ||
        (currentUser && message.userId === currentUser.id)
      );
      
      // console.log('Can delete:', canDelete, 'currentUser:', currentUser);
      
      if (canDelete) {
        messages[messageIndex].deleted = true;
        messages[messageIndex].text = 'This message was deleted';
        messages[messageIndex].fileName = undefined;
        messages[messageIndex].fileUrl = undefined;
        
        // console.log('Message deleted successfully');
        io.emit('messageDeleted', { messageId });
      } else {
        // console.log('Delete denied - not message owner');
      }
    } else {
      // console.log('Message not found in messages array');
    }
  });
  
  // Gamebot commands
  socket.on('startGame', (data) => {
    const user = users[socket.id];
    // console.log('Start game request from:', socket.id, 'user:', user, 'data:', data);
    
    if (!gameBot.isSuperAdmin(user)) {
      // console.log('Permission denied - user role:', user?.role);
      socket.emit('gameError', { message: 'Only superadmin can start games' });
      return;
    }
    
    // console.log('Starting game with duration:', data?.duration);
    const result = gameBot.startGame(data?.duration);
    // console.log('Game start result:', result);
    
    if (result.success) {
      io.emit('gameStarted', {
        gameId: result.gameId,
        letters: result.letters,
        duration: result.duration,
        message: result.message
      });
      // console.log('Game started successfully, broadcasted to all clients');
    } else {
      // console.log('Game start failed:', result.message);
      socket.emit('gameError', { message: result.message });
    }
  });
  
  socket.on('getGameStatus', () => {
    const status = gameBot.getGameStatus();
    socket.emit('gameStatus', status);
  });
  
  socket.on('getAllTimeLeaderboard', () => {
    const leaderboard = gameBot.getAllTimeLeaderboard();
    // GameBot now includes usernames directly, no need to enrich
    socket.emit('allTimeLeaderboard', leaderboard);
  });

  // Test event handler for debugging
  socket.on('test', (data) => {
    console.log('Test event received:', data);
    socket.emit('testResponse', { message: 'Test successful!' });
  });

  // Handle dedicated game word submissions
  socket.on('submitGameWord', (data) => {
    console.log('=== SUBMIT GAME WORD EVENT ===');
    console.log('Received submitGameWord:', data, 'from user:', users[socket.id]?.username);
    console.log('GameBot active:', gameBot.isActive);
    console.log('GameBot current game:', gameBot.currentGame ? 'exists' : 'null');
    
    const { word } = data;
    const user = users[socket.id];
    
    if (!gameBot.isActive) {
      console.log('Game not active - sending failure response');
      socket.emit('gameSubmission', {
        success: false,
        message: 'No active game',
        isGameSubmission: true
      });
      return;
    }
    
    if (!word || word.trim().length === 0) {
      console.log('Empty word submitted - sending failure response');
      socket.emit('gameSubmission', {
        success: false,
        message: 'Please enter a word',
        isGameSubmission: true
      });
      return;
    }
    
    console.log('Processing word submission:', word.trim());
    console.log('Current game letters:', gameBot.currentGame?.letters);
    
    try {
      const wordSubmission = gameBot.submitWord(socket.id, user?.username || 'Anonymous', word.trim());
      console.log('Word submission result:', wordSubmission);
      console.log('Sending gameSubmission event to client');
      
      // Send immediate feedback to the user
      socket.emit('gameSubmission', wordSubmission);
      
      // If it's a valid word, broadcast the score update to everyone
      if (wordSubmission.success) {
        console.log('Broadcasting score update to all clients');
        io.emit('gameScoreUpdate', {
          username: user?.username || 'Anonymous',
          word: word.trim(),
          points: wordSubmission.points,
          totalScore: wordSubmission.totalScore
        });
      }
    } catch (error) {
      console.error('Error processing word submission:', error);
      console.log('Sending error response to client');
      socket.emit('gameSubmission', {
        success: false,
        message: 'Error processing word: ' + error.message,
        isGameSubmission: true
      });
    }
    console.log('=== END SUBMIT GAME WORD EVENT ===');
  });
  
  // Handle message editing (duplicate handler - updated)
  socket.on('editMessage', (data) => {
    const { messageId, newText } = data;
    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    
    if (messageIndex !== -1) {
      const message = messages[messageIndex];
      
      // Only allow editing own messages
      if (message.userId === socket.id) {
        // Only allow editing text messages
        if (message.type === 'text') {
          messages[messageIndex].text = newText;
          messages[messageIndex].edited = true;
          messages[messageIndex].editedAt = new Date().toISOString();
          
          io.emit('messageEdited', { 
            messageId, 
            newText, 
            edited: true,
            editedAt: messages[messageIndex].editedAt 
          });
        }
      }
    }
  });
  
  // Handle user status updates
  socket.on('updateStatus', (data) => {
    if (users[socket.id]) {
      users[socket.id].status = data.status;
      users[socket.id].lastSeen = new Date().toISOString();
      io.emit('userUpdated', { users: Object.values(users) });
    }
  });
  
  // Handle typing indicator
  socket.on('typing', () => {
    if (users[socket.id] && !users[socket.id].isTyping) {
      users[socket.id].isTyping = true;
      
      // Broadcast to all other clients only if not already typing
      socket.broadcast.emit('userTyping', {
        userId: socket.id
      });
    }
  });
  
  // Handle stop typing
  socket.on('stopTyping', () => {
    if (users[socket.id] && users[socket.id].isTyping) {
      users[socket.id].isTyping = false;
      
      // Broadcast to all other clients only if was typing
      socket.broadcast.emit('userStoppedTyping', {
        userId: socket.id
      });
    }
  });
  
  // Handle recording indicator
  socket.on('recording', () => {
    if (users[socket.id]) {
      users[socket.id].isRecording = true;
      
      // Broadcast to all other clients
      socket.broadcast.emit('userRecording', {
        userId: socket.id
      });
    }
  });
  
  // Handle stop recording
  socket.on('stopRecording', () => {
    if (users[socket.id]) {
      users[socket.id].isRecording = false;
      
      // Broadcast to all other clients
      socket.broadcast.emit('userStoppedRecording', {
        userId: socket.id
      });
    }
  });
  
  // Handle message read receipts
  socket.on('markAsRead', (data) => {
    if (!users[socket.id] || !data.messageIds || !Array.isArray(data.messageIds)) {
      return;
    }
    
    // Update read status for each message
    data.messageIds.forEach(messageId => {
      const message = messages.find(msg => msg.id === messageId);
      if (message) {
        // Initialize readBy array if it doesn't exist
        if (!message.readBy) {
          message.readBy = [];
        }
        
        // Add user to readBy if not already there
        if (!message.readBy.includes(socket.id)) {
          message.readBy.push(socket.id);
          
          // Notify all clients about the read receipt
          io.emit('messageRead', {
            messageIds: [messageId],
            userId: socket.id
          });
        }
      }
    });
  });
  
  // Handle profile updates
  socket.on('updateProfile', (data) => {
    if (users[socket.id]) {
      const currentUser = users[socket.id];
      const oldUsername = currentUser.username;
      const oldLowercaseUsername = currentUser.lowercaseUsername || oldUsername.toLowerCase();
      
      // Check if username is being changed
      if (data.username && data.username !== oldUsername) {
        const newLowercaseUsername = data.username.toLowerCase();
        
        // Check if the new username is already taken by another active user
        const isUsernameTaken = Object.values(users).some(user => 
          (user.lowercaseUsername || user.username.toLowerCase()) === newLowercaseUsername && user.id !== socket.id
        );
        
        // Check if username exists in userCredentials (but allow if it's the same user)
        const existsInCredentials = userCredentials[newLowercaseUsername];
        if (existsInCredentials && userCredentials[oldLowercaseUsername] && 
            userCredentials[oldLowercaseUsername].passkey !== existsInCredentials.passkey) {
          socket.emit('profileUpdateFailed', { 
            error: 'Username already taken. Please choose another username.'
          });
          return;
        }
        
        if (isUsernameTaken) {
          socket.emit('profileUpdateFailed', { 
            error: 'Username already taken. Please choose another username.'
          });
          return;
        }
        
        // Update userCredentials if user has credentials
        if (userCredentials[oldLowercaseUsername]) {
          const credentials = userCredentials[oldLowercaseUsername];
          delete userCredentials[oldLowercaseUsername];
          userCredentials[newLowercaseUsername] = {
            ...credentials,
            displayName: data.username
          };
        }
        
        // Remove old username from reserved set and add new one
        usedUsernames.delete(oldLowercaseUsername);
        usedUsernames.add(newLowercaseUsername);
        
        // Update user object
        users[socket.id].username = data.username;
        users[socket.id].lowercaseUsername = newLowercaseUsername;
      }
      
      // Update profile picture
      if (data.profilePic !== undefined) {
        users[socket.id].profilePic = data.profilePic;
      }
      
      users[socket.id].lastSeen = new Date().toISOString();
      
      // Notify all clients about the update
      io.emit('userUpdated', { users: Object.values(users) });
      
      // Confirm successful update to the user
      socket.emit('profileUpdateSuccess', {
        user: users[socket.id],
        username: users[socket.id].username,
        profilePic: users[socket.id].profilePic
      });
    }
  });
  
  // Handle message reactions
  socket.on('addReaction', (data) => {
    const { messageId, emoji } = data;
    
    if (!users[socket.id]) return;
    
    // Find the message
    const message = messages.find(msg => msg.id === messageId);
    if (!message) return;
    
    // Initialize reactions for this message if needed
    if (!message.reactions) {
      message.reactions = {};
    }
    
    // Initialize reactions for this emoji if needed
    if (!message.reactions[emoji]) {
      message.reactions[emoji] = [];
    }
    
    // Check if user already reacted with this emoji
    const existingReactionIndex = message.reactions[emoji].findIndex(
      reaction => reaction.userId === users[socket.id].id
    );
    
    if (existingReactionIndex !== -1) {
      // User already reacted with this emoji, remove the reaction
      message.reactions[emoji].splice(existingReactionIndex, 1);
      
      // Remove the emoji entry if no reactions left
      if (message.reactions[emoji].length === 0) {
        delete message.reactions[emoji];
      }
    } else {
      // Add the new reaction
      message.reactions[emoji].push({
        userId: users[socket.id].id,
        username: users[socket.id].username
      });
    }
    
    // Broadcast the updated reactions
    io.emit('messageReactionUpdated', {
      messageId,
      reactions: message.reactions
    });
  });
  
  // Handle role assignment (admin only)
  socket.on('assignRole', (data) => {
    const { targetUserId, role } = data;
    
    // Only super admin can assign roles
    if (users[socket.id]?.role === 'superadmin') {
      const targetUser = Object.values(users).find(user => user.id === targetUserId);
      
      if (targetUser) {
        // Cannot change super admin role
        if (targetUser.role !== 'superadmin') {
          const userId = targetUser.id;
          users[userId].role = role;
          users[userId].badge = role === 'manager' ? '⭐ Manager' : null;
          
          // Update manager users list for persistence
          if (role === 'manager') {
            managerUsers[users[userId].username.toLowerCase()] = { 
              role: 'manager', 
              badge: '⭐ Manager' 
            };
          } else {
            delete managerUsers[users[userId].username.toLowerCase()];
          }
          
          io.emit('userUpdated', { users: Object.values(users) });
        }
      }
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    if (users[socket.id]) {
      const username = users[socket.id].username;
      const lowercaseUsername = users[socket.id].lowercaseUsername || username.toLowerCase();
      // console.log(`User disconnected: ${username}`);
      
      // Update user status to offline
      users[socket.id].status = 'offline';
      users[socket.id].lastSeen = new Date().toISOString();
      
      // Broadcast to all clients
      io.emit('userLeft', { 
        userId: socket.id,
        users: Object.values(users)
      });
      
      // Check if this user is the last instance of this username
      const otherSessionsWithSameUsername = Object.values(users).some(user => 
        user.id !== socket.id && 
        (user.lowercaseUsername === lowercaseUsername || user.username.toLowerCase() === lowercaseUsername)
      );
      
      // If no other sessions with this username, we can safely remove from active users
      // but keep their credentials for reconnection
      setTimeout(() => {
        delete users[socket.id];
        // console.log(`Removed disconnected user ${username} from active users list`);
      }, 5000); // 5 second delay before removing from active users
    }
  });
});

// File upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  // Use absolute URL with hostname for file downloads
  const hostname = req.get('host') || 'localhost:5000';
  const protocol = req.protocol || 'http';
  const fileUrl = `${protocol}://${hostname}/uploads/${req.file.filename}`;
  
  res.json({
    fileUrl,
    fileName: req.file.originalname,
    fileSize: req.file.size
  });
});

// Get all users
app.get('/users', (req, res) => {
  res.json(Object.values(users));
});

// Get message history
app.get('/messages', (req, res) => {
  res.json(messages);
});

// Auto-timeout check for games
setInterval(() => {
  const result = gameBot.checkGameTimeout();
  if (result && result.success) {
    io.emit('gameEnded', result.results);
  }
}, 5000); // Check every 5 seconds

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  // console.log(`Server running on port ${PORT}`);
  // console.log(`Server IP: ${getLocalIpAddress()}`);
  // console.log(`Access from other devices using: http://${getLocalIpAddress()}:${PORT}`);
});

// Helper function to get local IP address
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip over non-IPv4 and internal (loopback) addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}
