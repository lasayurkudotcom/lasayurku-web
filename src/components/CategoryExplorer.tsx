import { useRef, useState } from 'react';
import { decodeHtml } from '../lib/html';

export interface CategoryItem {
  id: number;
  name: string;
  slug: string;
  image: string | null;
}

interface Props {
  categories: CategoryItem[];
}

function CategoryCard({ category, onClick }: { category: CategoryItem; onClick?: () => void }) {
  const displayName = decodeHtml(category.name);

  return (
    <a
      href={`/c/${category.slug}`}
      onClick={onClick}
      className="group inline-flex min-w-[5rem] flex-col items-center gap-2 text-center transition-all duration-200 hover:scale-105"
    >
      <div className="flex h-16 w-16 md:h-20 md:w-20 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50/80 transition-all duration-200 group-hover:bg-emerald-100 group-hover:shadow-md">
        {category.image ? (
          <img
            src={category.image}
            alt={displayName}
            className="p-2.5 h-full w-full object-contain"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-full bg-emerald-100 text-emerald-700 p-2.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c-4.5 4-6 8-6 11a6 6 0 0012 0c0-3-1.5-7-6-11z" />
            </svg>
          </div>
        )}
      </div>

      <span className="mt-2 block max-w-[6.5rem] text-xs md:text-sm font-semibold text-gray-700 line-clamp-2">
        {displayName}
      </span>
    </a>
  );
}

export default function CategoryExplorer({ categories }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const preview = categories.slice(0, 8);

  const scrollLeft = () => {
    containerRef.current?.scrollBy({ left: -240, behavior: 'smooth' });
  };

  const scrollRight = () => {
    containerRef.current?.scrollBy({ left: 240, behavior: 'smooth' });
  };

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-brand" />
          <h2 className="text-lg font-bold text-neutral-900">Kategori</h2>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="text-xs font-semibold uppercase tracking-wider text-brand transition-colors duration-200 hover:text-brand-dark"
        >
          Lihat Semua
        </button>
      </div>

      <div className="relative group">
        <button
          type="button"
          onClick={scrollLeft}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 hidden h-10 w-10 -translate-x-3 items-center justify-center rounded-full border border-white/50 bg-white/70 text-emerald-800 shadow-md backdrop-blur-md transition-all duration-200 hover:bg-white hover:scale-110 hover:shadow-lg opacity-0 group-hover:flex md:flex"
          aria-label="Scroll ke kiri"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        <div
          ref={containerRef}
          className="flex w-full overflow-x-auto scroll-smooth gap-4 pb-2 sm:grid sm:grid-cols-4 lg:grid-cols-8 sm:overflow-x-visible [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {preview.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>

        <button
          type="button"
          onClick={scrollRight}
          className="absolute right-0 top-1/2 z-10 hidden h-10 w-10 translate-x-3 items-center justify-center rounded-full border border-white/50 bg-white/70 text-emerald-800 shadow-md backdrop-blur-md transition-all duration-200 hover:bg-white hover:scale-110 hover:shadow-lg opacity-0 group-hover:flex md:flex"
          aria-label="Scroll ke kanan"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>

      {/* Modal / drawer "Lihat Semua Kategori" */}
      {isModalOpen && (
        <>
          <div
            onClick={() => setIsModalOpen(false)}
            aria-hidden="true"
            className="fixed inset-0 z-40 bg-black/40"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Semua kategori"
            className="fixed inset-x-0 bottom-0 z-50 max-h-[75vh] overflow-y-auto rounded-t-3xl bg-white p-5 shadow-xl sm:inset-x-auto sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:max-h-[80vh] sm:w-full sm:max-w-lg lg:max-w-4xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-neutral-800">Semua Kategori</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label="Tutup"
                className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-8 gap-4">
              {categories.map((category) => (
                <div key={category.id}>
                  <CategoryCard category={category} onClick={() => setIsModalOpen(false)} />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
