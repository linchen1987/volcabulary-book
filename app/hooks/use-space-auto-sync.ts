import { STORAGE_KEYS } from '~/lib/constants';

export function getSpaceAutoSync(spaceId: string): boolean {
  if (typeof window === 'undefined') return true;
  const key = STORAGE_KEYS.SPACE_AUTO_SYNC_PREFIX + spaceId;
  const value = localStorage.getItem(key);
  return value !== 'false';
}

export function setSpaceAutoSync(spaceId: string, value: boolean): void {
  if (typeof window === 'undefined') return;
  const key = STORAGE_KEYS.SPACE_AUTO_SYNC_PREFIX + spaceId;
  localStorage.setItem(key, String(value));
}

export function useSpaceAutoSync(spaceId: string): boolean {
  return getSpaceAutoSync(spaceId);
}
