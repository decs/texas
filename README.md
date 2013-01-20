# texas
Texas is a library to provide 5 to 7 card hands evaluation for Texas Hold'em on node.js.
It uses the look-up table method created by users of the
[Two Plus Two forum](archives1.twoplustwo.com/showflat.php?Cat=0&Number=8513906&page=0&fpart=1&vc=1).

## Installing
```
npm install texas
```

## Using

### Evaluator

The following example generates a random hand and evaluates it:
```javascript
var _ = require('underscore');
var texas = require('texas');

var hand = _.first(texas.deck(), 7);
console.log(_.map(hand, texas.abbr));
console.log(texas.evaluate(hand));
```

Which will output something like:
```
[ '5h', '3s', '4d', '7s', '5d', 'Jd', '6d' ]
{ name: 'Straight', value: 20483 }
```

### Odds

The following example calculates the odds of a 2-player game after the flop:
```javascript
var texas = require('texas');

var odds = texas.odds([['As', 'Ac'], ['Ks', 'Qc']], ['3d', 'Qc', 'Kd']);
console.log(odds);
```

Which will output something like:
```
[ { win: 0.2608695652173913, split: 0 },
  { win: 0.7391304347826086, split: 0 } ]
```

## Formats

### Extended
```
> texas.extended(3)
'Two of Hearts'
```

### Abbreviated
```
> texas.abbr(15)
'5h'
```

### Unicode
```
> texas.unicode(42)
'Q♦'
```

## Benchmark
A benchmark function is included in the library. It evaluates every possible 7 card hands.
```
> texas.benchmark()
Invalid: 0
High Card: 23294460
One Pair: 58627800
Two Pairs: 31433400
Three of a Kind: 6461620
Straight: 6180020
Flush: 4047644
Full House: 3473184
Four of a Kind: 224848
Straight Flush: 41584
Total: 133784560
891ms // On a Mid 2011 13" MacBook Air
```
