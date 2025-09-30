import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

// Define user type
export interface User {
  id: string;
  username: string;
  profilePic?: string;
  passkey?: string;
  role?: string;
  badge?: string;
  systemInfo: {
    os: string;
    hostname: string;
    platform: string;
    cpuCores: number;
    totalMemory: string;
    ipAddress: string;
  };
}

// Define context type
interface AuthContextType {
  user: User | null;
  isLocked: boolean;
  recentUsers: User[];
  error: string | null;
  loading: boolean;
  socketConnected: boolean;
  darkMode: boolean;
  currentDM: string | null;
  login: (username: string, passkey: string) => Promise<void>;
  signup: (username: string, passkey: string) => Promise<void>;
  logout: () => void;
  lockApp: () => void;
  unlockApp: (passkey: string) => boolean;
  quickLogin: (userId: string) => Promise<boolean>;
  updateProfile: (updates: Partial<User>) => void;
  setIsLocked: (locked: boolean) => void;
  toggleDarkMode: () => void;
  setCurrentDM: (userId: string | null) => void;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // State
  const [user, setUser] = useState<User | null>(null);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [socketConnected, setSocketConnected] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [currentDM, setCurrentDM] = useState<string | null>(null);
  
  // Socket reference
  const socketRef = useRef<Socket | null>(null);
  
  // Load saved state from localStorage
  useEffect(() => {
    // Load user
    const savedUser = localStorage.getItem('nexusChat_user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        setIsLocked(!!parsedUser.passkey); // Lock if user has a passkey
      } catch (e) {
        console.error('Error parsing saved user:', e);
      }
    }
    
    // Load recent users
    const savedRecentUsers = localStorage.getItem('nexusChat_recentUsers');
    if (savedRecentUsers) {
      try {
        setRecentUsers(JSON.parse(savedRecentUsers));
      } catch (e) {
        console.error('Error parsing saved recent users:', e);
      }
    }
    
    // Load dark mode setting
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode) {
      try {
        setDarkMode(JSON.parse(savedDarkMode));
      } catch (e) {
        console.error('Error parsing dark mode setting:', e);
      }
    }
  }, []);
  
  // Initialize socket connection
  useEffect(() => {
    // Determine backend URL
    const defaultPort = 3001;
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    const hostname = window.location.hostname;
    const fallbackUrl = `${protocol}//${hostname}:${defaultPort}`;
    const socketUrl = (process.env.REACT_APP_SOCKET_URL || fallbackUrl).replace(/\/$/, '');
    
    console.log('Initializing socket connection to:', socketUrl);
    
    // Create socket connection
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      upgrade: true,
      path: '/socket.io',
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000
    });
    
    socketRef.current = newSocket;
    
    // Store socket in window for global access
    (window as any).socket = newSocket;
    
    // Set up event listeners
    newSocket.on('connect', () => {
      console.log('Connected to server:', newSocket.id);
      setSocketConnected(true);
    });
    
    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setSocketConnected(false);
    });
    
    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setSocketConnected(false);
    });
    
    // Clean up on unmount
    return () => {
      console.log('Cleaning up socket connection');
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, []);
  
  // Get system info for user registration
  const getSystemInfo = () => {
    // Get OS and platform
    const userAgent = navigator.userAgent;
    let os = 'Unknown';
    let platform = navigator.platform || 'Unknown';
    
    if (userAgent.indexOf('Win') !== -1) os = 'Windows';
    else if (userAgent.indexOf('Mac') !== -1) os = 'MacOS';
    else if (userAgent.indexOf('Linux') !== -1) os = 'Linux';
    else if (userAgent.indexOf('Android') !== -1) os = 'Android';
    else if (userAgent.indexOf('iOS') !== -1) os = 'iOS';
    
    // Get hostname (this is not reliable in browsers)
    const hostname = window.location.hostname || 'Unknown';
    
    // Get CPU cores
    const cpuCores = navigator.hardwareConcurrency || 1;
    
    // Get memory (not accurate in browsers)
    const totalMemory = (navigator as any).deviceMemory 
      ? `${(navigator as any).deviceMemory} GB` 
      : 'Unknown';
    
    // Get IP address (this will be done on the server side)
    const ipAddress = 'Local Network';
    
    return {
      os,
      hostname,
      platform,
      cpuCores,
      totalMemory,
      ipAddress,
      userAgent
    };
  };
  
  // Login function
  const login = async (username: string, passkey: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Get socket reference
      const socket = socketRef.current;
      
      // If socket is not initialized or not connected, initialize it
      if (!socket || !socket.connected) {
        console.log('Socket not connected, waiting for connection...');
        
        // Wait for socket connection with timeout
        await new Promise<void>((resolve, reject) => {
          // Set a maximum wait time of 5 seconds
          const timeoutId = setTimeout(() => {
            reject(new Error('Socket connection timeout. Please refresh the page and try again.'));
          }, 5000);
          
          // Check connection status periodically
          const checkConnection = () => {
            if (socketRef.current && socketRef.current.connected) {
              console.log('Socket connection established:', socketRef.current.id);
              clearTimeout(timeoutId);
              resolve();
            } else {
              console.log('Socket not connected yet, retrying...');
              setTimeout(checkConnection, 500);
            }
          };
          
          checkConnection();
        });
      }
      
      console.log('Socket ready for login, socket ID:', socketRef.current?.id);
      
      // Make sure we have a valid socket reference
      if (!socketRef.current || !socketRef.current.connected) {
        throw new Error('Socket connection lost. Please refresh and try again.');
      }
      
      // Create a promise to handle the login response
      const loginPromise = new Promise<void>((resolve, reject) => {
        // Set up event listeners for login response
        socketRef.current!.once('loginSuccess', (userData: User) => {
          console.log('Login successful:', userData);
          
          // Add passkey to user data for reconnection purposes
          const userWithPasskey = {
            ...userData,
            passkey: passkey // Store the passkey for reconnection
          };
          
          // Update state with the user data from server
          setUser(userWithPasskey);
          setIsLocked(false);
          setLoading(false);
          
          // Add to recent users
          updateRecentUsers(userWithPasskey);
          
          // Save to local storage
          localStorage.setItem('nexusChat_user', JSON.stringify(userWithPasskey));
          
          resolve();
        });
        
        socketRef.current!.once('loginFailed', (data: { error: string }) => {
          console.error('Login failed:', data.error);
          setLoading(false);
          setError(data.error);
          reject(new Error(data.error));
        });
        
        // Send login request to server
        console.log('Sending login request for user:', username);
        socketRef.current!.emit('login', { username, passkey });
        
        // Set timeout in case server doesn't respond
        setTimeout(() => {
          socketRef.current?.off('loginSuccess');
          socketRef.current?.off('loginFailed');
          setLoading(false);
          setError('Login request timed out');
          reject(new Error('Login request timed out'));
        }, 5000);
      });
      
      return loginPromise;
    } catch (error: any) {
      console.error('Login error:', error);
      setLoading(false);
      setError(error.message || 'Login failed');
      throw error; // Pass through the actual error
    }
  };
  
  // Signup function
  const signup = async (username: string, passkey: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Get system info
      const systemInfo = getSystemInfo();
      
      // Get socket reference
      const socket = socketRef.current;
      
      // If socket is not initialized or not connected, initialize it
      if (!socket || !socket.connected) {
        console.log('Socket not connected, waiting for connection...');
        
        // Wait for socket connection with timeout
        await new Promise<void>((resolve, reject) => {
          // Set a maximum wait time of 5 seconds
          const timeoutId = setTimeout(() => {
            reject(new Error('Socket connection timeout. Please refresh the page and try again.'));
          }, 5000);
          
          // Check connection status periodically
          const checkConnection = () => {
            if (socketRef.current && socketRef.current.connected) {
              console.log('Socket connection established:', socketRef.current.id);
              clearTimeout(timeoutId);
              resolve();
            } else {
              console.log('Socket not connected yet, retrying...');
              setTimeout(checkConnection, 500);
            }
          };
          
          checkConnection();
        });
      }
      
      console.log('Socket ready for signup, socket ID:', socketRef.current?.id);
      
      // Make sure we have a valid socket reference
      if (!socketRef.current || !socketRef.current.connected) {
        throw new Error('Socket connection lost. Please refresh and try again.');
      }
      
      // Create a promise to handle the signup response
      const signupPromise = new Promise<void>((resolve, reject) => {
        // Set up event listeners for signup response
        socketRef.current!.once('signupSuccess', (userData: { username: string, id: string }) => {
          console.log('Signup success:', userData);
          setLoading(false);
          resolve();
        });
        
        socketRef.current!.once('signupFailed', (data: { error: string }) => {
          console.log('Signup failed:', data.error);
          setLoading(false);
          setError(data.error);
          reject(new Error(data.error));
        });
        
        // Send signup request to server
        console.log('Sending signup request for user:', username);
        socketRef.current!.emit('signup', { 
          username, 
          passkey,
          systemInfo
        });
        
        // Set timeout in case server doesn't respond
        setTimeout(() => {
          socketRef.current?.off('signupSuccess');
          socketRef.current?.off('signupFailed');
          setLoading(false);
          setError('Signup request timed out');
          reject(new Error('Signup request timed out'));
        }, 5000);
      });
      
      return signupPromise;
    } catch (error: any) {
      console.error('Signup error:', error);
      setLoading(false);
      setError(error.message || 'Signup failed');
      throw error; // Pass through the actual error
    }
  };
  
  // Update recent users
  const updateRecentUsers = (currentUser: User) => {
    // Check if user already exists in recent users
    const existingIndex = recentUsers.findIndex(u => u.username === currentUser.username);
    let updatedRecentUsers: User[];
    
    if (existingIndex >= 0) {
      // Update existing user
      updatedRecentUsers = [...recentUsers];
      updatedRecentUsers[existingIndex] = currentUser;
    } else {
      // Add new user, limit to 5 recent users
      updatedRecentUsers = [currentUser, ...recentUsers].slice(0, 5);
    }
    
    setRecentUsers(updatedRecentUsers);
    localStorage.setItem('nexusChat_recentUsers', JSON.stringify(updatedRecentUsers));
  };
  
  // Quick login with existing user
  const quickLogin = async (userId: string): Promise<boolean> => {
    const foundUser = recentUsers.find(u => u.id === userId);
    if (foundUser) {
      try {
        console.log('Quick login attempt for user:', foundUser.username);
        
        // Wait for socket connection if not already connected
        if (!socketConnected) {
          console.log('Waiting for socket connection before quick login...');
          await new Promise<void>((resolve) => {
            const checkConnection = () => {
              const socket = socketRef.current;
              if (socket && socket.connected) {
                console.log('Socket connection established for quick login');
                resolve();
              } else {
                console.log('Socket not connected yet for quick login, retrying...');
                setTimeout(checkConnection, 500);
              }
            };
            checkConnection();
          });
        }
        
        // Check if we have a socket connection
        const socket = socketRef.current;
        if (!socket || !socket.connected) {
          throw new Error('No connection to server');
        }
        
        // Use the standard login function with the user's stored credentials
        if (foundUser.passkey) {
          await login(foundUser.username, foundUser.passkey);
          return true;
        } else {
          // If no passkey, just update local state
          setUser(foundUser);
          setIsLocked(foundUser.passkey ? true : false);
          localStorage.setItem('nexusChat_user', JSON.stringify(foundUser));
          
          console.log('Quick login successful');
          return true;
        }
      } catch (error: any) {
        console.error('Quick login error:', error);
        
        // Don't show error message for quick login failures
        // Just keep the user logged in locally
        setUser(foundUser);
        setIsLocked(foundUser.passkey ? true : false);
        localStorage.setItem('nexusChat_user', JSON.stringify(foundUser));
        return true;
      }
    }
    return false;
  };
  
  // Update profile
  const updateProfile = (updates: Partial<User>) => {
    if (!user) return;
    
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    localStorage.setItem('nexusChat_user', JSON.stringify(updatedUser));
    
    // Also update in recent users
    updateRecentUsers(updatedUser);
  };
  
  // Lock app
  const lockApp = () => {
    if (user?.passkey) {
      setIsLocked(true);
    }
  };
  
  // Unlock app
  const unlockApp = (passkey: string): boolean => {
    if (user?.passkey === passkey) {
      setIsLocked(false);
      return true;
    }
    return false;
  };
  
  // Logout
  const logout = () => {
    // Don't remove from localStorage, just set user to null in state
    // This allows for quick login later
    setUser(null);
    setIsLocked(false);
  };
  
  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(prev => {
      const newMode = !prev;
      localStorage.setItem('darkMode', JSON.stringify(newMode));
      return newMode;
    });
  };
  
  return (
    <AuthContext.Provider value={{ 
      user, 
      isLocked,
      recentUsers,
      error,
      loading,
      socketConnected,
      darkMode,
      currentDM,
      login, 
      signup,
      logout,
      lockApp,
      unlockApp,
      updateProfile,
      quickLogin,
      setIsLocked,
      toggleDarkMode,
      setCurrentDM
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
