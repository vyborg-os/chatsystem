import React, { useState } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Paper,
  List,
  ListItem,
  ListItemText,
  Typography,
  Divider,
  Chip,
  Fade
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

interface Message {
  id: string;
  type: 'text' | 'file' | 'voice' | 'system';
  text?: string;
  username: string;
  timestamp: string;
  [key: string]: any;
}

interface MessageSearchProps {
  messages: Message[];
  onSelectMessage: (messageId: string) => void;
}

const MessageSearch: React.FC<MessageSearchProps> = ({ messages, onSelectMessage }) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [selectedResultIndex, setSelectedResultIndex] = useState<number>(-1);

  const handleSearch = () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    const term = searchTerm.toLowerCase();
    const results = messages.filter(
      message => 
        message.type === 'text' && 
        message.text && 
        message.text.toLowerCase().includes(term)
    );

    setSearchResults(results);
    setSelectedResultIndex(results.length > 0 ? 0 : -1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    if (e.target.value === '') {
      setSearchResults([]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const navigateResult = (direction: 'next' | 'prev') => {
    if (searchResults.length === 0) return;

    if (direction === 'next') {
      setSelectedResultIndex(prev => 
        prev < searchResults.length - 1 ? prev + 1 : 0
      );
    } else {
      setSelectedResultIndex(prev => 
        prev > 0 ? prev - 1 : searchResults.length - 1
      );
    }
  };

  const handleResultClick = (messageId: string) => {
    onSelectMessage(messageId);
  };

  const toggleSearch = () => {
    setIsSearchOpen(prev => !prev);
    if (isSearchOpen) {
      // Reset search when closing
      setSearchTerm('');
      setSearchResults([]);
    }
  };

  const formatMessagePreview = (text: string) => {
    if (!searchTerm || !text) return text;
    
    const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
    
    return (
      <>
        {parts.map((part, i) => 
          part.toLowerCase() === searchTerm.toLowerCase() ? 
            <mark key={i} style={{ backgroundColor: '#6366f1', color: 'white', padding: '0 2px', borderRadius: '2px' }}>{part}</mark> : 
            part
        )}
      </>
    );
  };

  return (
    <>
      <IconButton 
        onClick={toggleSearch}
        sx={{ 
          color: isSearchOpen ? '#6366f1' : 'inherit',
          '&:hover': { color: '#6366f1' }
        }}
      >
        <SearchIcon />
      </IconButton>

      <Fade in={isSearchOpen}>
        <Paper
          elevation={3}
          sx={{
            position: 'absolute',
            top: 70,
            right: 16,
            width: 320,
            maxHeight: 400,
            zIndex: 1000,
            display: isSearchOpen ? 'flex' : 'none',
            flexDirection: 'column',
            overflow: 'hidden',
            borderRadius: 2,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
          }}
        >
          <Box sx={{ p: 2, bgcolor: '#f5f5f5' }}>
            <TextField
              fullWidth
              size="small"
              value={searchTerm}
              onChange={handleSearchChange}
              onKeyPress={handleKeyPress}
              placeholder="Search messages..."
              variant="outlined"
              autoFocus
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton 
                      size="small" 
                      onClick={() => setSearchTerm('')}
                      edge="end"
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                )
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                }
              }}
            />
          </Box>

          {searchResults.length > 0 && (
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              px: 2,
              py: 1,
              bgcolor: '#f0f0f0'
            }}>
              <Typography variant="body2" color="text.secondary">
                {searchResults.length} results
              </Typography>
              <Box>
                <IconButton 
                  size="small" 
                  onClick={() => navigateResult('prev')}
                  disabled={searchResults.length <= 1}
                >
                  <ArrowUpwardIcon fontSize="small" />
                </IconButton>
                <IconButton 
                  size="small" 
                  onClick={() => navigateResult('next')}
                  disabled={searchResults.length <= 1}
                >
                  <ArrowDownwardIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          )}

          <List
            sx={{
              overflowY: 'auto',
              maxHeight: 300,
              p: 0
            }}
          >
            {searchResults.length > 0 ? (
              searchResults.map((result, index) => (
                <React.Fragment key={result.id}>
                  <ListItem
                    button
                    selected={index === selectedResultIndex}
                    onClick={() => handleResultClick(result.id)}
                    sx={{
                      bgcolor: index === selectedResultIndex ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                      '&:hover': {
                        bgcolor: 'rgba(99, 102, 241, 0.05)'
                      }
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" fontWeight="medium">
                            {result.username}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(result.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Typography 
                          variant="body2" 
                          color="text.secondary"
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                          }}
                        >
                          {formatMessagePreview(result.text || '')}
                        </Typography>
                      }
                    />
                  </ListItem>
                  {index < searchResults.length - 1 && <Divider />}
                </React.Fragment>
              ))
            ) : searchTerm ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  No results found
                </Typography>
              </Box>
            ) : null}
          </List>
        </Paper>
      </Fade>
    </>
  );
};

export default MessageSearch;
