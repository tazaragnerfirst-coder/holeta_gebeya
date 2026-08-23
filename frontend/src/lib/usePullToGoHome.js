import { useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// Telegram's native "swipe down closes the Mini App" gesture is
// turned off (see initTelegramApp/disableVerticalSwipes) so pages
// don't get yanked shut by an ordinary scroll. This hook gives that
// gesture back its usual meaning within the app: pulling down from
// the very top of the page slides it away and drops the user on
// Home, instead of doing nothing or closing Telegram outright.
//
// Returns a callback ref (not a plain useRef) so the listeners
// attach the instant the element actually mounts — this page's
// element only exists once its data has loaded (an earlier skeleton
// render has no element yet), and a callback ref is the reliable way
// to catch that regardless of when it happens.
const TRIGGER_PX = 90;

export default function usePullToGoHome() {
  const navigate = useNavigate();
  const cleanupRef = useRef(null);

  return useCallback((el) => {
    if (cleanupRef.current) { cleanupRef.current(); cleanupRef.current = null; }
    if (!el) return;

    let startY = null;
    let dragging = false;

    function onTouchStart(e) {
      if (window.scrollY > 0) { startY = null; return; }
      startY = e.touches[0].clientY;
      dragging = false;
    }
    function onTouchMove(e) {
      if (startY == null) return;
      const dy = e.touches[0].clientY - startY;
      if (dy <= 0) { el.style.transform = ''; el.style.opacity = ''; return; }
      dragging = true;
      const pull = Math.min(dy, TRIGGER_PX * 1.6);
      el.style.transform = `translateY(${pull * 0.55}px)`;
      el.style.opacity = String(1 - pull / (TRIGGER_PX * 3));
    }
    function onTouchEnd(e) {
      if (!dragging) { startY = null; return; }
      const dy = (e.changedTouches?.[0]?.clientY ?? 0) - (startY ?? 0);
      el.style.transition = 'transform .2s ease, opacity .2s ease';
      if (dy > TRIGGER_PX) {
        el.style.transform = `translateY(${window.innerHeight}px)`;
        el.style.opacity = '0';
        setTimeout(() => navigate('/'), 180);
      } else {
        el.style.transform = '';
        el.style.opacity = '';
      }
      setTimeout(() => { el.style.transition = ''; }, 220);
      startY = null;
      dragging = false;
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    cleanupRef.current = () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [navigate]);
}
