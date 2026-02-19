import axios from 'axios';

// Get API config from localStorage or use defaults
const getApiConfig = () => {
  const stored = localStorage.getItem('apiConfig');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return getDefaultConfig();
    }
  }
  return getDefaultConfig();
};

const getDefaultConfig = () => ({
  sharePriceApi: 'https://api.example.com/stock/corpay',
  linkedinPostsApi: 'https://api.linkedin.com/v2/posts',
  powerBiEmbedUrl: 'https://app.powerbi.com/reportEmbed',
  powerBiReportId: 'your-report-id-here'
});

// Share Price API Service
export const sharePriceService = {
  async getSharePrice(): Promise<{ price: number; change: number; changePercent: number; timestamp: string }> {
    const config = getApiConfig();
    
    try {
      // If using a mock/example API, return mock data
      if (config.sharePriceApi.includes('example.com')) {
        // Return mock data for development
        return {
          price: 245.50,
          change: 2.30,
          changePercent: 0.95,
          timestamp: new Date().toISOString()
        };
      }
      
      const response = await axios.get(config.sharePriceApi, {
        timeout: 60000,
        headers: {
          'Accept': 'application/json'
        }
      });
      
      // Adapt response based on actual API structure
      return {
        price: response.data.price || response.data.close || response.data.value || 0,
        change: response.data.change || response.data.changeAmount || 0,
        changePercent: response.data.changePercent || response.data.changePercentage || 0,
        timestamp: response.data.timestamp || new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching share price:', error);
      // Return mock data on error for development
      return {
        price: 245.50,
        change: 2.30,
        changePercent: 0.95,
        timestamp: new Date().toISOString()
      };
    }
  }
};

// Posts API Service
export const postsService = {
  async getPosts(): Promise<Array<{
    id: string;
    title: string;
    content: string;
    image?: string;
    type: 'linkedin' | 'crossBorder';
    createdAt: string;
  }>> {
    const config = getApiConfig();
    
    try {
      // If using a mock/example API, return mock data
      if (config.linkedinPostsApi.includes('example.com') || config.linkedinPostsApi.includes('linkedin.com')) {
        // Return mock data for development
        return [
          {
            id: 'api-1',
            title: 'Partnership with Industry Leaders',
            content: 'Celebrating our partnership with industry leaders! Excited about the future.',
            type: 'linkedin',
            createdAt: new Date(Date.now() - 86400000).toISOString()
          },
          {
            id: 'api-2',
            title: 'Cross-Border Payments Update',
            content: 'Managing international payments just got easier with our new platform.',
            type: 'crossBorder',
            createdAt: new Date(Date.now() - 172800000).toISOString()
          }
        ];
      }
      
      const response = await axios.get(config.linkedinPostsApi, {
        timeout: 60000,
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('apiToken') || ''}`
        }
      });
      
      // Adapt response based on actual API structure
      const posts = Array.isArray(response.data) ? response.data : response.data.posts || response.data.items || [];
      
      return posts.map((post: any, index: number) => ({
        id: post.id || `api-${index}`,
        title: post.title || post.headline || post.text?.substring(0, 50) || 'Untitled Post',
        content: post.content || post.text || post.description || '',
        image: post.image || post.imageUrl || post.thumbnail,
        type: post.type || (post.platform === 'linkedin' ? 'linkedin' : 'crossBorder'),
        createdAt: post.createdAt || post.created_at || post.timestamp || new Date().toISOString()
      }));
    } catch (error) {
      console.error('Error fetching posts:', error);
      // Return empty array on error
      return [];
    }
  }
};

// Save API config to localStorage
export const saveApiConfig = (config: {
  sharePriceApi: string;
  linkedinPostsApi: string;
  powerBiEmbedUrl: string;
  powerBiReportId: string;
}) => {
  localStorage.setItem('apiConfig', JSON.stringify(config));
};

// Get Power BI config
export const getPowerBiConfig = () => {
  const config = getApiConfig();
  return {
    embedUrl: config.powerBiEmbedUrl,
    reportId: config.powerBiReportId
  };
};

