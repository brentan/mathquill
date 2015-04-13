

var SummationNotation = P(MathCommand, function(_, super_) {
  _.init = function(ch, html) {
    var htmlTemplate =
        '<span><span class="mq-large-operator mq-non-leaf">'
        +   '<span class="mq-to"><span>&1</span></span>'
        +   '<big>'+html+'</big>'
        +   '<span class="mq-from"><span>&0</span></span>'
        + '</span>'
        + '<span class="mq-non-leaf">'
        + '<span class="mq-scaled mq-paren">(</span>'
        + '<span class="mq-non-leaf">&2</span>'
        + '<span class="mq-scaled mq-paren">)</span>'
        + '</span></span>';
    Symbol.prototype.init.call(this, ch, htmlTemplate);
  };
  _.createLeftOf = function(cursor) {
    super_.createLeftOf.apply(this, arguments);
    Letter('n').createLeftOf(cursor);
    LatexCmds['=']().createLeftOf(cursor);
  };
  _.reflow = function() {
    var delimjQs = this.jQ.children(':last').children(':first').add(this.jQ.children(':last').children(':last'));
    var contentjQ = this.jQ.children(':last').children(':eq(1)');
    var height = contentjQ.outerHeight() / parseInt(contentjQ.css('fontSize'), 10);
    scale(delimjQs, min(1 + .2*(height - 1), 1.2), 1.05*height);
  };
  _.latex = function() {
    function simplify(latex) {
      return latex.length === 1 ? latex : '{' + (latex || ' ') + '}';
    }
    return this.ctrlSeq + '_{' + this.blocks[0].latex() +
        '}^{' + this.blocks[1].latex() + '}\\left({' + this.blocks[2].latex() + '}\\right)';
  };
  _.text = function(opts) {
    return ' ' + this.ctrlSeq + '("' + this.blocks[0].text(opts).replace(' :=','" , ') + ' , ' + this.blocks[1].text(opts) + ',' + this.blocks[2].text(opts) + ')';
  }
  _.parser = function() {
    var string = Parser.string;
    var optWhitespace = Parser.optWhitespace;
    var whitespace = Parser.whitespace;
    var succeed = Parser.succeed;
    var block = latexMathParser.block;

    var self = this;
    var blocks = self.blocks = [ MathBlock(), MathBlock(), MathBlock() ];
    for (var i = 0; i < blocks.length; i += 1) {
      blocks[i].adopt(self, self.ends[R], 0);
    }

    return optWhitespace.then(string('_')).then(function() {
      var child = blocks[0];
      return block.then(function(block) {
        block.children().adopt(child, child.ends[R], 0);
        return succeed(self);
      });
    }).then(optWhitespace).then(string('^')).then(function() {
      var child = blocks[1];
      return block.then(function(block) {
        block.children().adopt(child, child.ends[R], 0);
        return succeed(self);
      });
    }).then(string('\\left(')).then(function() {
      var child = blocks[2];
      return block.then(function (block) {
        block.children().adopt(child, child.ends[R], 0);
        return succeed(self);
      });
    }).then(string('\\right)')).result(self);
  };
  _.finalizeTree = function() {
    this.downInto = this.ends[L];
    this.upInto = this.ends[R];
    this.ends[L].upOutOf = this.ends[R];
    this.ends[R].downOutOf = this.ends[L];
  };
});

LatexCmds['∑'] =
LatexCmds.sum =
LatexCmds.summation = bind(SummationNotation,'\\sum ','&sum;');

LatexCmds['∏'] =
LatexCmds.prod =
LatexCmds.product = bind(SummationNotation,'\\prod ','&prod;');

LatexCmds.coprod =
LatexCmds.coproduct = bind(SummationNotation,'\\coprod ','&#8720;');

