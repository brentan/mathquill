
var Currency = P(MathCommand, function(_, super_) {
  _.init = function(ch, text) {
    this.htmlTemplate = '<span><span>' + text + '</span><span>&0</span></span>';
    this.textTemplate = [' ' + text, ' ']; // BRENTAN- Determine how currency fits in to units?
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