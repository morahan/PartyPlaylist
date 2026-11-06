import type { PGlite } from '@electric-sql/pglite';
import { as, createDb, createUser, grant, uuid } from './db';

let db: PGlite;

beforeEach(async () => {
  db = await createDb();
  for (const id of ['A', 'B', 'C', 'D', 'E', 'F', 'G']) await createUser(db, id);
  await grant(db, 'A', 'purchased');
});

afterEach(() => db.close());

async function startParty(host = 'A') {
  return as(db, host, async (tx) => {
    const { rows } = await tx.query<{ id: string; join_code: string }>(
      'insert into public.parties (host_id) values ($1) returning id, join_code',
      [uuid(host)],
    );
    return rows[0];
  });
}

async function join(id: string, code: string) {
  return as(db, id, (tx) => tx.query('select public.join_party($1)', [code]));
}

async function addSong(id: string, party: string, title: string) {
  return as(db, id, async (tx) => {
    const { rows } = await tx.query<{ id: string }>(
      `insert into public.songs (party_id, added_by, title, artist, source_service)
       values ($1, $2, $3, 'Artist', 'apple_music') returning id`,
      [party, uuid(id), title],
    );
    return rows[0].id;
  });
}

async function status(party: string) {
  const { rows } = await db.query<{ status: string }>('select status from public.parties where id = $1', [party]);
  return rows[0].status;
}

async function songStatus(song: string) {
  const { rows } = await db.query<{ status: string }>('select status from public.songs where id = $1', [song]);
  return rows[0].status;
}

test('new users get a profile named from sign-up metadata', async () => {
  const { rows } = await db.query<{ display_name: string }>('select display_name from public.profiles where id = $1', [uuid('B')]);
  expect(rows[0].display_name).toBe('B');
});

test('only purchasers can start a party, and the host joins it', async () => {
  await expect(startParty('B')).rejects.toThrow('purchased');
  const party = await startParty('A');
  expect(party.join_code).toMatch(/^[0-9A-F]{6}$/);
  const { rows } = await db.query('select 1 from public.party_members where party_id = $1 and user_id = $2', [party.id, uuid('A')]);
  expect(rows).toHaveLength(1);
});

test('users cannot grant themselves entitlements', async () => {
  await expect(
    as(db, 'B', (tx) => tx.query('update public.profiles set purchased = true where id = $1', [uuid('B')])),
  ).rejects.toThrow('permission denied');
  await as(db, 'B', (tx) => tx.query("update public.profiles set display_name = 'Bee' where id = $1", [uuid('B')]));
});

test('non-members cannot see a party or its songs', async () => {
  const party = await startParty();
  await addSong('A', party.id, 'A1');
  const seen = await as(db, 'B', async (tx) => ({
    parties: (await tx.query('select * from public.parties')).rows.length,
    songs: (await tx.query('select * from public.songs')).rows.length,
  }));
  expect(seen).toEqual({ parties: 0, songs: 0 });
  await expect(addSong('B', party.id, 'B1')).rejects.toThrow('Only party members');
});

test('five seats by default; a second purchaser raises it to twenty', async () => {
  const party = await startParty();
  for (const id of ['B', 'C', 'D', 'E']) await join(id, party.join_code);
  await expect(join('F', party.join_code)).rejects.toThrow('Party is full');

  await grant(db, 'F', 'purchased');
  await join('F', party.join_code);
  await join('G', party.join_code);
  const { rows } = await db.query('select * from public.party_members where party_id = $1', [party.id]);
  expect(rows).toHaveLength(7);
});

test('party goes live once three songs are queued', async () => {
  const party = await startParty();
  await join('B', party.join_code);
  await addSong('A', party.id, 'A1');
  await addSong('B', party.id, 'B1');
  expect(await status(party.id)).toBe('gathering');
  await addSong('A', party.id, 'A2');
  expect(await status(party.id)).toBe('live');
});

test('half or more of members veto a song out, once each', async () => {
  const party = await startParty();
  for (const id of ['B', 'C', 'D']) await join(id, party.join_code);
  const song = await addSong('C', party.id, 'C1');
  const veto = (id: string) =>
    as(db, id, (tx) => tx.query('insert into public.song_vetoes (song_id, user_id) values ($1, $2)', [song, uuid(id)]));

  await veto('A');
  await expect(veto('A')).rejects.toThrow();
  expect(await songStatus(song)).toBe('queued');
  await veto('B'); // 2 of 4
  expect(await songStatus(song)).toBe('vetoed');
});

test('group vote finalizes the playlist and locks it', async () => {
  const party = await startParty();
  for (const id of ['B', 'C', 'D']) await join(id, party.join_code);
  const vote = (id: string) =>
    as(db, id, (tx) => tx.query('insert into public.finalize_votes (party_id, user_id) values ($1, $2)', [party.id, uuid(id)]));

  await expect(vote('A')).rejects.toThrow('at least 3 songs');
  for (const t of ['A1', 'A2', 'A3']) await addSong('A', party.id, t);
  await vote('A');
  expect(await status(party.id)).toBe('live');
  await vote('B');
  expect(await status(party.id)).toBe('finalized');
  await expect(addSong('C', party.id, 'C1')).rejects.toThrow('finalized');
});

test('only the host marks songs played, which advances the rotation', async () => {
  const party = await startParty();
  await join('B', party.join_code);
  const song = await addSong('B', party.id, 'B1');
  await expect(as(db, 'B', (tx) => tx.query('select public.mark_played($1)', [song]))).rejects.toThrow('Only the host');
  await as(db, 'A', (tx) => tx.query('select public.mark_played($1)', [song]));
  expect(await songStatus(song)).toBe('played');
  const { rows } = await db.query<{ last_played_by: string }>('select last_played_by from public.parties where id = $1', [party.id]);
  expect(rows[0].last_played_by).toBe(uuid('B'));
});
