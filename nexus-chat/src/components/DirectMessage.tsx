import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import { Message, ChatUser } from '../types';
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Avatar,
  Paper,
  CircularProgress,
  Divider,
  Badge
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import GetAppIcon from '@mui/icons-material/GetApp';
import Picker from 'emoji-picker-react';
import { useAuth } from '../context/AuthContext';

interface DirectMessageProps {
  socket: Socket | null;
  recipient: ChatUser;
  onBack: () => void;
}

const DirectMessage: React.FC<DirectMessageProps> = ({ socket, recipient, onBack }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // State variables
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [recording, setRecording] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [recordingInterval, setRecordingInterval] = useState<NodeJS.Timeout | null>(null);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Load direct message history
  useEffect(() => {
    if (!socket || !recipient) return;
    
    // Request direct message history
    socket.emit('getDirectMessages', { otherUserId: recipient.id });
    
    // Listen for direct message history
    const handleDirectMessageHistory = (data: { userId: string, messages: Message[] }) => {
      if (data.userId === recipient.id) {
        setMessages(data.messages);
        setLoading(false);
      }
    };
    
    // Listen for new direct messages
    const handleDirectMessage = (message: Message) => {
      // Only add messages from/to this recipient
      if (message.userId === recipient.id || message.recipientId === recipient.id) {
        setMessages(prev => [...prev, message]);
      }
    };
    
    // Set up listeners
    socket.on('directMessageHistory', handleDirectMessageHistory);
    socket.on('directMessage', handleDirectMessage);
    
    // Clean up listeners
    return () => {
      socket.off('directMessageHistory', handleDirectMessageHistory);
      socket.off('directMessage', handleDirectMessage);
    };
  }, [socket, recipient]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle message change
  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMessageText(value);
    
    // Send typing indicator
    if (socket) {
      if (value) {
        socket.emit('typing', { recipientId: recipient.id });
      } else {
        socket.emit('stopTyping', { recipientId: recipient.id });
      }
      
      // Clear existing timeout
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
      
      // Set new timeout
      const timeout = setTimeout(() => {
        if (socket) {
          socket.emit('stopTyping', { recipientId: recipient.id });
        }
      }, 2000);
      
      setTypingTimeout(timeout);
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
    if (!messageText.trim() || !socket) return;
    
    // Create new message
    const newMessage: Partial<Message> = {
      id: uuidv4(),
      text: messageText,
      type: 'text' as const,
      userId: socket.id || user?.id || '',
      username: user?.username || 'Anonymous',
      recipientId: recipient.id,
      recipientUsername: recipient.username,
      timestamp: new Date().toISOString(),
      readBy: [],
      edited: false,
      deleted: false
    };
    
    // Send message
    socket.emit('message', newMessage);
    
    // Reset state
    setMessageText('');
    
    // Stop typing indicator
    socket.emit('stopTyping', { recipientId: recipient.id });
  };

  // Handle emoji selection
  const handleEmojiClick = (emojiData: any) => {
    setMessageText(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  // Handle file upload click
  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !socket) return;
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', user?.id || '');
    formData.append('username', user?.username || 'Anonymous');
    formData.append('recipientId', recipient.id);
    
    // Upload file
    const hostname = window.location.hostname;
    const xhr = new XMLHttpRequest();
    
    xhr.open('POST', `http://${hostname}:5000/upload`, true);
    
    xhr.onload = () => {
      if (xhr.status === 200) {
        try {
          const data = JSON.parse(xhr.responseText);
          
          // Send file message
          const fileMessage: Partial<Message> = {
            id: uuidv4(),
            text: `Shared a file: ${data.fileName}`,
            type: 'file' as const,
            userId: socket.id || user?.id || '',
            username: user?.username || 'Anonymous',
            recipientId: recipient.id,
            recipientUsername: recipient.username,
            fileUrl: data.fileUrl,
            fileName: data.fileName,
            fileSize: data.fileSize,
            timestamp: new Date().toISOString(),
            readBy: [],
            edited: false,
            deleted: false
          };
          
          socket.emit('message', fileMessage);
        } catch (error) {
          console.error('Error parsing upload response:', error);
        }
      }
    };
    
    xhr.send(formData);
    
    // Reset file input
    e.target.value = '';
  };
  
  // Handle start recording
  const handleStartRecording = async () => {
    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create media recorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      // Clear previous audio chunks
      audioChunksRef.current = [];
      
      // Handle data available event
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      // Handle recording stop
      mediaRecorder.onstop = () => {
        // Create audio blob
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Upload audio
        const formData = new FormData();
        formData.append('file', audioBlob, 'voice-message.webm');
        formData.append('userId', user?.id || '');
        formData.append('username', user?.username || 'Anonymous');
        formData.append('recipientId', recipient.id);
        
        // Upload file
        const hostname = window.location.hostname;
        const xhr = new XMLHttpRequest();
        
        xhr.open('POST', `http://${hostname}:5000/upload`, true);
        
        xhr.onload = () => {
          if (xhr.status === 200) {
            try {
              const data = JSON.parse(xhr.responseText);
              
              // Send audio message
              const audioMessage: Partial<Message> = {
                id: uuidv4(),
                text: 'Voice message',
                type: 'voice' as const,
                userId: socket?.id || user?.id || '',
                username: user?.username || 'Anonymous',
                recipientId: recipient.id,
                recipientUsername: recipient.username,
                fileUrl: data.fileUrl,
                fileName: data.fileName,
                fileSize: data.fileSize,
                timestamp: new Date().toISOString(),
                readBy: [],
                edited: false,
                deleted: false
              };
              
              socket?.emit('message', audioMessage);
            } catch (error) {
              console.error('Error parsing upload response:', error);
            }
          }
        };
        
        xhr.send(formData);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };
      
      // Start recording
      mediaRecorder.start();
      setRecording(true);
      
      // Notify server about recording
      socket?.emit('recording', { recipientId: recipient.id });
      
      // Start recording timer
      const interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      setRecordingInterval(interval);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };
  
  // Handle stop recording
  const handleStopRecording = () => {
    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    // Clear recording timer
    if (recordingInterval) {
      clearInterval(recordingInterval);
    }
    
    // Reset recording state
    setRecording(false);
    setRecordingTime(0);
    
    // Notify server about stopped recording
    socket?.emit('stoppedRecording', { recipientId: recipient.id });
  };

  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider'
        }}
      >
        <IconButton onClick={onBack} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        
        <Avatar 
          src={recipient.profilePic || undefined} 
          sx={{ mr: 2, bgcolor: recipient.profilePic ? 'transparent' : 'primary.main' }}
        >
          {recipient.username.charAt(0).toUpperCase()}
        </Avatar>
        
        <Box>
          <Typography variant="subtitle1" fontWeight="bold">
            {recipient.username}
            {recipient.badge && (
              <Typography component="span" sx={{ ml: 1, fontSize: '0.8rem' }}>
                {recipient.badge}
              </Typography>
            )}
          </Typography>
          
          <Typography variant="body2" color="text.secondary">
            {isTyping ? 'typing...' : recipient.status === 'online' ? 'online' : 'offline'}
          </Typography>
        </Box>
      </Box>
      
      {/* Messages */}
      <Box
        sx={{
          flexGrow: 1,
          p: 2,
          overflowY: 'auto',
          bgcolor: theme => theme.palette.mode === 'dark' ? '#1a1a1a' : '#f5f5f5'
        }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : messages.length === 0 ? (
          <Box sx={{ textAlign: 'center', p: 4 }}>
            <Typography color="text.secondary">
              No messages yet. Start the conversation!
            </Typography>
          </Box>
        ) : (
          messages.map((message) => {
            const isOwnMessage = message.userId === socket?.id || message.userId === user?.id;
            
            return (
              <Box
                key={message.id}
                sx={{
                  display: 'flex',
                  justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
                  mb: 2,
                  width: '100%' // Ensure full width container
                }}
              >
                {!isOwnMessage && (
                  <Avatar
                    src={recipient.profilePic || undefined}
                    sx={{ 
                      mr: 1, 
                      alignSelf: 'flex-end',
                      width: 32, 
                      height: 32,
                      bgcolor: recipient.profilePic ? 'transparent' : 'primary.main'
                    }}
                  >
                    {recipient.username.charAt(0).toUpperCase()}
                  </Avatar>
                )}
                
                <Box
                  sx={{
                    maxWidth: '70%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isOwnMessage ? 'flex-end' : 'flex-start',
                    width: isOwnMessage ? 'auto' : 'auto' // Ensure proper width
                  }}
                >
                  <Paper
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: isOwnMessage ? 'primary.main' : 'background.paper',
                      color: isOwnMessage ? 'primary.contrastText' : 'text.primary'
                    }}
                  >
                    {message.type === 'text' ? (
                      <Typography variant="body1">{message.text}</Typography>
                    ) : message.type === 'file' ? (
                      <Box>
                        <Typography variant="body1">Shared a file:</Typography>
                        <Button
                          component="a" 
                          href={message.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="outlined"
                          size="small"
                          sx={{ 
                            mt: 1, 
                            color: isOwnMessage ? 'primary.contrastText' : 'primary.main',
                            borderColor: isOwnMessage ? 'primary.contrastText' : 'primary.main'
                          }}
                        >
                          {message.fileName}
                        </Button>
                      </Box>
                    ) : message.type === 'voice' ? (
                      <Box>
                        <audio controls src={message.fileUrl} style={{ maxWidth: '100%' }} />
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                          <Typography variant="caption" sx={{ mr: 1 }}>
                            Voice message
                          </Typography>
                          <IconButton 
                            size="small" 
                            component="a"
                            href={message.fileUrl}
                            download
                            sx={{ 
                              color: isOwnMessage ? 'primary.contrastText' : 'primary.main',
                              p: 0.5
                            }}
                          >
                            <GetAppIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                    ) : null}
                  </Paper>
                  
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                    {formatTime(message.timestamp)}
                    {message.edited && ' (edited)'}
                  </Typography>
                </Box>
              </Box>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </Box>
      
      {/* Message Input */}
      <Box
        sx={{
          p: 2,
          bgcolor: 'background.paper',
          borderTop: 1,
          borderColor: 'divider'
        }}
      >
        {showEmojiPicker && (
          <Box sx={{ position: 'absolute', bottom: '80px', right: '20px', zIndex: 1000 }}>
            <Picker onEmojiClick={handleEmojiClick} />
          </Box>
        )}
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton onClick={handleFileClick}>
            <AttachFileIcon />
          </IconButton>
          
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
          
          {recording ? (
            <Box sx={{ display: 'flex', alignItems: 'center', mx: 1 }}>
              <Typography variant="body2" color="error" sx={{ mr: 1 }}>
                {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
              </Typography>
              <IconButton color="error" onClick={handleStopRecording}>
                <StopIcon />
              </IconButton>
            </Box>
          ) : (
            <>
              <TextField
                fullWidth
                placeholder="Type a message..."
                variant="outlined"
                value={messageText}
                onChange={handleMessageChange}
                onKeyPress={handleKeyPress}
                sx={{ mx: 1 }}
                InputProps={{
                  sx: { borderRadius: 4 }
                }}
              />
              
              <IconButton onClick={handleStartRecording}>
                <MicIcon />
              </IconButton>
            </>
          )}
          
          <IconButton onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
            <EmojiEmotionsIcon />
          </IconButton>
          
          <IconButton 
            color="primary" 
            onClick={handleSendMessage}
            disabled={!messageText.trim()}
          >
            <SendIcon />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
};

export default DirectMessage;
