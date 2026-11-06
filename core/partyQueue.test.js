import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createParty, joinParty, addSong, playOrder, nextSong, markPlayed, veto, seatLimit,
} from './partyQueue.js';

const host = { id: 'A', name: 'A', purchased: true };
const guest = (id, extra = {}) => ({ id, name: id, purchased: false, ...extra });

function partyOf(...ids) {
  return ids.slice(1).reduce((p, id) => joinParty(p, guest(id)), createParty(host));
}

function add(party, addedBy, n) {
  for (let i = 1; i <= n; i++) {
    party = addSong(party, { id: `${addedBy}${i}`, trackId: `t-${addedBy}${i}`, title: `${addedBy}${i}`, addedBy });
  }
  return party;
}

const titles = (party) => playOrder(party).map((s) => s.title);

test('only a purchaser can start a party', () => {
  assert.throws(() => createParty(guest('X')));
});

test('songs alternate between contributors in join order', () => {
  let p = partyOf('A', 'B', 'C');
  p = add(p, 'C', 2);
  p = add(p, 'A', 2);
  p = add(p, 'B', 1);
  assert.deepEqual(titles(p), ['A1', 'B1', 'C1', 'A2', 'C2']);
});

test('rotation continues from whoever played last', () => {
  let p = add(add(add(partyOf('A', 'B', 'C'), 'A', 2), 'B', 2), 'C', 2);
  p = markPlayed(p, nextSong(p).id); // A1
  p = markPlayed(p, nextSong(p).id); // B1
  assert.deepEqual(titles(p), ['C1', 'A2', 'B2', 'C2']);
});

test('late joiner gets a turn when the rotation reaches them', () => {
  let p = add(add(partyOf('A', 'B'), 'A', 2), 'B', 2);
  p = markPlayed(p, nextSong(p).id); // A1
  p = add(joinParty(p, guest('C')), 'C', 1);
  assert.deepEqual(titles(p), ['B1', 'C1', 'A2', 'B2']);
});

test('song is removed once half or more of members veto it', () => {
  let p = add(partyOf('A', 'B', 'C', 'D'), 'C', 2);
  let r = veto(p, 'C2', 'A');
  assert.equal(r.removed, false);
  r = veto(r.party, 'C2', 'A'); // repeat vote does not count twice
  assert.equal(r.removed, false);
  r = veto(r.party, 'C2', 'B'); // 2 of 4 = 50%
  assert.equal(r.removed, true);
  assert.deepEqual(titles(r.party), ['C1']);
});

test('two of three members can veto the third member\'s song', () => {
  let p = add(partyOf('A', 'B', 'C'), 'C', 1);
  const r = veto(veto(p, 'C1', 'A').party, 'C1', 'B');
  assert.equal(r.removed, true);
});

test('base party seats 5, premium or two purchasers raise it to 20', () => {
  let p = partyOf('A', 'B', 'C', 'D', 'E');
  assert.equal(seatLimit(p), 5);
  assert.throws(() => joinParty(p, guest('F')));
  p = joinParty(p, guest('F', { purchased: true }));
  assert.equal(seatLimit(p), 20);

  const premium = createParty({ id: 'P', name: 'P', purchased: true, premium: true });
  assert.equal(seatLimit(premium), 20);
});
