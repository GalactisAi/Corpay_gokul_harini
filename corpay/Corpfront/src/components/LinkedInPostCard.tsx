import { Linkedin } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface LinkedInPostCardProps {
  author: string;
  timeAgo: string;
  content: string;
  image?: string;
  likes?: number;
  comments?: number;
  isCorpayBrand?: boolean;
}

export function LinkedInPostCard({ author, timeAgo, content, image, likes = 0, comments = 0, isCorpayBrand = false }: LinkedInPostCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 mb-4 flex-shrink-0 overflow-hidden transition-all duration-300 hover:shadow-md hover:border-gray-200">
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ 
            background: isCorpayBrand 
              ? 'linear-gradient(135deg, #981239 0%, #BE1549 100%)' 
              : 'linear-gradient(135deg, #0085C2 0%, #006ba1 100%)'
          }}>
            <Linkedin className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm truncate" style={{ color: '#3D1628', fontWeight: 600 }}>{author}</p>
            <p className="text-xs" style={{ color: '#999' }}>{timeAgo}</p>
          </div>
        </div>
        
        {/* Content - Display first two lines */}
        <p className="text-sm leading-relaxed whitespace-pre-line line-clamp-2" style={{ color: '#3D1628' }}>
          {content}
        </p>
      </div>
      
      {/* Image */}
      {image && (
        <div className="relative overflow-hidden">
          <ImageWithFallback 
            src={image} 
            alt="LinkedIn post image"
            className="w-full h-40 object-cover"
          />
        </div>
      )}
    </div>
  );
}