"""
LinkedIn Company Posts Scraper
Fetches posts from a LinkedIn company page and stores them in the database
"""
import httpx
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from bs4 import BeautifulSoup
import re
import logging
from urllib.parse import urljoin, urlparse

logger = logging.getLogger(__name__)


class LinkedInScraper:
    """Scraper for LinkedIn company posts"""
    
    def __init__(self, company_url: str):
        """
        Initialize scraper with company LinkedIn URL
        
        Args:
            company_url: Full LinkedIn company page URL (e.g., https://www.linkedin.com/company/galactisaitech/posts/?feedView=all)
        """
        self.company_url = company_url
        self.company_name = self._extract_company_name(company_url)
        
    def _extract_company_name(self, url: str) -> str:
        """Extract company name from URL"""
        # Extract from URL like: /company/galactisaitech/
        match = re.search(r'/company/([^/]+)', url)
        if match:
            return match.group(1).replace('-', ' ').title()
        return "LinkedIn Company"
    
    async def fetch_posts(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Fetch posts from LinkedIn company page
        
        Note: LinkedIn requires authentication and has anti-scraping measures.
        This is a basic implementation. For production, consider:
        1. Using LinkedIn Official API with OAuth
        2. Using a third-party LinkedIn API service
        3. Using browser automation (Selenium/Playwright) with proper authentication
        
        Returns:
            List of post dictionaries
        """
        posts = []
        
        try:
            # LinkedIn pages are JavaScript-rendered, so direct HTTP requests won't work
            # This is a placeholder that shows the structure
            # For actual implementation, you would need:
            # 1. LinkedIn API with OAuth (recommended)
            # 2. Browser automation (Selenium/Playwright)
            # 3. Third-party LinkedIn API service
            
            logger.warning(
                "LinkedIn scraping requires authentication. "
                "Consider using LinkedIn Official API or browser automation."
            )
            
            # Return empty list - posts should be added via admin dashboard or API
            # In production, integrate with LinkedIn Official API here
            
        except Exception as e:
            logger.error(f"Error fetching LinkedIn posts: {e}")
        
        return posts
    
    def parse_post_data(self, post_html: str) -> Optional[Dict[str, Any]]:
        """
        Parse a single post from HTML
        
        This is a placeholder - actual implementation would parse LinkedIn's HTML structure
        """
        try:
            soup = BeautifulSoup(post_html, 'html.parser')
            
            # LinkedIn's HTML structure changes frequently
            # This is a basic example - adjust based on actual HTML structure
            
            post_data = {
                "author": self.company_name,
                "content": "",
                "image_url": None,
                "likes": 0,
                "comments": 0,
                "post_type": "corpay",  # Default type
                "time_ago": "Just now",
                "created_at": datetime.now()
            }
            
            # Extract content, images, engagement metrics from HTML
            # This would need to be customized based on LinkedIn's actual HTML structure
            
            return post_data
            
        except Exception as e:
            logger.error(f"Error parsing post HTML: {e}")
            return None


# Alternative: Use LinkedIn Official API (Recommended)
class LinkedInAPIClient:
    """
    LinkedIn Official API Client
    
    To use this, you need:
    1. LinkedIn Developer Account
    2. Create an app at https://www.linkedin.com/developers/
    3. Get OAuth credentials
    4. Request access to Company Pages API
    """
    
    def __init__(self, client_id: str, client_secret: str, access_token: str, company_name: str = "Corpay"):
        self.client_id = client_id
        self.client_secret = client_secret
        self.access_token = access_token
        self.api_base = "https://api.linkedin.com/v2"
        self.company_name = company_name
    
    async def get_company_posts(self, company_urn: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Fetch company posts using LinkedIn Official API
        
        Args:
            company_urn: LinkedIn URN for the company (e.g., urn:li:organization:123456)
            limit: Maximum number of posts to fetch
        
        Returns:
            List of post dictionaries
        """
        posts = []
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                headers = {
                    "Authorization": f"Bearer {self.access_token}",
                    "Content-Type": "application/json"
                }
                
                # LinkedIn API endpoint for company posts
                # Note: This requires proper API access and URN
                url = f"{self.api_base}/ugcPosts"
                params = {
                    "q": "authors",
                    "authors": f"List({company_urn})",
                    "count": limit
                }
                
                response = await client.get(url, headers=headers, params=params)
                response.raise_for_status()
                data = response.json()
                
                # Transform LinkedIn API response to our format
                for item in data.get("elements", []):
                    posts.append({
                        "author": self.company_name,
                        "content": item.get("specificContent", {}).get("com.linkedin.ugc.ShareContent", {}).get("text", {}).get("text", ""),
                        "image_url": self._extract_image_url(item),
                        "likes": item.get("numLikes", 0),
                        "comments": item.get("numComments", 0),
                        "post_type": "corpay",
                        "time_ago": self._calculate_time_ago(item.get("created", {}).get("time", 0)),
                        "created_at": datetime.fromtimestamp(item.get("created", {}).get("time", 0) / 1000)
                    })
                
        except Exception as e:
            logger.error(f"Error fetching posts from LinkedIn API: {e}")
        
        return posts
    
    def _extract_image_url(self, post_data: Dict) -> Optional[str]:
        """Extract image URL from LinkedIn post data. Returns absolute URL (prefixes relative paths with LinkedIn base)."""
        # LinkedIn API structure for images
        media = post_data.get("specificContent", {}).get("com.linkedin.ugc.ShareContent", {}).get("media", [])
        if media and len(media) > 0:
            raw = media[0].get("originalUrl")
            if not raw:
                return None
            raw = (raw or "").strip()
            if not raw:
                return None
            # Ensure absolute URL for correct loading in frontend
            if raw.startswith("http://") or raw.startswith("https://"):
                return raw
            return urljoin("https://www.linkedin.com", raw)
        return None
    
    def _calculate_time_ago(self, timestamp_ms: int) -> str:
        """Calculate human-readable time ago"""
        if not timestamp_ms:
            return "Just now"
        
        post_time = datetime.fromtimestamp(timestamp_ms / 1000)
        now = datetime.now()
        diff = now - post_time
        
        if diff.days > 0:
            return f"{diff.days}d ago"
        elif diff.seconds > 3600:
            return f"{diff.seconds // 3600}h ago"
        elif diff.seconds > 60:
            return f"{diff.seconds // 60}m ago"
        else:
            return "Just now"
