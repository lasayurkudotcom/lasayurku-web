import { useEffect, useRef, useState, type TouchEvent } from 'react';
import type { HeroBanner } from '../lib/banners';

interface Props {
  slides: HeroBanner[];
  /** Interval autoplay dalam ms */
  autoplayInterval?: number;
}

export default function BannerSlider({ slides, autoplayInterval = 5000 }: Props) {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const count = slides.length;

  const goTo = (next: number) => {
    setIndex(((next % count) + count) % count);
  };

  const resetAutoplay = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (count <= 1) return;
    timerRef.current = setInterval(() => {
      setIndex((prev) => (prev + 1) % count);
    }, autoplayInterval);
  };

  useEffect(() => {
    resetAutoplay();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, autoplayInterval]);

  const handleTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (touchStartX.current === null) return;
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  };

  const handleTouchEnd = () => {
    const threshold = 40;
    if (touchDeltaX.current > threshold) {
      goTo(index - 1);
      resetAutoplay();
    } else if (touchDeltaX.current < -threshold) {
      goTo(index + 1);
      resetAutoplay();
    }
    touchStartX.current = null;
    touchDeltaX.current = 0;
  };

  if (count === 0) return null;

  return (
    <div className="relative my-4 select-none">
      <div
        className="overflow-hidden rounded-3xl"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {slides.map((slide) => (
            <a
              key={slide.id}
              href={slide.href}
              className={`relative flex w-full flex-shrink-0 items-center overflow-hidden bg-gradient-to-br px-6 py-10 text-white sm:px-10 sm:py-14 ${slide.gradient}`}
            >
              <div className="relative z-10 max-w-md">
                {slide.eyebrow && (
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/80">{slide.eyebrow}</p>
                )}
                <h2 className="mt-2 text-2xl font-bold leading-tight sm:text-4xl">{slide.title}</h2>
                {slide.subtitle && <p className="mt-2 max-w-sm text-sm text-white/90">{slide.subtitle}</p>}
                {slide.ctaLabel && (
                  <span className="mt-5 inline-block rounded-full bg-white px-5 py-2 text-sm font-semibold text-brand shadow transition-transform hover:-translate-y-0.5">
                    {slide.ctaLabel}
                  </span>
                )}
              </div>

              {slide.image && (
                <img
                  src={slide.image}
                  alt=""
                  aria-hidden="true"
                  className="pointer-events-none absolute right-2 top-1/2 h-3/4 w-auto -translate-y-1/2 object-contain drop-shadow-xl sm:right-6"
                />
              )}
            </a>
          ))}
        </div>
      </div>

      {/* Panah navigasi — hanya tampil di layar >= sm agar tidak mengganggu swipe di mobile */}
      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="Slide sebelumnya"
            onClick={() => {
              goTo(index - 1);
              resetAutoplay();
            }}
            className="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/80 p-1.5 text-brand shadow hover:bg-white sm:flex"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Slide berikutnya"
            onClick={() => {
              goTo(index + 1);
              resetAutoplay();
            }}
            className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/80 p-1.5 text-brand shadow hover:bg-white sm:flex"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </>
      )}

      {/* Dot indicator */}
      {count > 1 && (
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              aria-label={`Ke slide ${i + 1}`}
              onClick={() => {
                goTo(i);
                resetAutoplay();
              }}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? 'w-5 bg-brand' : 'w-1.5 bg-brand/20'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
