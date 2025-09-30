import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  LinearProgress,
  IconButton,
  Tooltip,
  Alert
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  Leaderboard,
  Timer,
  EmojiEvents,
  GamepadOutlined
} from '@mui/icons-material';
import { Socket } from 'socket.io-client';

interface GameBotProps {
  socket: Socket | null;
  userRole: string;
}

interface GameStatus {
  active: boolean;
  gameId?: string;
  letters?: string;
  timeLeft?: number;
  participants?: Array<{
    userId: string;
    username: string;
    score: number;
    words: string[];
  }>;
  totalSubmissions?: number;
}

interface GameResults {
  gameId: string;
  letters: string;
  leaderboard: Array<{
    userId: string;
    username: string;
    score: number;
    words: string[];
  }>;
  totalWords: number;
  validWords: string[];
}

interface LeaderboardEntry {
  userId: string;
  username: string;
  score: number;
}

const GameBot: React.FC<GameBotProps> = ({ socket, userRole }) => {
  const [gameStatus, setGameStatus] = useState<GameStatus>({
    active: false,
    participants: []
  });
  const [gameResults, setGameResults] = useState<GameResults | null>(null);
  const [allTimeLeaderboard, setAllTimeLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [gameDuration, setGameDuration] = useState(120); // 2 minutes default
  const [gameMessage, setGameMessage] = useState('');
  const [error, setError] = useState('');
  const [wordInput, setWordInput] = useState('');
  const [lastSubmission, setLastSubmission] = useState<{
    success: boolean;
    word: string;
    points?: number;
    message: string;
  } | null>(null);

  const isSuperAdmin = userRole === 'superadmin';

  useEffect(() => {
    if (!socket) return;

    // Listen for game events
    socket.on('gameStarted', (data) => {
      console.log('Game started event received:', data);
      setGameStatus({
        active: true,
        gameId: data.gameId,
        letters: data.letters,
        timeLeft: data.duration,
        participants: [],
        totalSubmissions: 0
      });
      setGameMessage(data.message);
      setError('');
    });

    socket.on('gameEnded', (results: GameResults) => {
      setGameStatus({ 
        active: false,
        participants: []
      });
      setGameResults(results);
      setShowResults(true);
      setGameMessage('');
    });

    socket.on('gameStatus', (status: GameStatus) => {
      setGameStatus({
        ...status,
        participants: Array.isArray(status.participants) ? status.participants : []
      });
    });

    socket.on('gameError', (data) => {
      console.log('Game error received:', data);
      setError(data.message);
    });

    socket.on('allTimeLeaderboard', (leaderboard: LeaderboardEntry[]) => {
      setAllTimeLeaderboard(leaderboard);
    });

    socket.on('gameSubmission', (data) => {
      console.log('Word submission result:', data);
      // Immediately update UI - no delays
      setLastSubmission({
        success: data.success,
        word: data.word || wordInput,
        points: data.points,
        message: data.message
      });
      
      if (data.success) {
        setWordInput(''); // Clear input immediately on success
        // Update game status without delay
        socket.emit('getGameStatus');
      }
    });

    socket.on('gameScoreUpdate', (data) => {
      // Update live scores when other players score
      socket.emit('getGameStatus');
    });

    socket.on('testResponse', (data) => {
      console.log('Test response received:', data);
      alert('Socket connection working: ' + data.message);
    });

    // Get initial status
    socket.emit('getGameStatus');
    socket.emit('getAllTimeLeaderboard');

    return () => {
      socket.off('gameStarted');
      socket.off('gameEnded');
      socket.off('gameStatus');
      socket.off('gameError');
      socket.off('allTimeLeaderboard');
      socket.off('gameSubmission');
      socket.off('gameScoreUpdate');
      socket.off('testResponse');
    };
  }, [socket]);

  // Update timer
  useEffect(() => {
    if (!gameStatus.active || !gameStatus.timeLeft) return;

    const timer = setInterval(() => {
      setGameStatus(prev => ({
        ...prev,
        timeLeft: Math.max(0, (prev.timeLeft || 0) - 1000)
      }));
    }, 1000);

    return () => clearInterval(timer);
  }, [gameStatus.active, gameStatus.timeLeft]);

  const startGame = () => {
    if (!socket) {
      console.log('No socket connection');
      return;
    }
    console.log('Emitting startGame with duration:', gameDuration * 1000);
    socket.emit('startGame', { duration: gameDuration * 1000 });
  };

  const endGame = () => {
    if (!socket) return;
    socket.emit('endGame');
  };

  const submitWord = () => {
    console.log('Submit button clicked!');
    console.log('Socket exists:', !!socket);
    console.log('Word input:', wordInput);
    console.log('Game active:', gameStatus.active);
    console.log('Game status:', gameStatus);
    
    if (!socket) {
      console.log('No socket connection');
      setError('No connection to server');
      return;
    }
    
    if (!wordInput.trim()) {
      console.log('Empty word input');
      setLastSubmission({
        success: false,
        word: '',
        message: 'Please enter a word'
      });
      return;
    }
    
    if (!gameStatus.active) {
      console.log('Game not active');
      setError('No active game');
      return;
    }
    
    console.log('Emitting submitGameWord with:', { word: wordInput.trim() });
    
    // Clear previous submission state immediately
    setLastSubmission(null);
    
    // Send the word submission
    socket.emit('submitGameWord', { word: wordInput.trim() });
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getPositionEmoji = (index: number) => {
    switch (index) {
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return `${index + 1}.`;
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={3} sx={{ p: 3, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <GamepadOutlined sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h5" component="h2">
            Word Game Bot
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Tooltip title="View All-Time Leaderboard">
            <IconButton onClick={() => {
              setShowLeaderboard(true);
              if (socket) socket.emit('getAllTimeLeaderboard');
            }}>
              <Leaderboard />
            </IconButton>
          </Tooltip>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {gameStatus.active ? (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Timer sx={{ mr: 1 }} />
              <Typography variant="h6">
                Time Left: {formatTime(gameStatus.timeLeft || 0)}
              </Typography>
              {isSuperAdmin && (
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<Stop />}
                  onClick={endGame}
                  sx={{ ml: 2 }}
                >
                  End Game
                </Button>
              )}
            </Box>

            <LinearProgress 
              variant="determinate" 
              value={((gameDuration * 1000 - (gameStatus.timeLeft || 0)) / (gameDuration * 1000)) * 100}
              sx={{ mb: 2 }}
            />

            <Paper sx={{ p: 2, mb: 2, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
              <Typography variant="h4" align="center" sx={{ letterSpacing: 4 }}>
                {gameStatus.letters}
              </Typography>
              <Typography variant="body2" align="center" sx={{ mt: 1 }}>
                Form words using these letters
              </Typography>
            </Paper>

            {/* Game Input Field */}
            <Paper sx={{ p: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="Enter your word here..."
                  value={wordInput}
                  onChange={(e) => setWordInput(e.target.value.toUpperCase())}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      submitWord();
                    }
                  }}
                  disabled={!gameStatus.active}
                  sx={{ flexGrow: 1 }}
                />
                <Button
                  variant="contained"
                  onClick={() => {
                    console.log('Button physically clicked!');
                    submitWord();
                  }}
                  disabled={!gameStatus.active || !wordInput.trim()}
                  sx={{ minWidth: 100 }}
                >
                  Submit
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => {
                    console.log('Test button clicked!');
                    console.log('Socket:', socket);
                    if (socket) {
                      console.log('Emitting test event...');
                      socket.emit('test', { message: 'test from client' });
                      
                      // Also test direct gameSubmission
                      setTimeout(() => {
                        console.log('Testing direct gameSubmission event...');
                        socket.emit('gameSubmission', {
                          success: false,
                          word: 'TEST',
                          message: 'Direct test message'
                        });
                      }, 1000);
                    }
                  }}
                  sx={{ minWidth: 80, ml: 1 }}
                >
                  Test
                </Button>
              </Box>
              
              {/* Feedback Display */}
              <Box sx={{ mt: 2, minHeight: 40 }}>
                {lastSubmission && (
                  <Alert 
                    severity={lastSubmission.success ? 'success' : 'error'}
                    sx={{ mb: 1 }}
                  >
                    <Typography variant="body2">
                      {lastSubmission.success 
                        ? `✓ "${lastSubmission.word}" - +${lastSubmission.points} points!`
                        : `✗ "${lastSubmission.word}" - ${lastSubmission.message}`
                      }
                    </Typography>
                  </Alert>
                )}
                
                {!lastSubmission && gameStatus.active && (
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    Type a word and press Enter or click Submit
                  </Typography>
                )}
              </Box>
            </Paper>

            {gameStatus.participants && Array.isArray(gameStatus.participants) && gameStatus.participants.length > 0 && (
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  Live Scores
                </Typography>
                <List dense>
                  {gameStatus.participants
                    .sort((a, b) => b.score - a.score)
                    .map((participant, index) => (
                      <ListItem key={participant.userId}>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Typography variant="body1" sx={{ mr: 1 }}>
                                {getPositionEmoji(index)} {participant.username}
                              </Typography>
                              <Chip 
                                label={`${participant.score} pts`} 
                                size="small" 
                                color="primary"
                              />
                            </Box>
                          }
                          secondary={`Words: ${Array.isArray(participant.words) ? participant.words.join(', ') : 'None'}`}
                        />
                      </ListItem>
                    ))}
                </List>
              </Paper>
            )}
          </Box>
        ) : (
          <Box>
            {gameMessage && (
              <Alert severity="info" sx={{ mb: 2 }}>
                {gameMessage}
              </Alert>
            )}
            
            {isSuperAdmin ? (
              <Box>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  Start a new word game session. Players will form words from randomly generated letters.
                </Typography>
                
                <Typography variant="body2" color="primary" sx={{ mb: 1 }}>
                  Current role: {userRole} (Super Admin permissions: {isSuperAdmin ? 'YES' : 'NO'})
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <TextField
                    label="Game Duration (seconds)"
                    type="number"
                    value={gameDuration}
                    onChange={(e) => setGameDuration(Number(e.target.value))}
                    sx={{ mr: 2, width: 200 }}
                    inputProps={{ min: 30, max: 600 }}
                  />
                  <Button
                    variant="contained"
                    startIcon={<PlayArrow />}
                    onClick={startGame}
                    size="large"
                  >
                    Start Game
                  </Button>
                </Box>
              </Box>
            ) : (
              <Box>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                  Only the super admin can start word games. Wait for a game to begin!
                </Typography>
                <Typography variant="body2" color="error">
                  Current role: {userRole} (Need: superadmin)
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </Paper>

      {/* All-Time Leaderboard Dialog */}
      <Dialog 
        open={showLeaderboard} 
        onClose={() => setShowLeaderboard(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <EmojiEvents sx={{ mr: 1, color: 'gold' }} />
            All-Time Leaderboard
          </Box>
        </DialogTitle>
        <DialogContent>
          {Array.isArray(allTimeLeaderboard) && allTimeLeaderboard.length > 0 ? (
            <List>
              {allTimeLeaderboard.map((entry, index) => (
                <ListItem key={entry.userId}>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="h6">
                          {getPositionEmoji(index)} {entry.username}
                        </Typography>
                        <Chip 
                          label={`${entry.score} total pts`} 
                          color={index < 3 ? 'primary' : 'default'}
                          variant={index < 3 ? 'filled' : 'outlined'}
                        />
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography variant="body1" color="text.secondary" align="center">
              No games played yet. Be the first to play!
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowLeaderboard(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Game Results Dialog */}
      <Dialog 
        open={showResults} 
        onClose={() => setShowResults(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          🎮 Game Results
        </DialogTitle>
        <DialogContent>
          {gameResults && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Letters: {gameResults.letters}
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    Final Leaderboard
                  </Typography>
                  <List>
                    {gameResults.leaderboard && gameResults.leaderboard.length > 0 ? (
                      gameResults.leaderboard.map((player, index) => (
                        <ListItem key={player.userId}>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Typography variant="body1">
                                  {getPositionEmoji(index)} {player.username}
                                </Typography>
                                <Chip 
                                  label={`${player.score} pts`} 
                                  color={index < 3 ? 'primary' : 'default'}
                                />
                              </Box>
                            }
                            secondary={`Words found: ${player.words ? player.words.join(', ') : 'None'}`}
                          />
                        </ListItem>
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No players participated
                      </Typography>
                    )}
                  </List>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    All Valid Words ({gameResults.validWords ? gameResults.validWords.length : 0})
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {gameResults.validWords && gameResults.validWords.length > 0 ? (
                      gameResults.validWords.map((word) => (
                        <Chip 
                          key={word} 
                          label={word} 
                          size="small" 
                          variant="outlined"
                        />
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No valid words found
                      </Typography>
                    )}
                  </Box>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowResults(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GameBot;
