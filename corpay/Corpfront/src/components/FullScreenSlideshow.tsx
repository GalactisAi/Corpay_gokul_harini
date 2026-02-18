import { useState, useEffect } from 'react';
import axios from 'axios';

interface FullScreenSlideshowProps {
  slideshowType: 'file' | 'url';
  source: string;
  intervalSeconds?: number;
  onClose?: () => void;
}

const loadingScreenStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  width: '100%',
  height: '100%',
  margin: 0,
  padding: 0,
  backgroundColor: '#000',
  zIndex: 99999,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#fff',
  fontSize: '24px',
};

export function FullScreenSlideshow({ slideshowType, source, intervalSeconds = 5, onClose }: FullScreenSlideshowProps) {
  const [slides, setSlides] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(slideshowType === 'file');
  const [error, setError] = useState<string | null>(null);
  const [loadingSlow, setLoadingSlow] = useState(false);

  const intervalSec = Math.max(1, Math.min(300, Number(intervalSeconds) || 5));

  useEffect(() => {
    if (slideshowType === 'url') {
      setLoading(false);
      return;
    }
    loadSlides();
  }, [slideshowType, source]);

  // Show "taking longer" hint after 12 seconds
  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => setLoadingSlow(true), 12000);
    return () => clearTimeout(t);
  }, [loading]);

  // Auto-advance slides every intervalSeconds (must be before any early returns - Rules of Hooks)
  useEffect(() => {
    if (slides.length <= 1) return;
    const ms = Math.max(1000, intervalSec * 1000);
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, ms);
    return () => clearInterval(timer);
  }, [slides.length, intervalSec]);

  const loadSlides = async () => {
    try {
      setLoading(true);
      setError(null);
      setLoadingSlow(false);
      console.log('[Slideshow] Loading slides from backend...');

      // Use empty string so /api goes through Vite proxy to backend (avoids CORS)
      const API_BASE = import.meta.env.VITE_API_URL || '';
      const slidesUrl = API_BASE ? `${API_BASE}/api/dashboard/slideshow/slides` : '/api/dashboard/slideshow/slides';
      const response = await axios.get(slidesUrl, { timeout: 120000 });
      console.log('[Slideshow] Backend response:', response.data);

      if (response.data.slides && Array.isArray(response.data.slides) && response.data.slides.length > 0) {
        console.log('[Slideshow] ✅ Loaded', response.data.slides.length, 'slides from backend');
        setSlides(response.data.slides);
        setCurrentIndex(0);
        setLoading(false);
      } else {
        setError('No slides found. Backend may need LibreOffice (PPT) or pymupdf (PDF). Check server logs.');
        setLoading(false);
      }
    } catch (err: any) {
      console.error('[Slideshow] ❌ Error loading slides:', err);
      const msg = err.response?.data?.detail ?? err.message ?? 'Request failed. Is the backend running? (Check terminal and try http://localhost:8000)';
      setError(String(msg));
      setLoading(false);
    }
  };

  if (slideshowType === 'url') {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        margin: 0,
        padding: 0,
        backgroundColor: '#000',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column'
      }}>
        <iframe
          title="Power BI or Embed"
          src={source}
          style={{
            width: '100%',
            height: '100%',
            border: 'none'
          }}
          onError={() => setError('Failed to load embed URL')}
        />
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              zIndex: 100000,
              padding: '8px 16px',
              fontSize: 14,
              backgroundColor: 'rgba(0,0,0,0.6)',
              color: '#fff',
              border: '1px solid #fff',
              borderRadius: 4,
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div style={loadingScreenStyle}>
        <div>Loading presentation...</div>
        {loadingSlow && (
          <div style={{ marginTop: 16, fontSize: 14, color: '#aaa', textAlign: 'center', maxWidth: 320 }}>
            Taking longer than usual. The server may be converting the file.
            <br />Check that the backend is running and check the browser console (F12) for errors.
          </div>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        width: '100vw', 
        height: '100vh', 
        backgroundColor: '#000', 
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        flexDirection: 'column',
        padding: '20px'
      }}>
        <div style={{ fontSize: '24px', marginBottom: '10px' }}>Error</div>
        <div style={{ marginBottom: '20px' }}>{error}</div>
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        width: '100vw', 
        height: '100vh', 
        backgroundColor: '#000', 
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff'
      }}>
        No slides found
      </div>
    );
  }

  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      width: '100vw', 
      height: '100vh', 
      backgroundColor: '#000', 
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column'
    }}>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 100000,
            padding: '8px 16px',
            fontSize: 14,
            backgroundColor: 'rgba(0,0,0,0.6)',
            color: '#fff',
            border: '1px solid #fff',
            borderRadius: 4,
            cursor: 'pointer'
          }}
        >
          Close
        </button>
      )}
      {/* Slide display only - no header or navigation buttons */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#1a1a1a',
        overflow: 'auto',
        padding: '20px'
      }}>
        <img
          src={slides[currentIndex]}
          alt={`Slide ${currentIndex + 1}`}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain'
          }}
          onError={(e) => {
            console.error('Image load error');
            setError('Failed to load slide image');
          }}
        />
      </div>
    </div>
  );
}
