// 시안의 인라인 스트로크 아이콘
const S = (p) => ({ 'aria-hidden': true, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round', ...p })

export const IconHanger = ({ on, size = 30 }) => (
  <svg {...S({ width: size, height: size, strokeWidth: on ? 2.2 : 1.8 })}><path d="M12 8V7a2 2 0 1 0-2-2" /><path d="M12 8l9 7a1.5 1.5 0 0 1-1 3H4a1.5 1.5 0 0 1-1-3z" /></svg>
)
export const IconPlus = ({ size = 30, w = 2 }) => (
  <svg {...S({ width: size, height: size, strokeWidth: w })}><path d="M12 5v14M5 12h14" /></svg>
)
export const IconBoards = ({ on, size = 28 }) => (
  <svg {...S({ width: size, height: size, strokeWidth: on ? 2.2 : 1.8 })}><rect x="3" y="3" width="8" height="11" rx="2" /><rect x="13" y="3" width="8" height="7" rx="2" /><rect x="3" y="16" width="8" height="5" rx="2" /><rect x="13" y="12" width="8" height="9" rx="2" /></svg>
)
export const IconClose = ({ size = 26, w = 2.2 }) => (
  <svg {...S({ width: size, height: size, strokeWidth: w })}><path d="M6 6l12 12M18 6L6 18" /></svg>
)
export const IconBack = ({ size = 26 }) => (
  <svg {...S({ width: size, height: size, strokeWidth: 2.2 })}><path d="M15 6l-6 6 6 6" /></svg>
)
export const IconMore = ({ size = 20 }) => (
  <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>
)
export const IconChevronDown = ({ size = 20 }) => (
  <svg {...S({ width: size, height: size, strokeWidth: 2.4 })}><path d="M6 9l6 6 6-6" /></svg>
)
export const IconDownload = ({ size = 24 }) => (
  <svg {...S({ width: size, height: size, strokeWidth: 2.2 })}><path d="M12 4v11" /><path d="M7 11l5 5 5-5" /><path d="M5 20h14" /></svg>
)
export const IconUndo = ({ size = 22, w = 2.2 }) => (
  <svg {...S({ width: size, height: size, strokeWidth: w })}><path d="M9 7L4 12l5 5" /><path d="M4 12h11a5 5 0 0 1 5 5v1" /></svg>
)
export const IconRedo = ({ size = 22 }) => (
  <svg {...S({ width: size, height: size, strokeWidth: 2.2 })}><path d="M15 7l5 5-5 5" /><path d="M20 12H9a5 5 0 0 0-5 5v1" /></svg>
)
export const IconPhoto = ({ size = 26 }) => (
  <svg {...S({ width: size, height: size, strokeWidth: 1.8 })} style={{ flexShrink: 0 }}><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="2" /><path d="M21 16l-5-5-8 8" /></svg>
)
export const IconRotate = () => (
  <svg {...S({ width: 15, height: 15, strokeWidth: 2.6 })}><path d="M20 12a8 8 0 1 1-2.5-5.8" /><path d="M20 3v5h-5" /></svg>
)
export const IconResize = () => (
  <svg {...S({ width: 14, height: 14, strokeWidth: 2.8 })}><path d="M9 9L19 19" /><path d="M5 11V5h6" /><path d="M19 13v6h-6" /><path d="M5 5l4 4" /></svg>
)
export const IconCheck = ({ color }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>
)
export const IconSettings = ({ size = 24 }) => (
  <svg {...S({ width: size, height: size, strokeWidth: 1.9 })}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
)
