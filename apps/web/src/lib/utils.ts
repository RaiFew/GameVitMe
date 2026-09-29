import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// tailwind-merge only knows Tailwind's stock type scale, so it files the custom
// sizes (text-label, text-body, ...) as text *colors* and drops `text-canvas`
// from the Button's primary variant — leaving ink-on-ink, unreadable buttons.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['micro', 'label', 'body', 'title', 'display'] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
