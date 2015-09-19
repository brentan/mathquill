
var Limit = P(MathCommand, function(_, super_) {
  _.direction = 0;
  _.init = function(ch, direction) {
    this.direction = direction;
    var htmlTemplate =
        '<span style="margin-top:0.4em;"><span class="mq-large-operator mq-non-leaf" style="display:block;float:left;position:relative;top:-0.4em;">'
        +   '<big>lim</big>'
        +   '<span class="mq-from"><span>&0</span>&#8594;<span>&1</span>' + (direction == 0 ? '' : (direction == 1 ? '+' : '-')) + '</span>'
        + '</span>'
        + '<span class="mq-non-leaf">'
        + '<span class="mq-scaled mq-paren">(</span>'
        + '<span class="mq-non-leaf">&2</span>'
        + '<span class="mq-scaled mq-paren">)</span>'
        + '</span></span>';
    Symbol.prototype.init.call(this, ch, htmlTemplate);
  };
  _.reflow = function() {
    var delimjQs = this.jQ.children(':last').children(':first').add(this.jQ.children(':last').children(':last'));
    var contentjQ = this.jQ.children(':last').children(':eq(1)');
    var height = contentjQ.outerHeight() / parseInt(contentjQ.css('fontSize'), 10);
    scale(delimjQs, min(1 + .2*(height - 1), 1.2), 1.05*height);
  };
  _.latex = function() {
    return this.ctrlSeq + '_{' + this.blocks[0].latex()  + '}^{' + this.blocks[1].latex() +
        '}\\left({' + this.blocks[2].latex() + '}\\right)';
  };
  _.text = function(opts) {
    var output = ' limit(' + this.blocks[2].text(opts) + ' , ' + this.blocks[0].text(opts) + ' , ' + this.blocks[1].text(opts);
    if(this.direction != 0)
      output += ", " + this.direction;
    return output + ')';
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
    }).then(string('^')).then(function() {
      var child = blocks[1];
      return block.then(function (block) {
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
});

LatexCmds.limit = bind(Limit,'\\limit ', 0);
LatexCmds.limitn = bind(Limit,'\\limitn ', -1);
LatexCmds.limitp = bind(Limit,'\\limitp ', 1);




