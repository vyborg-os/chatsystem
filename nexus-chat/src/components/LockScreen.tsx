import React, { useState } from 'react';
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
  IconButton
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useAuth } from '../context/AuthContext';

const LockScreen: React.FC = () => {
  const [passkey, setPasskey] = useState('');
  const [showPasskey, setShowPasskey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user, unlockApp, logout } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passkey.length !== 4) {
      setError('Passkey must be 4 digits');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const success = unlockApp(passkey);
      if (!success) {
        setError('Incorrect passkey');
      }
    } catch (err) {
      setError('Failed to unlock. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
      setPasskey('');
    }
  };

  const toggleShowPasskey = () => {
    setShowPasskey(!showPasskey);
  };

  return (
    <Container component="main" maxWidth="xs">
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
            <LockIcon fontSize="large" />
          </Avatar>
          
          <Typography component="h1" variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
            App Locked
          </Typography>
          
          <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 3 }}>
            Enter your passkey to continue
          </Typography>
          
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="passkey"
              label="4-Digit Passkey"
              name="passkey"
              type={showPasskey ? 'text' : 'password'}
              autoFocus
              value={passkey}
              onChange={(e) => {
                // Only allow 4 digits
                const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
                setPasskey(value);
              }}
              error={!!error}
              helperText={error}
              sx={{ mb: 3 }}
              InputProps={{
                sx: { borderRadius: 1.5, letterSpacing: '0.5em', fontSize: '1.2em' },
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
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Unlock'}
            </Button>
            
            <Button
              fullWidth
              variant="text"
              onClick={logout}
              sx={{ mt: 2 }}
            >
              Sign Out
            </Button>
            
            <Typography 
              variant="body2" 
              color="text.secondary" 
              align="center" 
              sx={{ mt: 3 }}
            >
              {user?.username}
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default LockScreen;
