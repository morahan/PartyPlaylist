import {
  addSong, createParty, joinParty, markPlayed, Member, nextSong, Party, playOrder, seatLimit, veto, voteFinalize,
} from './partyQueue';

const host: Member = { id: 'A', name: 'A', purchased: true };
const guest = (id: string, extra: Partial<Member> = {}): Member => ({ id, name: id, ...extra });

function partyOf(...ids: string[]) {
  return ids.slice(1).reduce((p, id) => joinParty(p, guest(id)), createParty(host));
}

function add(party: Party, addedBy: string, n: number) {
  for (let i = 1; i <= n; i++) {
    party = addSong(party, { id: `${addedBy}${i}`, trackId: `t-${addedBy}${i}`, title: `${addedBy}${i}`, addedBy });
  }
  return party;
}

const titles = (party: Party) => playOrder(party).map((s) => s.title);

test('only a purchaser can start a party', () => {
  expect(() => createParty(guest('X'))).toThrow();
});

test('songs alternate between contributors in join order', () => {
  let p = partyOf('A', 'B', 'C');
  p = add(p, 'C', 2);
  p = add(p, 'A', 2);
  p = add(p, 'B', 1);
  expect(titles(p)).toEqual(['A1', 'B1', 'C1', 'A2', 'C2']);
});

test('rotation continues from whoever played last', () => {
  let p = add(add(add(partyOf('A', 'B', 'C'), 'A', 2), 'B', 2), 'C', 2);
  p = markPlayed(p, nextSong(p)!.id); // A1
  p = markPlayed(p, nextSong(p)!.id); // B1
  expect(titles(p)).toEqual(['C1', 'A2', 'B2', 'C2']);
});

test('late joiner gets a turn when the rotation reaches them', () => {
  let p = add(add(partyOf('A', 'B'), 'A', 2), 'B', 2);
  p = markPlayed(p, nextSong(p)!.id); // A1
  p = add(joinParty(p, guest('C')), 'C', 1);
  expect(titles(p)).toEqual(['B1', 'C1', 'A2', 'B2']);
});

test('song is removed once half or more of members veto it', () => {
  const p = add(partyOf('A', 'B', 'C', 'D'), 'C', 2);
  let r = veto(p, 'C2', 'A');
  expect(r.removed).toBe(false);
  r = veto(r.party, 'C2', 'A'); // repeat vote does not count twice
  expect(r.removed).toBe(false);
  r = veto(r.party, 'C2', 'B'); // 2 of 4 = 50%
  expect(r.removed).toBe(true);
  expect(titles(r.party)).toEqual(['C1']);
});

test("two of three members can veto the third member's song", () => {
  const p = add(partyOf('A', 'B', 'C'), 'C', 1);
  expect(veto(veto(p, 'C1', 'A').party, 'C1', 'B').removed).toBe(true);
});

test('base party seats 5, premium or two purchasers raise it to 20', () => {
  let p = partyOf('A', 'B', 'C', 'D', 'E');
  expect(seatLimit(p)).toBe(5);
  expect(() => joinParty(p, guest('F'))).toThrow();
  p = joinParty(p, guest('F', { purchased: true }));
  expect(seatLimit(p)).toBe(20);

  expect(seatLimit(createParty({ id: 'P', name: 'P', premium: true }))).toBe(20);
});

test('party goes live at 3 queued songs and stays live', () => {
  let p = add(partyOf('A', 'B'), 'A', 2);
  expect(p.live).toBe(false);
  expect(() => voteFinalize(p, 'A')).toThrow();
  p = add(p, 'B', 1);
  expect(p.live).toBe(true);
  p = markPlayed(p, nextSong(p)!.id);
  expect(p.live).toBe(true);
});

test('group vote finalizes the playlist and locks it', () => {
  let p = add(partyOf('A', 'B', 'C', 'D'), 'A', 3);
  p = voteFinalize(p, 'A');
  p = voteFinalize(p, 'A');
  expect(p.finalized).toBe(false);
  p = voteFinalize(p, 'B'); // 2 of 4
  expect(p.finalized).toBe(true);
  expect(() => add(p, 'C', 1)).toThrow('finalized');
  expect(() => veto(p, 'A1', 'C')).toThrow('finalized');
});
