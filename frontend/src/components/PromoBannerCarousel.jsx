import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AUTO_ADVANCE_MS = 4500;

function openLink(url, navigate) {
  if (!url) return;
  if (url.startsWith('/')) {
    navigate(url);
    return;
  }
  const tg = window.Telegram?.WebApp;
  if (tg?.openLink) tg.openLink(url);
  else window.open(url, '_blank', 'noopener,noreferrer');
}

export default function PromoBannerCarousel({ banners }) {
  const [index, setIndex] = useState(0);
  const trackRef = useRef(null);
  const touchStartX = useRef(null);
  const navigate = useNavigate();
  const count = banners.length;

  // Auto-advance, paused while the user is actively touching the strip.
  const pausedRef = useRef(false);
  useEffect(() => {
    if (count <= 1) return;
    const t = setInterval(() => {
      if (!pausedRef.current) setIndex((i) => (i + 1) % count);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(t);
  }, [count]);

  function onTouchStart(e) {
    pausedRef.current = true;
    touchStartX.current = e.touches[0].clientX;
  }

  function onTouchEnd(e) {
    pausedRef.current = false;
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    const SWIPE_THRESHOLD = 40;
    if (dx > SWIPE_THRESHOLD) setIndex((i) => (i - 1 + count) % count);
    else if (dx < -SWIPE_THRESHOLD) setIndex((i) => (i + 1) % count);
  }

  if (count === 0) return null;

  return (
    <div className="promo-banner">
      <div
        className="promo-banner-track"
        style={{ transform: `translateX(-${index * 100}%)` }}
        ref={trackRef}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {banners.map((b) => (
          <button
            type="button"
            key={b.id}
            className="promo-banner-slide"
            onClick={() => openLink(b.linkUrl, navigate)}
            aria-label="Promo banner"
          >
            <img src={b.imageUrl} alt="" loading="lazy" />
          </button>
        ))}
      </div>

      {count > 1 && (
        <div className="promo-banner-dots">
          {banners.map((b, i) => (
            <button
              type="button"
              key={b.id}
              className={`promo-banner-dot ${i === index ? 'active' : ''}`}
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
