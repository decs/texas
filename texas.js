// Texas Hold'em hand evaluator for [node.js](http://nodejs.org/).

// *Dependencies*: [underscore.js](http://documentcloud.github.com/underscore/),
// [compress-buffer](http://github.com/egorFiNE/node-compress-buffer/).
var _ = require('underscore');
var fs = require('fs');
var crypto = require('crypto');
var gzip = require('compress-buffer');

// ## Definitions

// Standard deck size.
var deckSize = 52;

// Card abbreviations.
var chars = '23456789TJQKAc♣d♦h♥s♠';
var abbr = _.object(chars, _.range(chars.length));

// Card ranks.
var ranks = ['Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 
		'Eight', 'Nine', 'Ten', 'Jack', 'Queen', 'King', 'Ace'];

// Card suits.
var suits = ['Clubs', 'Diamonds', 'Hearts', 'Spades'];

// Types of hand.
var hands = ['Invalid', 'High Card', 'One Pair', 'Two Pairs',
		'Three of a Kind', 'Straight', 'Flush', 'Full House',
		'Four of a Kind', 'Straight Flush'];

// Loads the look-up table.
var buffer = fs.readFileSync(__dirname + '/HandRanks.dat.gz');
var evaluator = new Int32Array(gzip.uncompress(buffer));

// ## Internal Functions

// Parses the formatted card to get its numeric code.
var getCode = function (card) {
	if (typeof card == 'number')
		return card >= 1 && card <= deckSize ? card : undefined; // Already codified
	if (typeof card != 'string' || card.length != 2)
		return undefined; // Invalid input
	var posRank = abbr[card[0]];
	var posSuit = (abbr[card[1]] - ranks.length) >> 1;
	if (typeof posRank != 'number' || posRank >= ranks.length || posSuit < 0)
		return undefined; // Invalid characters
	return posRank * suits.length + posSuit + 1;
};

// Helper function to create card formatters.
var filter = function (format) {
	return function (card) {
		card = getCode(card);
		if (!card)
			return undefined;
		card--;
		return format({rank: card >> 2, suit: card & 3});
	};
};

// ## Main Functions
module.exports = {
	// Creates a new shuffled deck.
	deck: function (format) {
		var res = _.range(1, deckSize + 1);
		var buffer = crypto.randomBytes(deckSize << 2);
		for (var pos = res.length - 1; pos > 0; pos--) {
			var rand = buffer.readUInt32LE(pos << 2) % (pos + 1);
			var temp = res[pos];
			res[pos] = res[rand];
			res[rand] = temp;
		};
		return format ? _.map(res, format) : res;
	},
	
	// Evaluates the 5 to 7 card hands.
	evaluate: function (cards) {
		var res = deckSize + 1;
		for (var c = 0; c < cards.length; c++)
			res = evaluator[res + getCode(cards[c])];
		if (cards.length < 7)
			res = evaluator[res];
		return {name: hands[res >> 12], value: res};
	},
	
	// Sorts the set of cards.
	sort: function (cards) {
		return _.sortBy(cards, getCode);
	},
	
	// Formats the card to extended text.
	extended: filter(function (card) {
		return ranks[card.rank] + ' of ' + suits[card.suit];
	}),
	
	// Formats the card to abbreviated text.
	abbr: filter(function (card) {
		return chars[card.rank] + chars[(card.suit << 1) + ranks.length];
	}),
	
	// Formats the card to unicode text.
	unicode: filter(function (card) {
		return chars[card.rank] + chars[(card.suit << 1) + ranks.length + 1];
	}),
	
	// Parses the formatted card to get its numeric code.
	code: getCode,
	
	// Benchmarks the evaluator within all possible 7 card hands.
	benchmark: function () {
		var freq = new Int32Array(hands.length);
		var start = Date.now();
		for (var c1 = 1; c1 <= deckSize; c1++) {
			var r1 = evaluator[deckSize + c1 + 1];
			for (var c2 = c1 + 1; c2 <= deckSize; c2++) {
				var r2 = evaluator[r1 + c2];
				for (var c3 = c2 + 1; c3 <= deckSize; c3++) {
					var r3 = evaluator[r2 + c3];
					for (var c4 = c3 + 1; c4 <= deckSize; c4++) {
						var r4 = evaluator[r3 + c4];
						for (var c5 = c4 + 1; c5 <= deckSize; c5++) {
							var r5 = evaluator[r4 + c5];
							for (var c6 = c5 + 1; c6 <= deckSize; c6++) {
								var r6 = evaluator[r5 + c6];
								for (var c7 = c6 + 1; c7 <= deckSize; c7++) {
									var r7 = evaluator[r6 + c7];
									freq[r7 >> 12]++;
		}	}	}	}	}	}	}
		var finish = Date.now();
		var total = 0;
		for (var key = 0; key < hands.length; key++) {
			total += freq[key];
			console.log(hands[key] + ': ' + freq[key]);
		}
		console.log('Total: ' + total);
		console.log((finish - start) + 'ms');
	}
};
