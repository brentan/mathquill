
var Derivative = P(MathCommand, function(_, super_) {
  _.power = 1;
  _.symbol = 'd';
  _.init = function(ch, power, partial) {
    this.power = power;
    if(partial) this.symbol = '&#8706;';
    var htmlTemplate = '<span class="mq-fraction mq-non-leaf">'
      +   '<span class="mq-numerator"' + (this.power > 1 ? ' style="padding-top:9px;"' : '') + '>' + this.symbol 
      + (this.power > 1 ? ('<sup>' + this.power + '</sup>') : '') + '<span>&0</span></span>'
      +   '<span class="mq-denominator"' + (this.power > 1 ? ' style="padding-top:9px;"' : '') + '>' + this.symbol + '<span>&1</span>' 
      + (this.power > 1 ? ('<sup>' + this.power + '</sup>') : '') + '</span>'
      +   '<span style="display:inline-block;width:0">&nbsp;</span>'
      + '</span>'
    Symbol.prototype.init.call(this, ch, htmlTemplate);
  };
  _.latex = function() {
    return this.ctrlSeq + '_{' + this.blocks[1].latex() +
        '}\\left({' + this.blocks[0].latex() + '}\\right)';
  };
  _.text = function(opts) {
    var output = ' diff(' + this.blocks[0].text(opts) + ' , ' + this.blocks[1].text(opts) + ')';
    for(var i = 1; i < this.power; i++)
      output = ' diff(' + output + ' , ' + this.blocks[1].text(opts) + ')';
    return output;
  }
  _.parser = function() {
    var string = Parser.string;
    var optWhitespace = Parser.optWhitespace;
    var whitespace = Parser.whitespace;
    var succeed = Parser.succeed;
    var block = latexMathParser.block;

    var self = this;
    var blocks = self.blocks = [ MathBlock(), MathBlock() ];
    for (var i = 0; i < blocks.length; i += 1) {
      blocks[i].adopt(self, self.ends[R], 0);
    }

    return optWhitespace.then(string('_')).then(function() {
      var child = blocks[1];
      return block.then(function(block) {
        block.children().adopt(child, child.ends[R], 0);
        return succeed(self);
      });
    }).then(string('\\left(')).then(function() {
      var child = blocks[0];
      return block.then(function (block) {
        block.children().adopt(child, child.ends[R], 0);
        return succeed(self);
      });
    }).then(string('\\right)')).result(self);
  };
  _.finalizeTree = function() {
    this.downInto = this.ends[L];
    this.upInto = this.ends[R];
    this.ends[R].upOutOf = this.ends[L];
    this.ends[L].downOutOf = this.ends[R];
  };
});

LatexCmds.derivative = bind(Derivative,'\\derivative ', 1, false);
LatexCmds.pderivative = bind(Derivative,'\\pderivative ', 1, true);
LatexCmds.derivatived = bind(Derivative,'\\derivatived ', 2, false);
LatexCmds.pderivatived = bind(Derivative,'\\pderivatived ', 2, true);




