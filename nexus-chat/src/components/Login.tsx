import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { 
  Box, 
  Container, 
  Typography, 
  TextField, 
  Button, 
  Paper, 
  Avatar,
  CircularProgress,
  Grid,
  Chip,
  InputAdornment,
  IconButton,
  Divider,
  Alert
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import PersonIcon from '@mui/icons-material/Person';
import LockIcon from '@mui/icons-material/Lock';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useAuth } from '../context/AuthContext';
import { User } from '../context/AuthContext';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [passkey, setPasskey] = useState('');
  const [showPasskey, setShowPasskey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check if user is coming from signup
  useEffect(() => {
    // Check if user is coming from signup page with username
    const state = location.state as { justSignedUp?: boolean; username?: string } | undefined;
    if (state?.justSignedUp && state.username) {
      setUsername(state.username);
      setSuccess(true);
      // Focus on passkey field
      setTimeout(() => {
        const passkeyInput = document.getElementById('passkey');
        if (passkeyInput) {
          (passkeyInput as HTMLInputElement).focus();
        }
      }, 100);
    }
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      setError('Username is required');
      return;
    }
    
    if (!passkey || passkey.length !== 4) {
      setError('Valid 4-digit passkey is required');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      await login(username, passkey);
      
      // Listen for login failed event
      const handleLoginFailed = (data: { error: string }) => {
        setError(data.error);
        setLoading(false);
      };
      
      const socket = (window as any).socket;
      if (socket) {
        socket.once('loginFailed', handleLoginFailed);
        
        // Remove listener after 3 seconds if no response
        setTimeout(() => {
          socket.off('loginFailed', handleLoginFailed);
          navigate('/');
        }, 3000);
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to login. Please try again.');
      console.error(err);
      setLoading(false);
    }
  };
  
  // Quick login functionality removed
  
  const toggleShowPasskey = () => {
    setShowPasskey(!showPasskey);
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            borderRadius: 2,
            width: '100%',
            background: 'linear-gradient(145deg, #ffffff, #f0f0f0)',
            boxShadow: '0 8px 32px rgba(31, 38, 135, 0.1)',
          }}
        >
          <Avatar
            sx={{
              m: 1,
              bgcolor: 'primary.main',
              width: 56,
              height: 56,
            }}
          >
            <ChatIcon fontSize="large" />
          </Avatar>
          
          <Typography component="h1" variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
            NexusChat
          </Typography>
          
          <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 3 }}>
            Office Messaging System
          </Typography>
          
          {/* Success message when coming from signup */}
          {success && (
            <Alert severity="success" sx={{ width: '100%', mb: 2 }}>
              Account created successfully! Please login with your new credentials.
            </Alert>
          )}
          
          {/* Quick login functionality removed */}
          
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label="Username"
              name="username"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              error={!!error}
              helperText={error}
              sx={{ mb: 2 }}
              InputProps={{
                sx: { borderRadius: 1.5 },
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon color="primary" />
                  </InputAdornment>
                )
              }}
            />
            
            {/* Passkey field (required) */}
            <TextField
              fullWidth
              required
              id="passkey"
              label="4-Digit Passkey"
              name="passkey"
              type={showPasskey ? 'text' : 'password'}
              value={passkey}
              onChange={(e) => {
                // Only allow 4 digits
                const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
                setPasskey(value);
              }}
              sx={{ mb: 2 }}
              InputProps={{
                sx: { borderRadius: 1.5 },
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon color="primary" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle passkey visibility"
                      onClick={toggleShowPasskey}
                      edge="end"
                    >
                      {showPasskey ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading || passkey.length !== 4}
              sx={{
                py: 1.5,
                fontSize: '1rem',
                fontWeight: 500,
                borderRadius: 1.5,
                background: 'linear-gradient(45deg, #6366f1 30%, #818cf8 90%)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #4f46e5 30%, #6366f1 90%)',
                }
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Log In'}
            </Button>
            
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography variant="body2">
                Don't have an account?{' '}
                <Link to="/signup" style={{ textDecoration: 'none', color: '#6366f1' }}>
                  Sign Up
                </Link>
              </Typography>
            </Box>
            
            <Typography 
              variant="body2" 
              color="text.secondary" 
              align="center" 
              sx={{ mt: 3 }}
            >
              Created by Vyborg
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;
