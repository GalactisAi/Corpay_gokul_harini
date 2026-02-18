"""
Service to extract metadata from LinkedIn post URLs
Extracts image and caption from LinkedIn post URLs using Open Graph tags
"""
import httpx
from typing import Dict, Any, Optional
from urllib.parse import urljoin
from bs4 import BeautifulSoup
import re
import logging

logger = logging.getLogger(__name__)


class LinkedInURLExtractor:
    """Extract metadata from LinkedIn post URLs"""
    
    @staticmethod
    async def extract_post_metadata(post_url: str) -> Dict[str, Any]:
        """
        Extract image and caption from a LinkedIn post URL
        
        Args:
            post_url: Full LinkedIn post URL
            
        Returns:
            Dictionary with image_url, content (first two lines), and other metadata
        """
        try:
            # Use LinkedIn's oEmbed endpoint or fetch the page
            # LinkedIn provides oEmbed for posts: https://www.linkedin.com/embed/feed/update/{post_id}
            
            # Try to extract post ID from URL
            post_id = LinkedInURLExtractor._extract_post_id(post_url)
            
            # Fetch the page with proper headers to get Open Graph tags
            # Note: LinkedIn may block automated requests, so we'll handle errors gracefully
            async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                }
                
                try:
                    response = await client.get(post_url, headers=headers)
                    response.raise_for_status()
                    html = response.text
                except httpx.HTTPStatusError as e:
                    # LinkedIn might return 403 or other status codes
                    logger.warning(f"LinkedIn returned status {e.response.status_code} for URL {post_url}")
                    raise
                except httpx.RequestError as e:
                    # Network errors, timeouts, etc.
                    logger.warning(f"Request error fetching LinkedIn URL {post_url}: {e}")
                    raise
                
                # Parse HTML to extract Open Graph meta tags
                soup = BeautifulSoup(html, 'html.parser')
                
                # Extract Open Graph image
                og_image = None
                og_image_tag = soup.find('meta', property='og:image')
                if og_image_tag:
                    og_image = og_image_tag.get('content')
                
                # Extract Open Graph description (caption)
                og_description = None
                og_desc_tag = soup.find('meta', property='og:description')
                if og_desc_tag:
                    og_description = og_desc_tag.get('content')
                
                # Extract title as fallback
                og_title = None
                og_title_tag = soup.find('meta', property='og:title')
                if og_title_tag:
                    og_title = og_title_tag.get('content')
                
                # Get first two lines of description (limit to first two lines for display)
                content = ""
                if og_description:
                    # Split by newlines, periods, or line breaks and take first two meaningful lines
                    # Remove extra whitespace and newlines
                    cleaned_desc = ' '.join(og_description.split())
                    # Split by sentence endings or newlines
                    sentences = re.split(r'[.\n]', cleaned_desc)
                    # Take first two sentences or lines, max 200 characters
                    if len(sentences) >= 2:
                        content = '. '.join(sentences[:2]).strip()
                        if content and not content.endswith('.'):
                            content += '.'
                    else:
                        content = cleaned_desc[:200].strip()
                    # Ensure it's not too long
                    if len(content) > 200:
                        content = content[:197] + '...'
                elif og_title:
                    content = og_title
                
                # If no image found, try to find image in meta tags
                if not og_image:
                    # Try twitter:image as fallback
                    twitter_image = soup.find('meta', attrs={'name': 'twitter:image'})
                    if twitter_image:
                        og_image = twitter_image.get('content')
                # Ensure absolute URL so frontend can load images (prefix relative paths)
                image_url = None
                if og_image:
                    og_image = (og_image or "").strip()
                    if og_image.startswith("http://") or og_image.startswith("https://"):
                        image_url = og_image
                    else:
                        image_url = urljoin("https://www.linkedin.com", og_image)
                
                return {
                    'image_url': image_url,
                    'content': content or f"LinkedIn Post: {post_url}",
                    'title': og_title or "LinkedIn Post",
                    'description': og_description or ""
                }
                
        except httpx.TimeoutException as e:
            logger.warning(f"Timeout extracting metadata from LinkedIn URL {post_url}: {e}")
            # Return default values on timeout
            return {
                'image_url': None,
                'content': f"LinkedIn Post: {post_url}",
                'title': "LinkedIn Post",
                'description': ""
            }
        except httpx.HTTPStatusError as e:
            logger.warning(f"HTTP error {e.response.status_code} extracting metadata from LinkedIn URL {post_url}: {e}")
            # Return default values on HTTP error (e.g., 403, 429)
            return {
                'image_url': None,
                'content': f"LinkedIn Post: {post_url}",
                'title': "LinkedIn Post",
                'description': ""
            }
        except httpx.RequestError as e:
            logger.warning(f"Request error extracting metadata from LinkedIn URL {post_url}: {e}")
            # Return default values on network error
            return {
                'image_url': None,
                'content': f"LinkedIn Post: {post_url}",
                'title': "LinkedIn Post",
                'description': ""
            }
        except Exception as e:
            logger.error(f"Unexpected error extracting metadata from LinkedIn URL {post_url}: {e}")
            import traceback
            logger.error(traceback.format_exc())
            # Return default values on error - don't fail the request
            return {
                'image_url': None,
                'content': f"LinkedIn Post: {post_url}",
                'title': "LinkedIn Post",
                'description': ""
            }
    
    @staticmethod
    def _extract_post_id(url: str) -> Optional[str]:
        """Extract post ID from LinkedIn URL"""
        # LinkedIn post URLs can be in various formats:
        # https://www.linkedin.com/posts/company_activity-1234567890-abcdef
        # https://www.linkedin.com/feed/update/urn:li:activity:1234567890
        # https://www.linkedin.com/posts/galactisaitech_republicday-activity-7421409117501603840-97Jn
        
        # Try to extract activity ID
        activity_match = re.search(r'activity-(\d+)', url)
        if activity_match:
            return activity_match.group(1)
        
        # Try URN format
        urn_match = re.search(r'urn:li:activity:(\d+)', url)
        if urn_match:
            return urn_match.group(1)
        
        return None
