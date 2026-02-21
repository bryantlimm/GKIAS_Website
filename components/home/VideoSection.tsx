// components/home/VideoSection.tsx
'use client';

interface VideoSectionProps {
  title?: string;
  description?: string;
  youtubeUrl?: string;
}

export default function VideoSection({ title, description, youtubeUrl }: VideoSectionProps) {
  // Helper to convert standard YouTube links into Embed links
  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    
    // Handle YouTube live stream URLs: https://www.youtube.com/live/{ID}
    const liveMatch = url.match(/youtube\.com\/live\/([a-zA-Z0-9_-]+)/);
    if (liveMatch && liveMatch[1]) {
      return `https://www.youtube.com/embed/live/${liveMatch[1]}`;
    }
    
    // Handle standard YouTube URLs: watch?v=, youtu.be/, embed/, etc.
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      return `https://www.youtube.com/embed/${match[2]}`;
    }
    
    return url; // Return original if parsing fails
  };

  const embedUrl = youtubeUrl ? getEmbedUrl(youtubeUrl) : '';

  // If there's no data at all, don't render the section
  if (!title && !description && !youtubeUrl) return null;

  return (
    <section className="py-16 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center gap-12">
          
          {/* Text Area (Left Side) */}
          <div className="w-full md:w-1/2 space-y-6 text-center md:text-left">
            {title && (
              <h2 className="text-3xl md:text-4xl font-extrabold text-blue-900 leading-tight">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-lg text-gray-700 whitespace-pre-wrap">
                {description}
              </p>
            )}
          </div>

          {/* Video Area (Right Side) */}
          <div className="w-full md:w-1/2">
            {embedUrl ? (
              <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-2xl border-4 border-gray-100">
                <iframe
                  className="absolute top-0 left-0 w-full h-full"
                  src={embedUrl}
                  title={title || "YouTube video player"}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                ></iframe>
              </div>
            ) : (
              <div className="w-full aspect-video bg-gray-200 rounded-xl flex items-center justify-center shadow-inner">
                <p className="text-gray-500">Video belum ditambahkan</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </section>
  );
}