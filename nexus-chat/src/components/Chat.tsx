import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Message, ChatUser, Reaction } from '../types';
import { playNotificationSound, initAudioContext } from '../utils/notification';
import {
  Box,
  Grid,
  Paper,
  Typography,
  TextField,
  Button,
  IconButton,
  Avatar,
  AppBar,
  Toolbar,
  Badge,
  LinearProgress,
  Divider,
  Menu,
  MenuItem,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  // Popover, // Unused import
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemButton,
  Tooltip,
  // Link // Unused import
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import PeopleIcon from '@mui/icons-material/People';
import LogoutIcon from '@mui/icons-material/Logout';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import CloseIcon from '@mui/icons-material/Close';
import LockIcon from '@mui/icons-material/Lock';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import EditIcon from '@mui/icons-material/Edit';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import InsertLinkIcon from '@mui/icons-material/InsertLink';
import GetAppIcon from '@mui/icons-material/GetApp';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';
import ReplyIcon from '@mui/icons-material/Reply';
import DoneAllIcon from '@mui/icons-material/DoneAll';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import LinkIcon from '@mui/icons-material/Link';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import ChatIcon from '@mui/icons-material/Chat';
import Picker, { EmojiClickData } from 'emoji-picker-react';
import LinkPreview from './LinkPreview';
import MessageReactions from './MessageReactions';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import DirectMessage from './DirectMessage';
import GameBot from './GameBot';
import { useAuth } from '../context/AuthContext';

const Chat: React.FC = () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { user, logout, lockApp, updateProfile, darkMode, toggleDarkMode, setCurrentDM } = useAuth();
  const navigate = useNavigate();
  
  // State variables
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState<string>('');
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [showUserList, setShowUserList] = useState<boolean>(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [newUsername, setNewUsername] = useState<string>(user?.username || '');
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [recording, setRecording] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [recordingInterval, setRecordingInterval] = useState<NodeJS.Timeout | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [fileUploadProgress, setFileUploadProgress] = useState<number | null>(null);
  const [profileUpdateLoading, setProfileUpdateLoading] = useState(false);
  const [previewFile, setPreviewFile] = useState<{url: string, type: string, name: string} | null>(null);
  const [currentUser, setCurrentUser] = useState<ChatUser | null>(null);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [showGameBot, setShowGameBot] = useState(false);
  
  // Refs
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const inputRef = useRef<HTMLInputElement | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Save username to localStorage when user logs in
  useEffect(() => {
    if (user?.username) {
      localStorage.setItem('nexus-username', user.username);
    }
  }, [user?.username]);

  // Connect to socket server
  // Function to request notification permission
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return;
    }
    
    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      await Notification.requestPermission();
    }
  };
  
  // Show notification
  const showNotification = (title: string, body: string, icon?: string) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }
    
    try {
      new Notification(title, {
        body,
        icon: icon || '/logo192.png'
      });
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  };
  
  // Request notification permission and initialize audio
  useEffect(() => {
    requestNotificationPermission();
    
    // Try to initialize audio context immediately
    initAudioContext();
    
    // Also initialize on first user interaction to handle browsers that require user gesture
    const handleUserInteraction = () => {
      initAudioContext();
      // Play a silent sound to unlock audio on iOS
      playNotificationSound();
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
    
    // Listen for both click and touch events to handle mobile devices
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);
    
    // Use existing socket connection from AuthContext
    const socket = (window as any).socket;
    
    if (!socket) {
      console.error('No socket connection available');
      setLoading(false);
      return;
    }
    
    console.log('Using existing socket connection:', socket.id);
    socketRef.current = socket;
    setLoading(false);
    
    // Send user info - use reconnect for already logged-in users
    if (user) {
      console.log('Reconnecting user with server:', user.username);
      socket.emit('reconnect', {
        username: user.username,
        passkey: user.passkey || '', // The passkey might not be available in the user object
        profilePic: user.profilePic,
        role: user.role,
        systemInfo: {
          os: navigator.platform,
          hostname: window.location.hostname,
          platform: navigator.userAgent,
          cpuCores: navigator.hardwareConcurrency,
          totalMemory: '8GB', // Example, would need backend to provide real value
          ipAddress: '' // Would be set by server
        }
      });
    }
    
    // Handle registration failures
    socket.on('registrationFailed', (data: { error: string }) => {
      alert(data.error);
      logout();
    });
    
    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('Disconnected from server');
      setLoading(true);
    });
    
    // Listen for direct messages
    socket.on('directMessage', (message: Message) => {
      // If message is from someone else and we're not in that DM, increment unread count
      if (message.userId !== socketRef.current?.id && message.userId !== user?.id) {
        // Update users list with unread count
        setUsers(prevUsers => {
          return prevUsers.map(u => {
            if (u.id === message.userId) {
              // Show notification for new message
              showNotification(
                `New message from ${message.username}`,
                'info'
              );
                
                // Play notification sound
                playNotificationSound();
                
                // Increment unread count
                return { ...u, unreadCount: (u.unreadCount || 0) + 1 };
              }
            return u;
          });
        });
      }
    });
    
    // Handle messages
    socket.on('message', (newMessage: Message) => {
      setMessages(prev => [...prev, newMessage]);
      setLoading(false);
      
      // If message is from someone else
      if (newMessage.userId !== socketRef.current?.id && 
          newMessage.userId !== user?.id) {
          
        // Update unread count for the sender in the users list
        setUsers(prevUsers => {
          return prevUsers.map(u => {
            // If this is the sender, increment unread count
            if (u.id === newMessage.userId) {
              // Increment unread count
              return { ...u, unreadCount: (u.unreadCount || 0) + 1 };
            }
            return u;
          });
        });
        
        // Show notification for group message
        showNotification(
          `New group message from ${newMessage.username}`,
          'info'
        );
        
        // Play notification sound
        playNotificationSound();
      }
      
      // Mark message as read
      if (newMessage && newMessage.id) {
        socket.emit('messageRead', {
          messageId: newMessage.id,
          userId: user?.id
        });
      }
    });
    
    // Handle message reaction updates
    socket.on('messageReactionUpdated', (data: { messageId: string, reactions: Record<string, Reaction[]> }) => {
      setMessages(prev => prev.map(msg => 
        msg.id === data.messageId 
          ? { ...msg, reactions: data.reactions } 
          : msg
      ));
    });
    
    // Handle message updates
    socket.on('messageUpdated', (updatedMessage: Message) => {
      setMessages(prev => 
        prev.map(msg => msg.id === updatedMessage.id ? updatedMessage : msg)
      );
    });
    
    // Handle message deletion
    socket.on('messageDeleted', ({ messageId }: { messageId: string }) => {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, deleted: true, text: 'This message was deleted', fileName: undefined, fileUrl: undefined } 
            : msg
        )
      );
    });
    
    // Handle message editing
    socket.on('messageEdited', ({ messageId, newText, edited, editedAt }: { messageId: string, newText: string, edited: boolean, editedAt: string }) => {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, text: newText, edited, editedAt } 
            : msg
        )
      );
    });
    
    // Handle user list updates
    socket.on('userJoined', (data: { users: ChatUser[] }) => {
      setUsers(data.users);
      
      // Update current user if they're in the list
      if (socketRef.current?.id) {
        const myUser = data.users.find(u => u.id === socketRef.current!.id);
        if (myUser) {
          setCurrentUser(myUser);
        }
      }
    });
    
    // Handle successful login/reconnection
    if (socketRef.current) {
      socketRef.current.on('loginSuccess', (data: { username: string; id: string }) => {
        console.log('Login successful:', data);
        setLoading(false);
        
        // Find the user in the users list and set as current user
        const loggedInUser = users.find(u => u.id === data.id);
        if (loggedInUser) {
          // User found in list, use that data
          console.log('Found user in list:', loggedInUser);
          setCurrentUser(loggedInUser);
        } else {
          // User not in list yet, will be added when userList is received
          console.log('User not in list yet, waiting for userList update');
        }
      });
    }
    
    // Handle user updates (including profile changes)
    socket.on('userUpdated', (data: { users: ChatUser[] }) => {
      setUsers(data.users);
      
      // Update current user if their profile was changed
      if (user) {
        const updatedCurrentUser = data.users.find(u => u.id === user.id);
        if (updatedCurrentUser) {
          updateProfile({
            username: updatedCurrentUser.username,
            profilePic: updatedCurrentUser.profilePic
          });
        }
      }
    });
    
    // Handle initial data
    socket.on('initialData', (data: { users: ChatUser[], messages: Message[] }) => {
      setUsers(data.users);
      setMessages(data.messages);
    });
    
    // Handle typing indicators
    socket.on('userTyping', (userId: string) => {
      setUsers(prev => 
        prev.map(u => 
          u.id === userId 
            ? { ...u, isTyping: true } 
            : u
        )
      );
    });
    
    // Handle stop typing
    socket.on('userStoppedTyping', (userId: string) => {
      setUsers(prev => 
        prev.map(u => 
          u.id === userId 
            ? { ...u, isTyping: false } 
            : u
        )
      );
    });
    
    // Handle recording indicators
    socket.on('userRecording', (userId: string) => {
      setUsers(prev => 
        prev.map(u => 
          u.id === userId 
            ? { ...u, isRecording: true } 
            : u
        )
      );
    });
    
    // Handle stop recording
    socket.on('userStoppedRecording', (userId: string) => {
      setUsers(prev => 
        prev.map(u => 
          u.id === userId 
            ? { ...u, isRecording: false } 
            : u
        )
      );
    });
    
    // Clean up on unmount
    return () => {
      if (socketRef.current) {
        // Remove all event listeners
        socket.off('registrationFailed');
        socket.off('disconnect');
        socket.off('directMessage');
        socket.off('message');
        socket.off('messageReactionUpdated');
        socket.off('messageUpdated');
        socket.off('messageDeleted');
        socket.off('messageEdited');
        socket.off('userJoined');
        socket.off('userUpdated');
        socket.off('initialData');
        socket.off('userTyping');
        socket.off('userStoppedTyping');
        socket.off('userRecording');
        socket.off('userStoppedRecording');
      }
    };
  }, [user, logout, updateProfile, users]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, messagesEndRef]);

  // State for user mentions
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showMentions, setShowMentions] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [mentionFilter, setMentionFilter] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [mentionAnchorEl, setMentionAnchorEl] = useState<null | HTMLElement>(null);

  // Handle message change
  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMessageText(value);
    
    // Handle @ mentions
    const lastAtIndex = value.lastIndexOf('@');
    if (lastAtIndex !== -1 && (lastAtIndex >= value.lastIndexOf(' ') || lastAtIndex === 0)) {
      const mentionText = value.substring(lastAtIndex + 1);
      setMentionFilter(mentionText);
      setShowMentions(true);
      setMentionAnchorEl(e.target);
    } else {
      setShowMentions(false);
    }
    
    // Optimized typing indicator with debouncing
    if (socketRef.current) {
      // Clear existing timeout
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
      
      // Only send typing indicator if user is actually typing (not just clearing)
      if (value.trim()) {
        // Send typing indicator only once per typing session
        if (!users.find(u => u.id === socketRef.current?.id)?.isTyping) {
          socketRef.current.emit('typing');
        }
        
        // Set timeout to stop typing indicator
        const timeout = setTimeout(() => {
          if (socketRef.current) {
            socketRef.current.emit('stopTyping');
          }
        }, 1500); // Reduced timeout for better responsiveness
        
        setTypingTimeout(timeout);
      } else {
        // Immediately stop typing if input is empty
        socketRef.current.emit('stopTyping');
      }
    }
  };

  // Handle key press (Enter to send)
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle send message
  const handleSendMessage = () => {
    if (!messageText.trim() && !editingMessage) return;
    
    if (socketRef.current) {
      if (editingMessage) {
        // Edit message
        socketRef.current.emit('editMessage', {
          messageId: editingMessage.id,
          newText: messageText.trim()
        });
        
        // Reset state
        setEditingMessage(null);
        setMessageText('');
      } else {
        // Send new message
        const newMessage = {
          text: messageText,
          type: 'text' as const,
          userId: socketRef.current.id || user?.id || '',  // Use socket ID as primary user ID
          username: user?.username || 'Anonymous',
          replyTo: replyingTo ? {
            id: replyingTo.id,
            username: replyingTo.username,
            text: replyingTo.text,
            type: replyingTo.type
          } : undefined
        };
        
        socketRef.current.emit('message', newMessage);
        
        // Reset state
        setMessageText('');
        setReplyingTo(null);
        
        // Stop typing indicator
        socketRef.current.emit('stopTyping');
      }
    }
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !socketRef.current) return;
    
    setFileUploadProgress(0);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', user?.id || '');
    formData.append('username', user?.username || 'Anonymous');
    
    // Add reply metadata if replying
    if (replyingTo) {
      formData.append('replyToId', replyingTo.id);
      formData.append('replyToUsername', replyingTo.username);
      formData.append('replyToText', replyingTo.text || '');
      formData.append('replyToType', replyingTo.type);
    }
    
    // Upload file with progress tracking
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    const hostname = window.location.hostname;
    const fallbackBase = `${protocol}//${hostname}:3001`;
    const apiBase = (process.env.REACT_APP_SOCKET_URL || fallbackBase).replace(/\/$/, '');
    const xhr = new XMLHttpRequest();
    
    xhr.open('POST', `${apiBase}/upload`, true);
    
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const progress = Math.round((e.loaded / e.total) * 100);
        setFileUploadProgress(progress);
      }
    };
    
    xhr.onload = () => {
      if (xhr.status === 200) {
        try {
          const data = JSON.parse(xhr.responseText);
          console.log('File uploaded:', data);
          
          // File uploaded successfully - message will be received via socket
          console.log('File uploaded, waiting for socket message');
          
          // Don't add to local messages - let the server response handle it
          // The server will emit the message back to all clients including sender
          
          // Emit file message after successful upload
          if (socketRef.current) {
            const newMessage = {
              text: '',
              fileUrl: data.fileUrl,
              fileName: data.fileName,
              fileSize: data.fileSize,
              type: 'file',
              username: user?.username || 'Anonymous',
              userId: user?.id || socketRef.current.id,
              replyTo: replyingTo ? {
                id: replyingTo.id,
                username: replyingTo.username,
                text: replyingTo.text,
                type: replyingTo.type
              } : undefined
            };
            
            socketRef.current.emit('message', newMessage);
          }
          
          setReplyingTo(null);
        } catch (error) {
          console.error('Error parsing server response:', error);
        }
      } else {
        console.error('Error uploading file:', xhr.statusText);
      }
      setFileUploadProgress(null);
    };
    
    xhr.onerror = () => {
      console.error('Error uploading file');
      setFileUploadProgress(null);
    };
    
    xhr.send(formData);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle emoji select
  const handleEmojiSelect = (emoji: EmojiClickData) => {
    setMessageText(prev => prev + emoji.emoji);
    setShowEmojiPicker(false);
  };
  
  // Handle user mention selection
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleMentionSelect = (username: string) => {
    const lastAtIndex = messageText.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const newText = messageText.substring(0, lastAtIndex) + '@' + username + ' ';
      setMessageText(newText);
      
      // Focus the input field after selecting a user
      setTimeout(() => {
        const inputField = document.getElementById('message-input');
        if (inputField) {
          inputField.focus();
          // Place cursor at the end
          const inputElement = inputField as HTMLInputElement;
          const length = inputElement.value.length;
          inputElement.setSelectionRange(length, length);
        }
      }, 50);
    }
    setShowMentions(false);
  };

  // Start recording
  const startRecording = async () => {
    try {
      // Check if browser supports getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Your browser does not support audio recording. Please try a different browser.');
        return;
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create media recorder
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      
      // Handle data available event
      recorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };
      
      // Start recording
      recorder.start();
      setRecording(true);
      setRecordingTime(0);
      
      // Start timer
      const interval = setInterval(() => {
        setRecordingTime(prev => prev + 0.1);
      }, 100);
      setRecordingInterval(interval);
      
      // Notify that user is recording
      if (socketRef.current) {
        socketRef.current.emit('recording');
      }
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please check your permissions.');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      
      // Clear recording timer interval
      if (recordingInterval) {
        clearInterval(recordingInterval);
        setRecordingInterval(null);
      }
      
      // Handle recording stopped
      mediaRecorderRef.current.onstop = async () => {
        // Create audio blob
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Use the actual recorded time instead of estimate
        const duration = recordingTime;
        
        // Submit voice note
        await handleSubmitVoiceNote(audioBlob, duration);
        
        // Reset recording state
        setRecording(false);
        setRecordingTime(0);
        audioChunksRef.current = [];
        
        // Notify that user stopped recording
        if (socketRef.current) {
          socketRef.current.emit('stopRecording');
        }
      };
    }
  };

  // Handle voice note submission
  const handleSubmitVoiceNote = async (audioBlob: Blob, duration: number) => {
    if (!socketRef.current) return;
    
    const formData = new FormData();
    formData.append('file', audioBlob, 'voice_note.webm'); // Use 'file' to match server expectation
    formData.append('userId', user?.id || '');
    formData.append('username', user?.username || 'Anonymous');
    formData.append('duration', duration.toString());
    
    // Add reply metadata if replying
    if (replyingTo) {
      formData.append('replyToId', replyingTo.id);
      formData.append('replyToUsername', replyingTo.username);
      formData.append('replyToText', replyingTo.text || '');
      formData.append('replyToType', replyingTo.type);
    }
    
    // Upload voice note
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    const hostname = window.location.hostname;
    const fallbackBase = `${protocol}//${hostname}:3001`;
    const apiBase = (process.env.REACT_APP_SOCKET_URL || fallbackBase).replace(/\/$/, '');
    try {
      const response = await fetch(`${apiBase}/upload`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Voice note uploaded:', data);
      
      // Emit voice message after successful upload
      if (socketRef.current) {
        const newMessage = {
          text: '',
          voiceUrl: data.fileUrl,
          fileName: data.fileName,
          duration: duration,
          type: 'voice',
          replyTo: replyingTo ? {
            id: replyingTo.id,
            username: replyingTo.username,
            text: replyingTo.text,
            type: replyingTo.type
          } : undefined
        };
        
        socketRef.current.emit('message', newMessage);
      }
      
      setReplyingTo(null);
    } catch (error) {
      console.error('Error uploading voice note:', error);
    }
  };

  // Handle menu open
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, message: Message) => {
    setAnchorEl(event.currentTarget);
    setSelectedMessage(message);
  };

  // Handle menu close
  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedMessage(null);
  };

  // Note: We use the close button in the UI to cancel edit/reply
  // This functionality is handled directly in the onClick of that button

  // Handle message edit
  const handleEditMessage = (message: Message) => {
    // All users can edit any message (super admin privileges)
    if (user) {
      setEditingMessage(message);
      setReplyingTo(null);
      setMessageText(message.text || '');
      setAnchorEl(null);
      inputRef.current?.focus();
    }
  };

  // Submit edited message
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const submitEditedMessage = () => {
    if (!socketRef.current || !editingMessage || !messageText.trim()) return;
    
    socketRef.current.emit('editMessage', {
      messageId: editingMessage.id,
      newText: messageText.trim()
    });
    
    setEditingMessage(null);
    setMessageText('');
  };

  // Handle message deletion
  const handleDeleteMessage = (messageId: string) => {
    if (!socketRef.current) return;
    console.log('Deleting message:', messageId);
    socketRef.current.emit('deleteMessage', { messageId });
  };

  // Handle message reply
  const handleReplyMessage = (message: Message) => {
    setReplyingTo(message);
    setEditingMessage(null);
    setMessageText('');
    setAnchorEl(null);
  };

  // Handle logout
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleLogout = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    logout();
    navigate('/login');
  };

  // Handle lock app
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleLockApp = () => {
    lockApp();
  };

  // Handle profile update
  const handleProfileUpdate = () => {
    if (!newUsername.trim()) {
      return;
    }
    
    setProfileUpdateLoading(true);
    
    // Setup listeners for profile update success/failure
    if (socketRef.current) {
      // Set timeout in case server doesn't respond
      const timeoutId = setTimeout(() => {
        setProfileUpdateLoading(false);
        socketRef.current?.off('profileUpdateFailed');
        socketRef.current?.off('profileUpdateSuccess');
        alert('Profile update timed out. Please try again.');
      }, 10000);

      // Handle profile update success
      socketRef.current.once('profileUpdateSuccess', (data) => {
        clearTimeout(timeoutId);
        setProfileUpdateLoading(false);
        // Update user with new profile data
        if (user) {
          updateProfile({ 
            username: data.username, 
            profilePic: data.profilePic 
          });
          setNewUsername(data.username);
        }
        setShowProfileModal(false);
        setProfilePicture(null);
        socketRef.current?.off('profileUpdateFailed');
      });
      
      // Handle profile update failure
      socketRef.current.once('profileUpdateFailed', (data) => {
        clearTimeout(timeoutId);
        setProfileUpdateLoading(false);
        alert(data.error);
        setNewUsername(user?.username || '');
        setProfilePicture(null);
        socketRef.current?.off('profileUpdateSuccess');
      });
      
      // Send update to server
      socketRef.current.emit('updateProfile', {
        username: newUsername,
        profilePic: profilePicture
      });
    }
  };

  // Handle profile picture upload
  const handleProfilePictureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const result = reader.result as string;
        setProfilePicture(result);
        console.log('Profile picture set:', result.substring(0, 50) + '...');
      };
      
      reader.readAsDataURL(file);
    }
  };

  // Handle adding reaction to message
  const handleAddReaction = (messageId: string, emoji: string) => {
    if (!socketRef.current || !user) return;
    
    socketRef.current.emit('addReaction', {
      messageId,
      emoji
    });
  };
  
  // Scroll to a specific message
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const scrollToMessage = (messageId: string) => {
    const messageElement = messageRefs.current[messageId];
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Highlight the message briefly
      messageElement.style.backgroundColor = 'rgba(99, 102, 241, 0.2)';
      setTimeout(() => {
        messageElement.style.backgroundColor = '';
      }, 2000);
    }
  };

  // Check if user can edit/delete message
  const canModifyMessage = (message: Message) => {
    if (!user) return false;
    
    // Check multiple ways to identify current user's messages
    const storedUsername = localStorage.getItem('username');
    return (
      message.userId === user.id || 
      message.userId === socketRef.current?.id ||
      (storedUsername && message.username === storedUsername) ||
      message.username === user.username
    );
  };

  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Render a single message
  const renderMessage = (message: Message) => {
    // Check if current user sent the message - use stored username as primary check
    const storedUsername = localStorage.getItem('nexus-username');
    const isCurrentUser: boolean = Boolean(
      (storedUsername && message.username === storedUsername) ||
      (user?.username && message.username === user.username) ||
      (message.userId === user?.id || message.userId === socketRef.current?.id)
    );
    
    // Debug log for file messages
    if (message.type === 'file') {
      console.log('File message debug:', {
        messageUserId: message.userId,
        currentUserId: user?.id,
        socketId: socketRef.current?.id,
        messageUsername: message.username,
        currentUsername: user?.username,
        storedUsername: localStorage.getItem('nexus-username'),
        isCurrentUser,
        messageObject: message
      });
      
      // Force current user detection for debugging
      if (message.username === user?.username) {
        console.log('Username match detected, forcing isCurrentUser = true');
      }
    }
    
    return (
      <Box
        key={message.id}
        ref={(el: HTMLDivElement | null) => messageRefs.current[message.id] = el}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: isCurrentUser ? 'flex-end' : 'flex-start',
          mb: 2,
          maxWidth: '85%',
          alignSelf: isCurrentUser ? 'flex-end' : 'flex-start',
          marginLeft: isCurrentUser ? 'auto' : '0',
          marginRight: isCurrentUser ? '0' : 'auto',
          width: '100%',
          justifyContent: isCurrentUser ? 'flex-end' : 'flex-start',
        }}
      >
        {/* Reply indicator */}
        {message.replyTo && (
          <Box
            sx={{
              bgcolor: 'background.paper',
              p: 1,
              borderRadius: 1,
              mb: 0.5,
              opacity: 0.8,
              width: '100%',
              borderLeft: '3px solid',
              borderColor: 'primary.main'
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
              {message.replyTo.username}:
            </Typography>
            <Typography variant="caption" sx={{ ml: 1 }}>
              {message.replyTo.type === 'text' ? message.replyTo.text : 
               message.replyTo.type === 'file' ? '[File]' : '[Voice Message]'}
            </Typography>
          </Box>
        )}
        
        {/* Text messages */}
        {message.type === 'text' && (
          <Paper
            elevation={1}
            onContextMenu={(e) => {
              e.preventDefault();
              handleMenuOpen(e, message);
            }}
            sx={{
              p: 2,
              maxWidth: '70%',
              background: isCurrentUser ? 'linear-gradient(45deg, #6366f1 30%, #818cf8 90%)' : 'grey.100',
              color: isCurrentUser ? 'white' : 'text.primary',
              borderRadius: '18px',
              borderTopRightRadius: isCurrentUser ? '6px' : '18px',
              borderTopLeftRadius: isCurrentUser ? '18px' : '6px',
              position: 'relative',
              wordBreak: 'break-word',
              alignSelf: isCurrentUser ? 'flex-end' : 'flex-start',
              '&:hover .message-actions': {
                opacity: 1
              }
            }}
          >
            <Typography variant="subtitle2" sx={{ 
              fontWeight: 'bold', 
              mb: 0.5,
              display: 'block'
            }}>
              {message.username}
            </Typography>
            
            {message.deleted ? (
              <Typography variant="body2" sx={{ fontStyle: 'italic', opacity: 0.7 }}>
                This message was deleted
              </Typography>
            ) : (
              <>
                <Typography variant="body1">
                  {message.text}
                </Typography>
                
                {/* Link Preview - detect URLs in text messages */}
                {(() => {
                  const urlRegex = /(https?:\/\/[^\s]+)/g;
                  const urls = message.text ? message.text.match(urlRegex) : null;
                  
                  if (urls && urls.length > 0) {
                    return (
                      <Box sx={{ mt: 1 }}>
                        <LinkPreview url={urls[0]} />
                      </Box>
                    );
                  }
                  return null;
                })()}
              </>
            )}
            
            {/* Timestamp, edit indicator, and reactions */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                  {formatTime(message.timestamp)}
                </Typography>
                
                {message.edited && (
                  <Typography variant="caption" sx={{ ml: 1, opacity: 0.7 }}>
                    (edited)
                  </Typography>
                )}
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <MessageReactions
                  messageId={message.id}
                  reactions={message.reactions || {}}
                  onAddReaction={handleAddReaction}
                  currentUserId={user?.id || ''}
                  isCurrentUserMessage={isCurrentUser}
                />
                
                {message.readBy && message.readBy.length > 0 && isCurrentUser && (
                  <Tooltip title="Read by">
                    <DoneAllIcon fontSize="small" sx={{ ml: 0.5, opacity: 0.7 }} />
                  </Tooltip>
                )}
              </Box>
            </Box>
            
            {/* Message actions */}
            {!message.deleted && (
              <IconButton
                size="small"
                onClick={(e) => handleMenuOpen(e, message)}
                sx={{ position: 'absolute', top: 0, right: 0 }}
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
            )}
          </Paper>
        )}
      
      {/* File messages */}
      {message.type === 'file' && (
        <Box 
          onContextMenu={(e) => {
            e.preventDefault();
            handleMenuOpen(e, message);
          }}
          sx={{ 
            p: 2,
            maxWidth: '70%',
            background: isCurrentUser ? 'linear-gradient(45deg, #6366f1 30%, #818cf8 90%)' : 'grey.100',
            color: isCurrentUser ? 'white' : 'text.primary',
            borderRadius: '18px',
            borderTopRightRadius: isCurrentUser ? '6px' : '18px',
            borderTopLeftRadius: isCurrentUser ? '18px' : '6px',
            position: 'relative',
            wordBreak: 'break-word',
            alignSelf: isCurrentUser ? 'flex-end' : 'flex-start',
            '&:hover .message-actions': {
              opacity: 1
            }
          }}
        >
          {message.deleted ? (
            <Typography variant="body2" sx={{ fontStyle: 'italic', opacity: 0.7 }}>
              This message was deleted
            </Typography>
          ) : (
            <>
              <Typography variant="subtitle2" sx={{ 
                fontWeight: 'bold', 
                mb: 0.5,
                display: 'block',
                color: isCurrentUser ? 'white' : 'text.primary'
              }}>
                {message.username}
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                <Avatar sx={{ 
                  width: 36, 
                  height: 36, 
                  mr: 1.5, 
                  bgcolor: 'rgba(99, 102, 241, 0.1)'
                }}>
                  <AttachFileIcon sx={{ color: '#6366f1' }} />
                </Avatar>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                    {message.fileName}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>
                    {message.fileSize ? (message.fileSize / 1024 / 1024).toFixed(2) + ' MB' : 'Unknown size'}
                  </Typography>
                </Box>
              </Box>
            </>
          )}
          
          {/* File preview */}
          {!message.deleted && (() => {
            if (!message.fileUrl) return null;
            
            const fileExtension = message.fileName?.split('.').pop()?.toLowerCase();
            
            if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(fileExtension || '')) {
              return (
                <Box 
                  onClick={() => setPreviewFile({ url: message.fileUrl!, name: message.fileName!, type: 'image' })}
                  sx={{ 
                    cursor: 'pointer',
                    borderRadius: 2,
                    overflow: 'hidden',
                    mb: 1,
                    '&:hover': { opacity: 0.8 }
                  }}
                >
                  <img 
                    src={(function(){
                      const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
                      const hostname = window.location.hostname;
                      const fallbackBase = `${protocol}//${hostname}:3001`;
                      const apiBase = (process.env.REACT_APP_SOCKET_URL || fallbackBase).replace(/\/$/, '');
                      return message.fileUrl?.startsWith('http') ? message.fileUrl! : `${apiBase}${message.fileUrl}`;
                    })()}
                    alt={message.fileName}
                    style={{ 
                      maxWidth: '100%', 
                      maxHeight: '200px', 
                      borderRadius: '8px',
                      objectFit: 'cover'
                    }}
                    loading="lazy"
                    onError={(e) => {
                      console.error('Image failed to load:', message.fileUrl);
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </Box>
              );
            }
            
            if (['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(fileExtension || '')) {
              return (
                <Box 
                  onClick={() => setPreviewFile({ url: message.fileUrl!, name: message.fileName!, type: 'video' })}
                  sx={{ 
                    cursor: 'pointer',
                    borderRadius: 2,
                    overflow: 'hidden',
                    mb: 1,
                    '&:hover': { opacity: 0.8 }
                  }}
                >
                  <video 
                    src={(function(){
                      const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
                      const hostname = window.location.hostname;
                      const fallbackBase = `${protocol}//${hostname}:3001`;
                      const apiBase = (process.env.REACT_APP_SOCKET_URL || fallbackBase).replace(/\/$/, '');
                      return message.fileUrl?.startsWith('http') ? message.fileUrl! : `${apiBase}${message.fileUrl}`;
                    })()}
                    style={{ 
                      maxWidth: '100%', 
                      maxHeight: '200px', 
                      borderRadius: '8px'
                    }}
                    controls={false}
                    muted
                    onError={(e) => {
                      console.error('Video failed to load:', message.fileUrl);
                      e.currentTarget.style.display = 'none';
                    }}
                  >
                    Your browser does not support the video tag.
                  </video>
                </Box>
              );
            }
            
            return null;
          })()}
          
          {/* Timestamp and reactions */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
            <Typography variant="caption" sx={{ opacity: 0.7 }}>
              {formatTime(message.timestamp)}
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <MessageReactions
                messageId={message.id}
                reactions={message.reactions || {}}
                onAddReaction={handleAddReaction}
                currentUserId={user?.id || ''}
                isCurrentUserMessage={isCurrentUser}
              />
              
              {message.readBy && message.readBy.length > 0 && isCurrentUser && (
                <Tooltip title="Read by">
                  <DoneAllIcon fontSize="small" sx={{ ml: 0.5, opacity: 0.7 }} />
                </Tooltip>
              )}
            </Box>
          </Box>
          
          {/* Message actions for file messages */}
          {!message.deleted && (
            <IconButton
              size="small"
              onClick={(e) => handleMenuOpen(e, message)}
              sx={{ position: 'absolute', top: 8, right: 8 }}
              className="message-actions"
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      )}
      
      {/* Voice messages */}
      {message.type === 'voice' && (
        <Box sx={{ 
          border: '1px solid rgba(0,0,0,0.1)', 
          borderRadius: 1, 
          p: 1.5, 
          bgcolor: isCurrentUser ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.95)',
          color: 'text.primary',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
          transition: 'transform 0.2s',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
          }
        }}>
          <Typography variant="subtitle2" sx={{ 
            fontWeight: 'bold', 
            mb: 0.5,
            display: 'block',
            color: 'text.primary'
          }}>
            {message.username}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
              <MicIcon />
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 0.5 }}>
                Voice Message
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {message.duration ? `${Math.round(message.duration)}s` : 'Unknown duration'}
              </Typography>
            </Box>
          </Box>
          
          <audio 
            controls 
            style={{ width: '100%', marginTop: '8px' }}
            src={message.voiceUrl}
            preload="metadata"
          />
          
          <MessageReactions
            messageId={message.id}
            reactions={message.reactions || {}}
            onAddReaction={handleAddReaction}
            currentUserId={user?.id || ''}
            isCurrentUserMessage={isCurrentUser}
          />
        </Box>
      )}
    </Box>
  );
};

return (
  <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
    {/* App Bar */}
    <AppBar position="static" elevation={0} sx={{ 
      background: 'linear-gradient(45deg, #6366f1 30%, #818cf8 90%)'
    }}>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          NexusChat
        </Typography>
        
        <Tooltip title="Toggle Dark Mode">
          <IconButton color="inherit" onClick={toggleDarkMode}>
            {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
        </Tooltip>
        
        <Tooltip title="Game Bot">
          <IconButton color="inherit" onClick={() => setShowGameBot(!showGameBot)}>
            <span style={{ fontSize: '20px' }}>🎮</span>
          </IconButton>
        </Tooltip>
        
        <Tooltip title="User List">
          <IconButton color="inherit" onClick={() => setShowUserList(!showUserList)}>
            <Badge badgeContent={users.length} color="secondary">
              <PeopleIcon />
            </Badge>
          </IconButton>
        </Tooltip>
        
        <Tooltip title="Lock App">
          <IconButton color="inherit" onClick={lockApp}>
            <LockIcon />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="Profile">
          <IconButton 
            color="inherit" 
            onClick={() => setShowProfileModal(true)}
            sx={{ ml: 1 }}
          >
            <Avatar 
              src={user?.profilePic || undefined} 
              sx={{ 
                width: 32, 
                height: 32,
                bgcolor: user?.profilePic ? 'transparent' : '#fff',
                color: user?.profilePic ? undefined : 'primary.main'
              }}
            >
              {user?.username?.charAt(0).toUpperCase()}
            </Avatar>
          </IconButton>
        </Tooltip>
        
        <Tooltip title="Logout">
          <IconButton color="inherit" onClick={logout} sx={{ ml: 1 }}>
            <LogoutIcon />
          </IconButton>
        </Tooltip>
      </Toolbar>
    </AppBar>
    
    {/* Main content */}
    <Grid container sx={{ flexGrow: 1, overflow: 'hidden' }}>
      {/* Chat area */}
      <Grid item xs={showUserList ? 9 : 12} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {selectedUser ? (
          <DirectMessage 
            socket={socketRef.current} 
            recipient={selectedUser} 
            onBack={() => setSelectedUser(null)} 
          />
        ) : showGameBot ? (
          <GameBot socket={socketRef.current} userRole={currentUser?.role || 'user'} />
        ) : (
          <>
            {/* Messages */}
            <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              ) : messages.length === 0 ? (
                <Box sx={{ textAlign: 'center', p: 4 }}>
                  <Typography variant="h6" color="text.secondary">
                    No messages yet
                  </Typography>
                  <Typography color="text.secondary">
                    Be the first to send a message!
                  </Typography>
                </Box>
              ) : (
                messages.map((message) => renderMessage(message))
              )}
              <div ref={messagesEndRef} />
            </Box>
            
            {/* Typing indicators */}
            {users.filter(u => u.isTyping && u.id !== socketRef.current?.id).map(user => (
              <Box 
                key={`typing-${user.id}`} 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  p: 1, 
                  ml: 1,
                  mt: 1
                }}
              >
                <Avatar 
                  src={user.profilePic} 
                  sx={{ width: 24, height: 24, mr: 1 }}
                >
                  {user.username[0]?.toUpperCase()}
                </Avatar>
                <Typography variant="caption" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                  {user.username} is typing...
                </Typography>
              </Box>
            ))}
            
            {/* Message input area for group chat */}
            <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
              {/* Reply indicator */}
              {replyingTo && (
                <Paper 
                  elevation={0} 
                  sx={{ 
                    p: 1, 
                    mb: 1, 
                    display: 'flex', 
                    alignItems: 'center',
                    bgcolor: 'background.default',
                    borderLeft: 2,
                    borderColor: 'primary.main'
                  }}
                >
                  <Typography variant="body2" sx={{ flexGrow: 1 }}>
                    <strong>Reply to {replyingTo.username}:</strong> {replyingTo.text?.substring(0, 50)}{replyingTo.text && replyingTo.text.length > 50 ? '...' : ''}
                  </Typography>
                  <IconButton size="small" onClick={() => setReplyingTo(null)}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Paper>
              )}
              
              {/* Edit indicator */}
              {editingMessage && (
                <Paper 
                  elevation={0} 
                  sx={{ 
                    p: 1, 
                    mb: 1, 
                    display: 'flex', 
                    alignItems: 'center',
                    bgcolor: 'background.default',
                    borderLeft: 2,
                    borderColor: 'warning.main'
                  }}
                >
                  <Typography variant="body2" sx={{ flexGrow: 1 }}>
                    <strong>Editing message:</strong> {editingMessage.text?.substring(0, 50)}{editingMessage.text && editingMessage.text.length > 50 ? '...' : ''}
                  </Typography>
                  <IconButton size="small" onClick={() => {
                    setEditingMessage(null);
                    setMessageText('');
                  }}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Paper>
              )}
              
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <IconButton onClick={() => fileInputRef.current?.click()}>
                  <AttachFileIcon />
                </IconButton>
                <input 
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                />
                
                <IconButton onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
                  <EmojiEmotionsIcon />
                </IconButton>
                
                <TextField
                  fullWidth
                  placeholder="Type a message..."
                  variant="outlined"
                  value={messageText}
                  onChange={handleMessageChange}
                  onKeyPress={handleKeyPress}
                  inputRef={inputRef}
                  sx={{ mx: 1 }}
                  multiline
                  maxRows={4}
                />
                
                {recording ? (
                  <IconButton color="error" onClick={stopRecording}>
                    <StopIcon />
                    {recordingTime > 0 && (
                      <Typography variant="caption" sx={{ ml: 0.5 }}>
                        {recordingTime.toFixed(1)}s
                      </Typography>
                    )}
                  </IconButton>
                ) : (
                  <IconButton onClick={startRecording}>
                    <MicIcon />
                  </IconButton>
                )}
                
                <IconButton 
                  color="primary" 
                  onClick={handleSendMessage}
                  disabled={(!messageText.trim() && !editingMessage) || loading}
                >
                  <SendIcon />
                </IconButton>
              </Box>
              
              {/* Emoji picker */}
              {showEmojiPicker && (
                <Box sx={{ mt: 1, position: 'relative' }}>
                  <Paper elevation={3} sx={{ position: 'absolute', bottom: '0', right: '0', zIndex: 1000 }}>
                    <Picker onEmojiClick={handleEmojiSelect} />
                  </Paper>
                </Box>
              )}
              
              {/* File upload progress */}
              {fileUploadProgress !== null && (
                <Box sx={{ width: '100%', mt: 1 }}>
                  <LinearProgress variant="determinate" value={fileUploadProgress} />
                </Box>
              )}
            </Box>
          </>
        )}
      </Grid>
      
      {/* User list sidebar */}
      {showUserList && (
        <Grid item xs={3} sx={{ height: '100%', borderLeft: 1, borderColor: 'divider', overflow: 'auto' }}>
          <List>
            <ListItem>
              <Typography variant="h6">Users ({users.length})</Typography>
            </ListItem>
            <Divider />
            
            {users.map((chatUser) => (
              <ListItemButton 
                key={chatUser.id}
                onClick={() => setSelectedUser(chatUser)}
                sx={{ 
                  borderLeft: 4, 
                  borderColor: chatUser.status === 'online' ? 'success.main' : 'transparent',
                  opacity: chatUser.status === 'online' ? 1 : 0.6
                }}
              >
                <ListItemAvatar>
                  <Badge
                    overlap="circular"
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    variant="dot"
                    color={chatUser.status === 'online' ? 'success' : chatUser.status === 'away' ? 'warning' : 'error'}
                  >
                    <Badge
                      overlap="circular"
                      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                      badgeContent={chatUser.unreadCount || 0}
                      color="error"
                      invisible={!chatUser.unreadCount}
                    >
                      <Avatar src={chatUser.profilePic}>
                        {chatUser.username[0]?.toUpperCase()}
                      </Avatar>
                    </Badge>
                  </Badge>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {chatUser.username}
                      {chatUser.badge && (
                        <Typography variant="caption" sx={{ ml: 1 }}>
                          {chatUser.badge}
                        </Typography>
                      )}
                    </Box>
                  }
                  secondary={
                    <>
                      {chatUser.isTyping && <Typography variant="caption">typing...</Typography>}
                      {chatUser.isRecording && <Typography variant="caption">recording...</Typography>}
                      {!chatUser.isTyping && !chatUser.isRecording && (
                        <Typography variant="caption">
                          {chatUser.status === 'online' ? 'Online' :
                           chatUser.status === 'away' ? 'Away' : `Last seen ${chatUser.lastSeen || 'recently'}`}
                        </Typography>
                      )}
                    </>
                  }
                />
              </ListItemButton>
            ))}
          </List>
        </Grid>
      )}
    </Grid>
      
      {/* Message action menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => selectedMessage && handleReplyMessage(selectedMessage)}>
          <ListItemAvatar>
            <ReplyIcon fontSize="small" />
          </ListItemAvatar>
          <ListItemText primary="Reply" />
        </MenuItem>
        
        {selectedMessage && selectedMessage.type === 'text' && canModifyMessage(selectedMessage) && (
          <MenuItem onClick={() => selectedMessage && handleEditMessage(selectedMessage)}>
            <ListItemAvatar>
              <EditIcon fontSize="small" />
            </ListItemAvatar>
            <ListItemText primary="Edit" />
          </MenuItem>
        )}
        
        {selectedMessage && canModifyMessage(selectedMessage) && (
          <MenuItem onClick={() => selectedMessage && handleDeleteMessage(selectedMessage.id)}>
            <ListItemAvatar>
              <DeleteIcon fontSize="small" />
            </ListItemAvatar>
            <ListItemText primary="Delete" />
          </MenuItem>
        )}
      </Menu>
      
      {/* Profile modal */}
      {showProfileModal && (
        <Dialog 
          open={true} 
          onClose={() => setShowProfileModal(false)}
        >
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
              <Avatar
                src={profilePicture || user?.profilePic || undefined}
                sx={{ width: 80, height: 80, mb: 1 }}
              >
                {(profilePicture ? newUsername : user?.username)?.[0]?.toUpperCase()}
              </Avatar>
              
              <Button
                variant="outlined"
                startIcon={<PhotoCameraIcon />}
                component="label"
                size="small"
              >
                Change Photo
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleProfilePictureUpload}
                />
              </Button>
            </Box>
            
            <TextField
              autoFocus
              margin="dense"
              label="Username"
              fullWidth
              variant="outlined"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowProfileModal(false)} disabled={profileUpdateLoading}>Cancel</Button>
            <Button 
              onClick={handleProfileUpdate} 
              color="primary"
              disabled={profileUpdateLoading || !newUsername.trim()}
              startIcon={profileUpdateLoading ? <CircularProgress size={20} /> : undefined}
            >
              {profileUpdateLoading ? 'Saving...' : 'Save'}
            </Button>
          </DialogActions>
        </Dialog>
      )}
      
      {/* File Preview Modal */}
      {previewFile && (
        <Dialog 
          open={true} 
          onClose={() => setPreviewFile(null)}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {previewFile.name}
            <IconButton onClick={() => setPreviewFile(null)}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ textAlign: 'center', p: 0 }}>
            {previewFile.type === 'image' ? (
              <img 
                src={previewFile.url} 
                alt={previewFile.name}
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '80vh',
                  objectFit: 'contain'
                }} 
              />
            ) : previewFile.type === 'video' ? (
              <video 
                controls
                src={previewFile.url}
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '80vh'
                }}
              >
                Your browser does not support the video tag.
              </video>
            ) : null}
          </DialogContent>
          <DialogActions>
            <Button 
              startIcon={<GetAppIcon />}
              href={previewFile.url}
              component="a"
              target="_blank"
              rel="noopener noreferrer"
              download={previewFile.name}
            >
              Download
            </Button>
            <Button onClick={() => setPreviewFile(null)}>Close</Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};

export default Chat;
