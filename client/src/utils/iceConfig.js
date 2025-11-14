// Fetch and cache ICE servers (STUN+TURN) from the backend, with STUN fallback
let cached;

export async function getIceServers() {
  if (cached) return cached;
  const fallback = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  const serverUrl = (process.env.REACT_APP_SERVER_URL || '').replace(/\/$/, '');
  const base = serverUrl || window.location.origin.replace(/\/$/, '');
  const endpoint = `${base}/api/ice-servers`;

  try {
    const res = await fetch(endpoint, { credentials: 'omit' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data && Array.isArray(data.iceServers) && data.iceServers.length) {
      cached = data.iceServers;
      return cached;
    }
  } catch (e) {
    console.warn('Using STUN fallback for ICE servers:', e.message);
  }

  cached = fallback;
  return cached;
}

export function clearIceServersCache() {
  cached = undefined;
}
