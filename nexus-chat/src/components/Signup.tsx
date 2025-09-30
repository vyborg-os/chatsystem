import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Box, 
  Container, 
  Typography, 
  TextField, 
  Button, 
  Paper, 
  Avatar,
  CircularProgress,
  InputAdornment,
  IconButton,
  Alert
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PersonIcon from '@mui/icons-material/Person';
import LockIcon from '@mui/icons-material/Lock';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useAuth } from '../context/AuthContext';

const Signup: React.FC = () => {
  const [username, setUsername] = useState('');
  const [passkey, setPasskey] = useState('');
  const [confirmPasskey, setConfirmPasskey] = useState('');
  const [showPasskey, setShowPasskey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();
  
  // Clean up event listeners when component unmounts
  useEffect(() => {
    return () => {
      const socket = (window as any).socket;
      if (socket) {
        socket.off('signupSuccess');
        socket.off('signupFailed');
      }
    };
  }, []);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs
    if (!username.trim()) {
      setError('Username is required');
      return;
    }
    
    if (!passkey || passkey.length !== 4) {
      setError('Valid 4-digit passkey is required');
      return;
    }
    
    if (passkey !== confirmPasskey) {
      setError('Passkeys do not match');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Call signup function - this will handle the socket events internally
      await signup(username, passkey);
      
      // If we get here, signup was successful
      setSuccess(true);
      setLoading(false);
      
      // Navigate to login page after a short delay
      setTimeout(() => {
        navigate('/login', { state: { justSignedUp: true, username } });
      }, 1500);
      
    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err.message || 'Failed to sign up. Please try again.');
      setLoading(false);
    }
  };
  
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
              bgcolor: success ? 'success.main' : 'primary.main',
              width: 56,
              height: 56,
            }}
          >
            {success ? '✓' : <PersonAddIcon fontSize="large" />}
          </Avatar>
          
          <Typography component="h1" variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
            {success ? 'Success!' : 'Create Account'}
          </Typography>
          
          <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 3 }}>
            {success ? 'Redirecting to login...' : 'Sign up for NexusChat'}
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert severity="success" sx={{ width: '100%', mb: 2 }}>
              Account created successfully! Redirecting to login page...
            </Alert>
          )}
          
          {!success && (
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
              
              <TextField
                fullWidth
                required
                id="confirmPasskey"
                label="Confirm Passkey"
                name="confirmPasskey"
                type={showPasskey ? 'text' : 'password'}
                value={confirmPasskey}
                onChange={(e) => {
                  // Only allow 4 digits
                  const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
                  setConfirmPasskey(value);
                }}
                sx={{ mb: 3 }}
                InputProps={{
                  sx: { borderRadius: 1.5 },
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon color="primary" />
                    </InputAdornment>
                  )
                }}
              />
              
              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading || passkey.length !== 4 || confirmPasskey.length !== 4}
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
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign Up'}
              </Button>
              
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Typography variant="body2">
                  Already have an account?{' '}
                  <Link to="/login" style={{ textDecoration: 'none', color: '#6366f1' }}>
                    Log In
                  </Link>
                </Typography>
              </Box>
            </Box>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default Signup;
