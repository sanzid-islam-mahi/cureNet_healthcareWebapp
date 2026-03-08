import { useEffect, useRef } from 'react';

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
  ).filter((el) => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'));
}

export function useModalAccessibility(onClose: () => void) {
  const modalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return undefined;

    const previousActive = document.activeElement as HTMLElement | null;
    const focusables = getFocusableElements(modal);
    focusables[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;
      const currentFocusables = getFocusableElements(modal);
      if (currentFocusables.length === 0) return;

      const first = currentFocusables[0];
      const last = currentFocusables[currentFocusables.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previousActive?.focus();
    };
  }, [onClose]);

  return modalRef;
}
