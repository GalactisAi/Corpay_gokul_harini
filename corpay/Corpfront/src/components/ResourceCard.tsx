import { FileText, BookOpen } from 'lucide-react';

interface ResourceCardProps {
  title: string;
  description: string;
  type: 'case-study' | 'whitepaper';
  /** When set, card navigates to /resources/${resourceId} (fixes incorrect redirection) */
  resourceId?: number | string | null;
  /** Fallback external URL when resourceId is not set */
  url?: string;
}

export function ResourceCard({ title, description, type, resourceId, url }: ResourceCardProps) {
  const Icon = type === 'case-study' ? FileText : BookOpen;
  const bgColor = type === 'case-study' ? '#3D1628' : '#981239';

  const content = (
    <>
      <div className="p-2 rounded shrink-0" style={{ backgroundColor: bgColor + '20' }}>
        <Icon className="w-4 h-4" style={{ color: bgColor }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium mb-1 line-clamp-2 leading-snug" style={{ color: '#3D1628' }}>{title}</p>
        {description ? (
          <p className="text-xs line-clamp-2 leading-relaxed" style={{ color: '#6b7280' }}>{description}</p>
        ) : null}
      </div>
    </>
  );

  const className = "flex items-start gap-3 p-3 bg-gray-50/60 rounded-lg cursor-pointer hover:bg-gray-100/80 transition-colors duration-150";

  if (resourceId != null && resourceId !== '') {
    return (
      <a
        href={`/resources/${resourceId}`}
        className={className}
        style={{ cursor: 'pointer', textDecoration: 'none' }}
      >
        {content}
      </a>
    );
  }

  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        style={{ cursor: 'pointer', textDecoration: 'none' }}
      >
        {content}
      </a>
    );
  }

  return (
    <div className={className} style={{ cursor: 'pointer' }}>
      {content}
    </div>
  );
}