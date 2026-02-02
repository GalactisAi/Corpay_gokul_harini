import { ImageWithFallback } from './figma/ImageWithFallback';

const CUSTOMER_STORIES_URL = 'https://www.corpay.com/resources/customer-stories';

export interface CaseStudyCardProps {
  title: string;
  excerpt?: string;
  category?: string;
  image?: string;
}

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=400';

export function CaseStudyCard({ title, excerpt, category, image = DEFAULT_IMAGE }: CaseStudyCardProps) {
  const categories = category ? [category] : [];

  return (
    <a
      href={CUSTOMER_STORIES_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="block shrink-0 rounded-lg overflow-hidden border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#981239] focus-visible:ring-offset-2"
    >
      <div className="p-3 pb-2">
        <span className="inline-block text-[10px] font-semibold tracking-wide text-gray-500 uppercase mb-2">
          Case Study
        </span>
        <p className="text-sm font-semibold leading-snug mb-2 line-clamp-2" style={{ color: '#3D1628' }}>
          {title}
        </p>
      </div>
      <div className="relative w-full h-32 bg-gray-100">
        <ImageWithFallback
          src={image}
          alt={title}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-3 pt-2">
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {categories.map((cat, i) => (
              <span
                key={i}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-700"
              >
                {cat}
              </span>
            ))}
          </div>
        )}
        {excerpt && (
          <p className="text-xs leading-relaxed line-clamp-3" style={{ color: '#6b7280' }}>
            {excerpt}
          </p>
        )}
      </div>
    </a>
  );
}
