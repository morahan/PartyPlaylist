// Pure party-playlist rules, independent of any music provider or UI.
// The same module is meant to run on the server (source of truth) and on
// devices (offline / optimistic updates).
//
// Party shape:
// {
//   members: [{ id, name, purchased: bool, premium: bool }],  // join order
//   songs:   [{ id, trackId, title, addedBy, vetoes: [memberId] }], // pending, submission order
//   lastPlayedBy: memberId | null,
// }

export const BASE_SEATS = 5;
export const PREMIUM_SEATS = 20;
export const PURCHASERS_FOR_PREMIUM = 2;

export function createParty(host) {
  if (!host.purchased && !host.premium) {
    throw new Error('Only a member who purchased the app can start a party');
  }
  return { members: [host], songs: [], lastPlayedBy: null };
}

export function seatLimit(party) {
  const purchasers = party.members.filter((m) => m.purchased || m.premium);
  if (party.members.some((m) => m.premium) || purchasers.length >= PURCHASERS_FOR_PREMIUM) {
    return PREMIUM_SEATS;
  }
  return BASE_SEATS;
}

export function joinParty(party, member) {
  if (party.members.some((m) => m.id === member.id)) return party;
  // A purchaser joining can raise the limit, so check against the party as it would be.
  const next = { ...party, members: [...party.members, member] };
  if (next.members.length > seatLimit(next)) {
    throw new Error(`Party is full (${seatLimit(party)} seats)`);
  }
  return next;
}

export function addSong(party, song) {
  if (!party.members.some((m) => m.id === song.addedBy)) {
    throw new Error('Only party members can add songs');
  }
  return { ...party, songs: [...party.songs, { ...song, vetoes: [] }] };
}

// Round-robin: starting with the member after whoever played last, take each
// member's oldest pending song in join order, and repeat until all are used.
// Late joiners get a turn when the rotation reaches them; members with no
// pending songs are skipped.
export function playOrder(party) {
  const pending = new Map(party.members.map((m) => [m.id, []]));
  for (const song of party.songs) pending.get(song.addedBy)?.push(song);

  const ids = party.members.map((m) => m.id);
  const start = (ids.indexOf(party.lastPlayedBy) + 1) % ids.length;
  const rotation = [...ids.slice(start), ...ids.slice(0, start)];

  const order = [];
  while (order.length < party.songs.length) {
    for (const id of rotation) {
      const song = pending.get(id).shift();
      if (song) order.push(song);
    }
  }
  return order;
}

export function nextSong(party) {
  return playOrder(party)[0] ?? null;
}

export function markPlayed(party, songId) {
  const song = party.songs.find((s) => s.id === songId);
  if (!song) return party;
  return {
    ...party,
    songs: party.songs.filter((s) => s.id !== songId),
    lastPlayedBy: song.addedBy,
  };
}

// A song is removed once at least half of the current members veto it.
// Vetoes are idempotent per member.
export function veto(party, songId, memberId) {
  if (!party.members.some((m) => m.id === memberId)) {
    throw new Error('Only party members can veto');
  }
  const songs = [];
  let removed = false;
  for (const song of party.songs) {
    if (song.id !== songId) {
      songs.push(song);
      continue;
    }
    const vetoes = song.vetoes.includes(memberId) ? song.vetoes : [...song.vetoes, memberId];
    if (vetoes.length * 2 >= party.members.length) {
      removed = true;
    } else {
      songs.push({ ...song, vetoes });
    }
  }
  return { party: { ...party, songs }, removed };
}
