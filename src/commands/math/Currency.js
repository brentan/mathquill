
var Currency = P(MathCommand, function(_, super_) {
  _.init = function(ch, text) {
    this.htmlTemplate = '<span><span>' + text + '</span><span>&0</span></span>';
    var unit = '';
    switch(text) {
      case '$':
        unit = '*_USD';
        break;
      case '¥':
        unit = '*_JPY';
        break;
      case '€':
        unit = '*_EUR';
        break;
      case '₩':
        unit = '*_KRW';
        break;
      case '£':
        unit = '*_GBP';
        break;
    }
    this.textTemplate = ['((', ')' + unit + ')']; // Convert to units
    super_.init.call(this, ch);
  };
  _.finalizeTree = function() {
    this.ends[L].write = function(cursor, ch) {
      if (!RegExp(/[0-9\.]/).test(ch)) {
        cursor.insRightOf(this.parent);
        cursor.parent.write(cursor, ch);
      } else
        MathBlock.p.write.apply(this, arguments);
    };
  };
});
LatexCmds.$ = bind(Currency,'\\$', '$');
LatexCmds['¥'] = bind(Currency,'\\¥', '&#165;');
LatexCmds['€'] = LatexCmds.euro = bind(Currency,'\\€', '&#8364;');
LatexCmds['₩'] = bind(Currency,'\\₩', '&#8361;');
LatexCmds['£'] = bind(Currency,'\\£', '&#163;');
