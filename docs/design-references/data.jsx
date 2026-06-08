// data.jsx — mock domain data for the prototype

const PLAYERS = {
  you:    { name: 'Tomás Ríos', skill: 'B', trust: 4.7, you: true },
  m1:     { name: 'Lucía Vega', skill: 'A', trust: 4.9 },
  m2:     { name: 'Diego Sosa', skill: 'B', trust: 4.6 },
  m3:     { name: 'Martín Paz', skill: 'B', trust: 4.8 },
  m4:     { name: 'Sofía Cruz', skill: 'A', trust: 5.0 },
  m5:     { name: 'Nico Bauer', skill: 'C', trust: 4.3 },
  m6:     { name: 'Ana Roldán', skill: 'B', trust: 4.5 },
  m7:     { name: 'Iván Mora', skill: 'C', trust: 4.1 },
  m8:     { name: 'Pau Lemos', skill: 'A', trust: 4.8 },
};

const MATCHES = [
  {
    id: 'mx1', club: 'Club Norte · Cancha 3', dist: 1.2, when: 'Today', time: '19:30',
    dur: 90, skill: 'B', filled: 3, total: 4, price: 12, surface: 'Glass court',
    players: [PLAYERS.m1, PLAYERS.m2, PLAYERS.m3], host: 'Lucía Vega',
    note: 'Competitive doubles, looking for one solid B player to close the 4th.',
  },
  {
    id: 'mx2', club: 'Padel District · Court A', dist: 2.8, when: 'Today', time: '21:00',
    dur: 60, skill: 'C', filled: 2, total: 4, price: 9, surface: 'Panoramic',
    players: [PLAYERS.m5, PLAYERS.m7], host: 'Nico Bauer',
    note: 'Casual rally night — all intermediate levels welcome.',
  },
  {
    id: 'mx3', club: 'Riverside Padel · Cancha 1', dist: 0.6, when: 'Tomorrow', time: '08:00',
    dur: 90, skill: 'A', filled: 3, total: 4, price: 14, surface: 'Glass court',
    players: [PLAYERS.m4, PLAYERS.m8, PLAYERS.m1], host: 'Sofía Cruz',
    note: 'Early high-tempo session. Pro level only, bring your A game.',
  },
  {
    id: 'mx4', club: 'Club Norte · Cancha 1', dist: 1.2, when: 'Tomorrow', time: '20:30',
    dur: 90, skill: 'B', filled: 1, total: 4, price: 12, surface: 'Glass court',
    players: [PLAYERS.m6], host: 'Ana Roldán',
    note: 'Building a friendly doubles group for weekday evenings.',
  },
  {
    id: 'mx5', club: 'Sunset Sports · Court 2', dist: 4.4, when: 'Sat', time: '10:00',
    dur: 120, skill: 'B', filled: 3, total: 4, price: 16, surface: 'Premium',
    players: [PLAYERS.m2, PLAYERS.m3, PLAYERS.m6], host: 'Diego Sosa',
    note: 'Weekend long-format match, 2h court booked. One spot left.',
  },
];

// "My matches" — upcoming + history for the Matches tab
const MY_MATCHES = [
  { id: 'my1', state: 'confirmed', club: 'Club Norte · Cancha 3', when: 'Today', time: '19:30', filled: 4, total: 4, skill: 'B' },
  { id: 'my2', state: 'pending',   club: 'Riverside Padel · Cancha 1', when: 'Tomorrow', time: '08:00', filled: 4, total: 4, skill: 'A' },
  { id: 'my3', state: 'completed', club: 'Padel District · Court A', when: 'Jun 2', time: '21:00', result: 'W', score: '6–3 · 6–4', skill: 'B' },
  { id: 'my4', state: 'completed', club: 'Sunset Sports · Court 2', when: 'May 28', time: '10:00', result: 'L', score: '4–6 · 6–7', skill: 'B' },
];

// Live tournament bracket — 8-player single elimination
const TOURNEY = {
  name: 'City Circuit · Night Cup',
  venue: 'Padel District',
  status: 'live',
  date: 'Jun 7',
  rounds: [
    {
      name: 'Quarterfinals',
      matches: [
        { id: 'q1', a: { n: 'Vega / Cruz', s: 'A' },   b: { n: 'Sosa / Paz', s: 'B' },   sa: [6,6], sb: [3,4], done: true, w: 'a' },
        { id: 'q2', a: { n: 'Bauer / Mora', s: 'C' },  b: { n: 'Lemos / Roldán', s: 'A' }, sa: [4,2], sb: [6,6], done: true, w: 'b' },
        { id: 'q3', a: { n: 'Ríos / Bauer', s: 'B' },  b: { n: 'Cruz / Paz', s: 'B' },   sa: [6,3], sb: [4,4], live: true, set: 2, game: '40–30' },
        { id: 'q4', a: { n: 'Vega / Sosa', s: 'A' },   b: { n: 'Lemos / Mora', s: 'B' },  sa: [], sb: [], next: '21:15' },
      ],
    },
    {
      name: 'Semifinals',
      matches: [
        { id: 's1', a: { n: 'Vega / Cruz', s: 'A' }, b: { n: 'Lemos / Roldán', s: 'A' }, sa: [], sb: [], next: '21:40' },
        { id: 's2', a: { n: 'TBD', s: '' },          b: { n: 'TBD', s: '' },             sa: [], sb: [], next: '22:05', tbd: true },
      ],
    },
    {
      name: 'Final',
      matches: [
        { id: 'f1', a: { n: 'TBD', s: '' }, b: { n: 'TBD', s: '' }, sa: [], sb: [], next: '22:40', tbd: true },
      ],
    },
  ],
};

Object.assign(window, { PLAYERS, MATCHES, MY_MATCHES, TOURNEY });
