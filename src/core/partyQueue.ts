// Pure party-playlist rules, independent of any music provider or UI.
// The same module is meant to run on the server (source of truth) and on
// devices (offline / optimistic updates).

export type Member = {
  id: string;
  name: string;
  purchased?: boolean; // one-time host unlock
  premium?: boolean; // monthly subscription
};

export type Song = {
  id: string;
  trackId: string;
  title: string;
  addedBy: string;
  vetoes: string[];
};

export type Party = {
  members: Member[]; // join order
  songs: Song[]; // pending, submission order
  lastPlayedBy: string | null;
  live: boolean;
  finalizeVotes: string[];
  finalized: boolean;
};

export const BASE_SEATS = 5;
export const PREMIUM_SEATS = 20;
export const PURCHASERS_FOR_PREMIUM = 2;
export const SONGS_TO_GO_LIVE = 3;

// Vetoes and finalize votes both pass at half or more of current members.
function hasQuorum(votes: number, party: Party) {
  return votes * 2 >= party.members.length;
}

function assertMember(party: Party, memberId: string, action: string) {
  if (!party.members.some((m) => m.id === memberId)) {
    throw new Error(`Only party members can ${action}`);
  }
}

function assertOpen(party: Party) {
  if (party.finalized) throw new Error('Playlist is finalized');
}

export function createParty(host: Member): Party {
  if (!host.purchased && !host.premium) {
    throw new Error('Only a member who purchased the app can start a party');
  }
  return { members: [host], songs: [], lastPlayedBy: null, live: false, finalizeVotes: [], finalized: false };
}

export function seatLimit(party: Party) {
  const purchasers = party.members.filter((m) => m.purchased || m.premium);
  if (party.members.some((m) => m.premium) || purchasers.length >= PURCHASERS_FOR_PREMIUM) {
    return PREMIUM_SEATS;
  }
  return BASE_SEATS;
}

export function joinParty(party: Party, member: Member): Party {
  if (party.members.some((m) => m.id === member.id)) return party;
  // A purchaser joining can raise the limit, so check against the party as it would be.
  const next = { ...party, members: [...party.members, member] };
  if (next.members.length > seatLimit(next)) {
    throw new Error(`Party is full (${seatLimit(party)} seats)`);
  }
  return next;
}

export function addSong(party: Party, song: Omit<Song, 'vetoes'>): Party {
  assertMember(party, song.addedBy, 'add songs');
  assertOpen(party);
  const songs = [...party.songs, { ...song, vetoes: [] }];
  return { ...party, songs, live: party.live || songs.length >= SONGS_TO_GO_LIVE };
}

// Round-robin: starting with the member after whoever played last, take each
// member's oldest pending song in join order, and repeat until all are used.
// Late joiners get a turn when the rotation reaches them; members with no
// pending songs are skipped.
export function playOrder(party: Party): Song[] {
  const pending = new Map<string, Song[]>(party.members.map((m) => [m.id, []]));
  for (const song of party.songs) pending.get(song.addedBy)?.push(song);

  const ids = party.members.map((m) => m.id);
  const start = party.lastPlayedBy === null ? 0 : (ids.indexOf(party.lastPlayedBy) + 1) % ids.length;
  const rotation = [...ids.slice(start), ...ids.slice(0, start)];

  const order: Song[] = [];
  while (order.length < party.songs.length) {
    for (const id of rotation) {
      const song = pending.get(id)!.shift();
      if (song) order.push(song);
    }
  }
  return order;
}

export function nextSong(party: Party): Song | null {
  return playOrder(party)[0] ?? null;
}

export function markPlayed(party: Party, songId: string): Party {
  const song = party.songs.find((s) => s.id === songId);
  if (!song) return party;
  return {
    ...party,
    songs: party.songs.filter((s) => s.id !== songId),
    lastPlayedBy: song.addedBy,
  };
}

// Each member can veto a song once; the song is removed at quorum.
export function veto(party: Party, songId: string, memberId: string) {
  assertMember(party, memberId, 'veto');
  assertOpen(party);
  const songs: Song[] = [];
  let removed = false;
  for (const song of party.songs) {
    if (song.id !== songId) {
      songs.push(song);
      continue;
    }
    const vetoes = song.vetoes.includes(memberId) ? song.vetoes : [...song.vetoes, memberId];
    if (hasQuorum(vetoes.length, party)) {
      removed = true;
    } else {
      songs.push({ ...song, vetoes });
    }
  }
  return { party: { ...party, songs }, removed };
}

// Once live, members vote to finalize; at quorum the playlist locks for download.
export function voteFinalize(party: Party, memberId: string): Party {
  assertMember(party, memberId, 'vote to finalize');
  if (!party.live) throw new Error(`Add at least ${SONGS_TO_GO_LIVE} songs before finalizing`);
  if (party.finalized || party.finalizeVotes.includes(memberId)) return party;
  const finalizeVotes = [...party.finalizeVotes, memberId];
  return { ...party, finalizeVotes, finalized: hasQuorum(finalizeVotes.length, party) };
}
