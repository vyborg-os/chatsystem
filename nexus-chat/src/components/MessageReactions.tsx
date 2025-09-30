import React, { useState } from 'react';
import { 
  Box, 
  IconButton, 
  Tooltip, 
  Popover, 
  Typography,
  Badge,
  Avatar
} from '@mui/material';
import AddReactionIcon from '@mui/icons-material/AddReaction';
import Picker from 'emoji-picker-react';
import { Reaction } from '../types';

interface MessageReactionsProps {
  messageId: string;
  reactions: Record<string, Reaction[]>;
  onAddReaction: (messageId: string, emoji: string) => void;
  currentUserId: string;
  isCurrentUserMessage: boolean;
}

const MessageReactions: React.FC<MessageReactionsProps> = ({ 
  messageId, 
  reactions = {}, 
  onAddReaction,
  currentUserId,
  isCurrentUserMessage
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [showReactionTooltip, setShowReactionTooltip] = useState<HTMLElement | null>(null);
  const [tooltipReaction, setTooltipReaction] = useState<Reaction[]>([]);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleEmojiClick = (emojiData: any) => {
    onAddReaction(messageId, emojiData.emoji);
    handleClose();
  };

  const open = Boolean(anchorEl);
  const id = open ? 'reaction-popover' : undefined;

  // We already have reactions grouped by emoji in the Record<string, Reaction[]>
  // No need to group them again, just use the reactions object directly
  const groupedReactions = reactions;

  const handleReactionMouseEnter = (event: React.MouseEvent<HTMLElement>, reactions: Reaction[]) => {
    setShowReactionTooltip(event.currentTarget);
    setTooltipReaction(reactions);
  };

  const handleReactionMouseLeave = () => {
    setShowReactionTooltip(null);
  };

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
      {Object.entries(groupedReactions).map(([emoji, users]) => (
        <Badge
          key={emoji}
          badgeContent={users.length}
          color="primary"
          sx={{
            '& .MuiBadge-badge': {
              fontSize: '0.6rem',
              height: '16px',
              minWidth: '16px',
              padding: '0 4px'
            }
          }}
        >
          <Box
            component="span"
            sx={{
              cursor: 'pointer',
              bgcolor: users.some((r: Reaction) => r.userId === currentUserId) ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
              border: '1px solid rgba(0,0,0,0.1)',
              borderRadius: '12px',
              px: 0.8,
              py: 0.3,
              fontSize: '1rem',
              transition: 'all 0.2s',
              '&:hover': {
                bgcolor: 'rgba(99, 102, 241, 0.2)',
                transform: 'scale(1.1)'
              }
            }}
            onClick={() => onAddReaction(messageId, emoji)}
            onMouseEnter={(e) => handleReactionMouseEnter(e, users as Reaction[])}
            onMouseLeave={handleReactionMouseLeave}
          >
            {emoji}
          </Box>
        </Badge>
      ))}

      <IconButton 
        size="small" 
        onClick={handleClick}
        sx={{ 
          width: 24, 
          height: 24, 
          ml: 0.5,
          opacity: 0.7,
          '&:hover': {
            opacity: 1,
            bgcolor: 'rgba(99, 102, 241, 0.1)'
          }
        }}
      >
        <AddReactionIcon fontSize="small" />
      </IconButton>

      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: isCurrentUserMessage ? 'left' : 'right',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: isCurrentUserMessage ? 'right' : 'left',
        }}
      >
        <Picker onEmojiClick={handleEmojiClick} />
      </Popover>

      <Popover
        open={Boolean(showReactionTooltip)}
        anchorEl={showReactionTooltip}
        onClose={() => setShowReactionTooltip(null)}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        sx={{ pointerEvents: 'none' }}
      >
        <Box sx={{ p: 1, maxWidth: 200 }}>
          {tooltipReaction.map((reaction, index) => (
            <Typography key={index} variant="body2" sx={{ fontSize: '0.75rem' }}>
              {reaction.username}
            </Typography>
          ))}
        </Box>
      </Popover>
    </Box>
  );
};

export default MessageReactions;
