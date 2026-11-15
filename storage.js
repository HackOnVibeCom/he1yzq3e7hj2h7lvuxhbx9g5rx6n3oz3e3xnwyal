// The one place that knows where rooms are stored.
//
// Two backends behind the same room API:
//   - Supabase, when config.js carries a key. This is what the deployed site uses,
//     because HackOnVibe serves static files and has no server of its own.
//   - The local Node server in server.js, used by `npm run dev` on localhost or when no key is set.
//
// Everything else in the app goes through createRoom / readRoom / submitAnswers
// and never learns which one is in play.

import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const usingSupabase = !['localhost', '127.0.0.1', '[::1]'].includes(location.hostname) && Boolean(SUPABASE_ANON_KEY) && /^https:\/\/[a-z0-9]+\.supabase\.co$/.test(SUPABASE_URL);

async function rpc(name, args) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify(args)
  });
  if (!response.ok) throw new Error(`${name} ${response.status}`);
  return response.json();
}

async function local(path, method = 'GET', body, token) {
  const response = await fetch('/api/rooms' + path, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Player-Token': token ?? '' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  if (!response.ok) throw new Error(String(response.status));
  return response.json();
}

/** Open a new room. Resolves to its 24-character id. */
export async function createRoom() {
  if (!usingSupabase) return (await local('', 'POST')).id;
  const id = await rpc('create_room', {});
  if (typeof id !== 'string' || !/^[a-f0-9]{24}$/.test(id)) throw new Error('create_room returned no id');
  return id;
}

/** Reserve a seat when someone starts the quiz. */
export async function joinRoom(roomId, token) {
  if (!usingSupabase) return local('/' + roomId + '/join', 'POST', undefined, token);
  return rpc('join_room', { p_room: roomId, p_token: token });
}

/** The room service returns comparisons to submitted players once two answers are in. */
export async function readRoom(roomId, token) {
  if (!usingSupabase) return local('/' + roomId, 'GET', undefined, token);
  const room = await rpc('read_room', { p_room: roomId, p_token: token ?? '' });
  if (!room) throw new Error('404');
  if (typeof room.joined !== 'number') throw new Error('Room schema needs updating');
  return room;
}

/** Record this player's answers. Submitting twice with the same token is a no-op. */
export async function submitAnswers(roomId, entry) {
  if (!usingSupabase) return local('/' + roomId, 'POST', entry);
  return rpc('submit_answers', {
    p_room: roomId,
    p_nickname: entry.nickname,
    p_answers: entry.answers,
    p_token: entry.token,
    p_avatar: entry.avatar ?? 0
  });
}

/** Example ad reward: one more seat in a full round. Not a real ad network. */
export function unlockExampleSpot(roomId, token, attempt) {
  if (!usingSupabase) return local('/' + roomId + '/example-reward', 'POST', { attempt }, token);
  return rpc('unlock_example_spot', { p_room: roomId, p_token: token, p_attempt: attempt });
}

/** A QR image for the recap link, drawn in the browser. */
export async function qrDataUrl(link) {
  const { toDataURL } = await import('./vendor/qrcode.esm.js');
  return toDataURL(link, { margin: 4, scale: 7, errorCorrectionLevel: 'M' });
}
