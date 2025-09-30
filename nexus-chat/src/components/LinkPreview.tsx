import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  CardMedia, 
  Typography, 
  Link, 
  CircularProgress,
  Skeleton
} from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';

interface LinkPreviewProps {
  url: string;
}

interface PreviewData {
  title?: string;
  description?: string;
  image?: string;
  url: string;
  siteName?: string;
}

const LinkPreview: React.FC<LinkPreviewProps> = ({ url }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchPreview = async () => {
      try {
        setLoading(true);
        
        // For a real implementation, you would use a link preview API like LinkPreview.net, 
        // OpenGraph.io, or iframely. For this example, we'll create a mock response.
        
        // In a real app, you would make an API call like:
        // const response = await fetch(`https://api.linkpreview.net/?key=YOUR_API_KEY&q=${encodeURIComponent(url)}`);
        // const data = await response.json();
        
        // For now, let's simulate a response based on the URL
        let mockData: PreviewData = {
          url: url,
          title: 'Link Preview',
          description: 'This is a preview of the linked content'
        };
        
        // Check if it's an image URL
        if (url.match(/\.(jpeg|jpg|gif|png)$/i)) {
          mockData = {
            url: url,
            title: 'Image',
            image: url
          };
        } 
        // Check if it's a video URL
        else if (url.match(/\.(mp4|webm|ogg)$/i) || url.includes('youtube.com') || url.includes('youtu.be')) {
          mockData = {
            url: url,
            title: 'Video',
            description: 'Video content',
            image: url.includes('youtube') ? `https://img.youtube.com/vi/${url.split('v=')[1]?.split('&')[0] || 'dQw4w9WgXcQ'}/mqdefault.jpg` : undefined
          };
        }
        // Check if it's a common website
        else if (url.includes('github.com')) {
          mockData = {
            url: url,
            title: 'GitHub Repository',
            description: 'View code on GitHub',
            siteName: 'GitHub',
            image: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png'
          };
        }
        else if (url.includes('twitter.com') || url.includes('x.com')) {
          mockData = {
            url: url,
            title: 'Twitter Post',
            description: 'View this tweet',
            siteName: 'Twitter',
            image: 'https://abs.twimg.com/responsive-web/client-web/icon-ios.b1fc727a.png'
          };
        }
        
        // Simulate network delay
        setTimeout(() => {
          setPreviewData(mockData);
          setLoading(false);
        }, 500);
        
      } catch (err) {
        console.error('Error fetching link preview:', err);
        setError('Failed to load preview');
        setLoading(false);
      }
    };
    
    if (url) {
      fetchPreview();
    }
  }, [url]);
  
  // Check if URL is an image
  const isImage = url.match(/\.(jpeg|jpg|gif|png)$/i);
  
  // Check if URL is a video
  const isVideo = url.match(/\.(mp4|webm|ogg)$/i) || url.includes('youtube.com') || url.includes('youtu.be');
  
  if (loading) {
    return (
      <Card variant="outlined" sx={{ maxWidth: 345, my: 1 }}>
        <Skeleton variant="rectangular" height={140} />
        <CardContent>
          <Skeleton variant="text" width="80%" />
          <Skeleton variant="text" width="60%" />
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Link href={url} target="_blank" rel="noopener noreferrer" underline="none">
        <Card variant="outlined" sx={{ maxWidth: 345, my: 1 }}>
          <CardContent>
            <Box display="flex" alignItems="center">
              <LinkIcon sx={{ mr: 1 }} />
              <Typography variant="body2" color="text.secondary">
                {url}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Link>
    );
  }
  
  if (isImage && previewData) {
    return (
      <Box sx={{ maxWidth: 345, my: 1 }}>
        <Link href={url} target="_blank" rel="noopener noreferrer">
          <img 
            src={url} 
            alt="Image preview" 
            style={{ 
              maxWidth: '100%', 
              maxHeight: '200px', 
              borderRadius: '8px',
              objectFit: 'contain'
            }} 
          />
        </Link>
      </Box>
    );
  }
  
  if (isVideo && previewData) {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      // Extract YouTube video ID
      const videoId = url.includes('youtube.com') 
        ? url.split('v=')[1]?.split('&')[0] 
        : url.split('youtu.be/')[1]?.split('?')[0];
        
      if (videoId) {
        return (
          <Box sx={{ maxWidth: 345, my: 1 }}>
            <iframe
              width="100%"
              height="200"
              src={`https://www.youtube.com/embed/${videoId}`}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ borderRadius: '8px' }}
            />
          </Box>
        );
      }
    } else {
      return (
        <Box sx={{ maxWidth: 345, my: 1 }}>
          <video 
            controls 
            src={url} 
            style={{ 
              maxWidth: '100%', 
              borderRadius: '8px' 
            }}
          />
        </Box>
      );
    }
  }
  
  return (
    <Link href={url} target="_blank" rel="noopener noreferrer" underline="none">
      <Card variant="outlined" sx={{ 
        maxWidth: 345, 
        my: 1,
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
        }
      }}>
        {previewData?.image && (
          <CardMedia
            component="img"
            height="140"
            image={previewData.image}
            alt={previewData.title || 'Link preview'}
            sx={{ objectFit: 'cover' }}
          />
        )}
        <CardContent>
          <Typography variant="h6" component="div" noWrap>
            {previewData?.title || 'Link Preview'}
          </Typography>
          {previewData?.description && (
            <Typography variant="body2" color="text.secondary" sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}>
              {previewData.description}
            </Typography>
          )}
          <Box display="flex" alignItems="center" mt={1}>
            <LinkIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary" noWrap>
              {previewData?.siteName || new URL(url).hostname}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Link>
  );
};

export default LinkPreview;
