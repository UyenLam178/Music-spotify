const base = { width: "1em", height: "1em", viewBox: "0 0 24 24", fill: "currentColor" };

export const IconHome = (p) => (
  <svg {...base} {...p}>
    <path d="M12.5 3.5a1 1 0 0 0-1 0L3 9.6V21a1 1 0 0 0 1 1h5.5v-6.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V22H20a1 1 0 0 0 1-1V9.6z" />
  </svg>
);
export const IconSearch = (p) => (
  <svg {...base} {...p}>
    <path d="M10.5 3a7.5 7.5 0 1 0 4.65 13.4l5 5 1.4-1.4-5-5A7.5 7.5 0 0 0 10.5 3m0 2a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11" />
  </svg>
);
export const IconLibrary = (p) => (
  <svg {...base} {...p}>
    <path d="M3 22V2h4v20zm7 0V2h4v20zM17 2v20l4-2V4z" />
  </svg>
);
export const IconPlus = (p) => (
  <svg {...base} {...p}>
    <path d="M12 3a1 1 0 0 1 1 1v7h7a1 1 0 1 1 0 2h-7v7a1 1 0 1 1-2 0v-7H4a1 1 0 1 1 0-2h7V4a1 1 0 0 1 1-1" />
  </svg>
);
export const IconPlay = (p) => (
  <svg {...base} {...p}>
    <path d="M7 4.5v15l13-7.5z" />
  </svg>
);
export const IconPause = (p) => (
  <svg {...base} {...p}>
    <path d="M6 4h4v16H6zm8 0h4v16h-4z" />
  </svg>
);
export const IconSkipNext = (p) => (
  <svg {...base} {...p}>
    <path d="M6 5v14l10-7zM18 5h2v14h-2z" />
  </svg>
);
export const IconSkipPrev = (p) => (
  <svg {...base} {...p}>
    <path d="M18 5v14L8 12zM4 5h2v14H4z" />
  </svg>
);
export const IconShuffle = (p) => (
  <svg {...base} {...p}>
    <path d="M17 3l4 4-4 4v-3h-3.6l-3 3L7 7.6 9.6 5H14V3zm0 18l4-4-4-4v3h-4.4l-3 3L7 16.6 9.6 14H14v3z" />
  </svg>
);
export const IconRepeat = (p) => (
  <svg {...base} {...p}>
    <path d="M7 7h10v3l4-4-4-4v3H5v6h2zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2z" />
  </svg>
);
export const IconVolume = (p) => (
  <svg {...base} {...p}>
    <path d="M3 9v6h4l5 5V4L7 9zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4M14 3.2v2.06a7 7 0 0 1 0 13.48v2.06a9 9 0 0 0 0-17.6" />
  </svg>
);
export const IconVolumeMute = (p) => (
  <svg {...base} {...p}>
    <path d="M3 9v6h4l5 5V4L7 9zm14.7-2.3-1.4-1.4L14 7.6 11.7 5.3l-1.4 1.4L12.6 9 10.3 11.3l1.4 1.4L14 10.4l2.3 2.3 1.4-1.4L15.4 9z" />
  </svg>
);
export const IconHeart = ({ filled, ...p }) => (
  <svg {...base} {...p} fill={filled ? "var(--color-green)" : "none"} stroke="currentColor" strokeWidth={filled ? 0 : 2}>
    <path d="M12 21s-7.5-4.6-10-9.3C.5 8 2 4.5 5.5 4c2-.3 3.7.7 4.5 2.2C10.8 4.7 12.5 3.7 14.5 4c3.5.5 5 4 3.5 7.7C15.5 16.4 12 21 12 21" />
  </svg>
);
export const IconMore = (p) => (
  <svg {...base} {...p}>
    <path d="M6 10a2 2 0 1 1 0 4 2 2 0 0 1 0-4m6 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4m6 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4" />
  </svg>
);
export const IconClock = (p) => (
  <svg {...base} {...p}>
    <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20m1 10.4 4 2.4-.8 1.3-4.7-2.8V6h1.5z" />
  </svg>
);
export const IconUser = (p) => (
  <svg {...base} {...p}>
    <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10m0 2c-4.4 0-9 2.2-9 5v3h18v-3c0-2.8-4.6-5-9-5" />
  </svg>
);
export const IconLogout = (p) => (
  <svg {...base} {...p}>
    <path d="M10 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1h-8v-2h7V5h-7zm-.3 14.3L4.4 12l5.3-5.3 1.4 1.4L8.8 11H16v2H8.8l2.3 2.9z" />
  </svg>
);
export const IconChevronDown = (p) => (
  <svg {...base} {...p}>
    <path d="M7 10l5 5 5-5z" />
  </svg>
);
export const IconX = (p) => (
  <svg {...base} {...p}>
    <path d="M6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12 19 6.4 17.6 5 12 10.6z" />
  </svg>
);
