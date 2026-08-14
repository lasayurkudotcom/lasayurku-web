import { useEffect, useState } from 'react';
import { decodeHtml } from '../lib/html';

export interface CategoryItem {
  id: number;
  name: string;
  slug: string;
  image: string | null;
}

interface Props {
  categories: CategoryItem[];
  /** slug kategori yang sedang aktif/dibuka, dipakai untuk highlight lingkaran ikon */
  activeSlug?: string;
}

function CategoryCircle({
  category,
  isActive,
  size = 'md',
  onClick,
}: {
  category: CategoryItem;
  isActive?: boolean;
  size?: 'sm' | 'md';
  onClick?: () => void;
}) {
  const dimension = size === 'md' ? 'h-12 w-12' : 'h-10 w-10';
  const displayName = decodeHtml(category.name);

  return (
    <a href={`/c/${category.slug}`} onClick={onClick} className="flex flex-col items-center gap-1.5 text-center">
      {category.image ? (
        <img
          src={category.image}
          alt={displayName}
          className={`${dimension} rounded-full border-2 object-cover ${
            isActive ? 'border-brand' : 'border-brand/10'
          }`}
        />
      ) : (
        <div
          className={`${dimension} flex items-center justify-center rounded-full border-2 bg-brand/10 text-brand/40 ${
            isActive ? 'border-brand' : 'border-brand/10'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c-4.5 4-6 8-6 11a6 6 0 0012 0c0-3-1.5-7-6-11z" />
          </svg>
        </div>
      )}
      <span className={`line-clamp-2 w-16 text-[11px] font-medium leading-tight ${isActive ? 'text-brand' : 'text-neutral-600'}`}>
        {displayName}
      </span>
    </a>
  );
}

export default function CategoryTopBar({ categories, activeSlug }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPanel, setShowPanel] = useState(false);

  useEffect(() => {
    if (isExpanded) {
      setShowPanel(true);
      return;
    }

    const timer = window.setTimeout(() => {
      setShowPanel(false);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [isExpanded]);

  return (
    <section className="sticky top-16 z-30 w-full border-b border-brand/10 bg-white/95 backdrop-blur-sm">
      <div className="w-full max-w-7xl mx-auto px-4 py-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <div className="flex items-center gap-4 overflow-x-auto scrollbar-none pb-1 min-w-0">
          {categories.map((category) => (
            <div key={category.id} className="flex-shrink-0">
              <CategoryCircle category={category} isActive={category.slug === activeSlug} />
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded((v) => !v)}
          className="text-brand font-semibold hover:underline flex items-center gap-1 shrink-0"
          aria-expanded={isExpanded}
        >
          <span className="whitespace-nowrap text-[11px] font-semibold">Lihat Semua ☰</span>
        </button>
      </div>

      <div className="relative">
        {isExpanded && (
          <div
            onClick={() => setIsExpanded(false)}
            aria-hidden="true"
            className="fixed inset-0 z-30 bg-black/30"
          />
        )}

        {showPanel && (
          <div
            role="region"
            aria-label="Semua kategori"
            className={`absolute left-0 right-0 top-full z-40 mt-2 rounded-2xl border border-brand/10 bg-white p-4 shadow-lg transition-all duration-300 ${
              isExpanded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3'
            }`}
          >
            <div className="grid grid-cols-4 gap-x-2 gap-y-5 sm:grid-cols-5">
              {categories.map((category) => (
                <CategoryCircle
                  key={category.id}
                  category={category}
                  isActive={category.slug === activeSlug}
                  size="sm"
                  onClick={() => setIsExpanded(false)}
                />
              ))}
            </div>

            <div className="mt-4 flex justify-center border-t border-brand/10 pt-3">
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="text-sm font-semibold text-brand hover:underline"
              >
                Tutup ▲
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
