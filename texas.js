/**
 * Texas Hold'em hand evaluator for [Node.js](http://nodejs.org/).
 */

'use strict';

// *Dependency*: [Lodash](https://lodash.com/).
import _ from 'lodash';
import {randomBytes} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {unzipSync} from 'node:zlib';

// ## Definitions

// Standard deck size.
const DECK_SIZE = 52;

// Card abbreviations.
const CHARS = '23456789TJQKAc♣d♦h♥s♠';
const ABBR = _.zipObject(CHARS, _.range(CHARS.length));

// Card ranks.
const RANKS = [
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Jack',
  'Queen',
  'King',
  'Ace',
];

// Card suits.
const SUITS = ['Clubs', 'Diamonds', 'Hearts', 'Spades'];

// Types of hand.
const HANDS = [
  'Invalid',
  'High Card',
  'One Pair',
  'Two Pairs',
  'Three of a Kind',
  'Straight',
  'Flush',
  'Full House',
  'Four of a Kind',
  'Straight Flush',
];

// Loads the look-up table.
const compressedBuffer = readFileSync('./HandRanks.dat.gz');
const buffer = unzipSync(compressedBuffer);
const evaluator = new Int32Array(
  buffer.buffer,
  buffer.byteOffset,
  buffer.byteLength / Int32Array.BYTES_PER_ELEMENT,
);

// ## Internal Functions

// Parses the formatted card to get its numeric code.
const getCode = card => {
  if (typeof card == 'number')
    return card >= 1 && card <= DECK_SIZE ? card : undefined; // Already codified
  if (typeof card != 'string' || card.length != 2) {
    return undefined; // Invalid input
  }
  const posRank = ABBR[card[0]];
  const posSuit = (ABBR[card[1]] - RANKS.length) >> 1;
  if (typeof posRank != 'number' || posRank >= RANKS.length || posSuit < 0)
    return undefined; // Invalid characters
  return posRank * SUITS.length + posSuit + 1;
};

// Helper function to create card formatters.
const filter = format => {
  return card => {
    card = getCode(card);
    if (!card) {
      return undefined;
    }
    card--;
    return format({rank: card >> 2, suit: card & 3});
  };
};

// ## Main Functions

export function deck(format) {
  const res = _.range(1, DECK_SIZE + 1);
  const buffer = randomBytes(DECK_SIZE << 2);
  for (let pos = res.length - 1; pos > 0; pos--) {
    const rand = buffer.readUInt32LE(pos << 2) % (pos + 1);
    let temp = res[pos];
    res[pos] = res[rand];
    res[rand] = temp;
  }
  return format ? map(res, format) : res;
}

export function evaluate(cards) {
  let res = DECK_SIZE + 1;
  for (let c = 0; c < cards.length; c++)
    res = evaluator[res + getCode(cards[c])];
  if (cards.length < 7) {
    res = evaluator[res];
  }
  return {name: HANDS[res >> 12], value: res};
}

export function sort(cards) {
  return _.sortBy(cards, getCode);
}

export function odds(hands, table, dead) {
  // Preprocesses the input data.
  table = table ? _.map(table, getCode) : [];
  dead = dead ? _.map(dead, getCode) : [];
  hands = _.map(hands, hand => {
    return _.map(hand, getCode);
  });
  let res = DECK_SIZE + 1;
  for (let c = 0; c < table.length; c++) {
    res = evaluator[res + table[c]];
  }
  const deck = _.chain(_.range(1, DECK_SIZE + 1))
    .difference(table)
    .difference(_.flatten(hands))
    .difference(dead)
    .value();
  const player = _.map(hands, hand => {
    return evaluator[evaluator[res + hand[0]] + hand[1]];
  });
  const combinations = (n, k, res, callback) => {
    if (k <= 0) {
      callback(res);
    } else {
      while (n < deck.length) {
        const parcial = evaluator[res + deck[n++]];
        combinations(n, k - 1, parcial, callback);
      }
    }
  };

  // Calculates the outcome of each play.
  const remaining = 5 - table.length;
  let plays = deck.length / remaining;
  for (let c = 1; c < remaining; c++) {
    plays *= (deck.length - c) / c;
  }
  const values = new Array(hands.length);
  for (let p = 0; p < hands.length; p++) {
    let s = 0;
    values[p] = new Int32Array(plays);
    combinations(0, remaining, player[p], res => {
      values[p][s++] = res;
    });
  }

  // Determines the results.
  const wins = new Int32Array(hands.length);
  const splits = new Int32Array(hands.length);
  for (let s = 0; s < plays; s++) {
    let winner = [0];
    for (let p = 1; p < hands.length; p++) {
      if (values[p][s] > values[winner[0]][s]) {
        winner = [p];
      } else if (values[p][s] == values[winner[0]][s]) {
        winner.push(p);
      }
    }
    if (winner.length == 1) {
      wins[winner[0]]++;
    } else {
      for (let p = 0; p < winner.length; p++) {
        splits[winner[p]]++;
      }
    }
  }

  // Formats odds output.
  const odds = [];
  for (let p = 0; p < hands.length; p++) {
    odds[p] = {win: wins[p] / plays, split: splits[p] / plays};
  }
  return odds;
}

export const extended = filter(card => {
  return RANKS[card.rank] + ' of ' + SUITS[card.suit];
});

export const abbr = filter(card => {
  return CHARS[card.rank] + CHARS[(card.suit << 1) + RANKS.length];
});

export const unicode = filter(card => {
  return CHARS[card.rank] + CHARS[(card.suit << 1) + RANKS.length + 1];
});

export const code = getCode;

export function benchmark() {
  const freq = new Int32Array(HANDS.length);
  const start = Date.now();
  for (let c1 = 1; c1 <= DECK_SIZE; c1++) {
    const r1 = evaluator[DECK_SIZE + c1 + 1];
    for (let c2 = c1 + 1; c2 <= DECK_SIZE; c2++) {
      const r2 = evaluator[r1 + c2];
      for (let c3 = c2 + 1; c3 <= DECK_SIZE; c3++) {
        const r3 = evaluator[r2 + c3];
        for (let c4 = c3 + 1; c4 <= DECK_SIZE; c4++) {
          const r4 = evaluator[r3 + c4];
          for (let c5 = c4 + 1; c5 <= DECK_SIZE; c5++) {
            const r5 = evaluator[r4 + c5];
            for (let c6 = c5 + 1; c6 <= DECK_SIZE; c6++) {
              const r6 = evaluator[r5 + c6];
              for (let c7 = c6 + 1; c7 <= DECK_SIZE; c7++) {
                const r7 = evaluator[r6 + c7];
                freq[r7 >> 12]++;
              }
            }
          }
        }
      }
    }
  }
  const finish = Date.now();
  let total = 0;
  for (let key = 0; key < HANDS.length; key++) {
    total += freq[key];
    console.log(HANDS[key] + ': ' + freq[key]);
  }
  console.log('Total: ' + total);
  console.log(finish - start + 'ms');
}
