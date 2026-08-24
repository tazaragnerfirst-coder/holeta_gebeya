import React, { useRef, useState } from 'react';
import Icon from './Icon.jsx';

// `left`/`right`: optional overlay buttons (back / report) rendered
// on top of the hero image, so the carousel owns the whole header
// area instead of the page having to position them separately.
export default function ImageCarousel({ images = [], left, right }) {
  const trackRef = useRef(null);
  const [active, setActive] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const pics = images && images.length ? images : [null];

  function onScroll() {
    const el = trackRef.current;
    if (!el || el.clientWidth === 0) return;
    setActive(Math.round(el.scrollLeft / el.clientWidth));
  }

  function goTo(i) {
    const el = trackRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
    setActive(i);
  }

  return (
    <>
      <div className="carousel-wrap">
        <div className="carousel-track" ref={trackRef} onScroll={onScroll}>
          {pics.map((src, i) => (
            <div
              key={i}
              className="carousel-slide"
              style={src ? { backgroundImage: `url(${src})` } : undefined}
              onClick={() => src && setLightboxOpen(true)}
            >
              {!src && <div className="thumb-placeholder"><Icon name="image" size={30} /></div>}
            </div>
          ))}
        </div>

        <div className="carousel-overlay-row">
          <div className="carousel-overlay-side">{left}</div>
          <div className="carousel-overlay-side right">{right}</div>
        </div>

        {pics.length > 1 && (
          <div className="carousel-count-badge"><Icon name="camera" size={11} /> {active + 1}/{pics.length}</div>
        )}
      </div>

      {pics.length > 1 && (
        <div className="carousel-thumb-strip">
          {pics.map((src, i) => (
            <button
              type="button"
              key={i}
              className={`carousel-thumb ${i === active ? 'active' : ''}`}
              style={src ? { backgroundImage: `url(${src})` } : undefined}
              onClick={() => goTo(i)}
              aria-label={`View photo ${i + 1}`}
            >
              {!src && <Icon name="image" size={14} />}
            </button>
          ))}
        </div>
      )}

      {lightboxOpen && (
        <div className="lightbox-overlay" onClick={() => setLightboxOpen(false)}>
          <button type="button" className="lightbox-close" onClick={() => setLightboxOpen(false)} aria-label="Close">
            <Icon name="x" size={20} />
          </button>
          <div className="lightbox-track" onClick={(e) => e.stopPropagation()}>
            <img src={pics[active]} alt="" className="lightbox-img" />
          </div>
          {pics.length > 1 && (
            <div className="lightbox-nav">
              <button
                type="button"
                className="icon-btn"
                onClick={(e) => { e.stopPropagation(); setActive((a) => (a - 1 + pics.length) % pics.length); }}
                aria-label="Previous photo"
              ><Icon name="chevronLeft" size={20} /></button>
              <span className="lightbox-count">{active + 1} / {pics.length}</span>
              <button
                type="button"
                className="icon-btn"
                onClick={(e) => { e.stopPropagation(); setActive((a) => (a + 1) % pics.length); }}
                aria-label="Next photo"
              ><Icon name="chevronRight" size={20} /></button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
