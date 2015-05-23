
var OperatorName = LatexCmds.operatorname = P(MathCommand, function(_, super_) {
  _.htmlTemplate = '<span><span class="mq-operator-name">&0</span>'
        + '<span class="mq-non-leaf">'
        + '<span class="mq-scaled mq-paren">(</span>'
        + '<span class="mq-non-leaf">&1</span>'
        + '<span class="mq-scaled mq-paren">)</span>'
        + '</span></span>';
  _.init = function(fn) { 
    super_.init.call(this, fn);
  };
  _.createLeftOf = function(cursor) {
    super_.createLeftOf.apply(this, arguments);
    cursor.insAtRightEnd(this.blocks[1]);
  };
  _.reflow = function() {
    var delimjQs = this.jQ.children(':last').children(':first').add(this.jQ.children(':last').children(':last'));
    var contentjQ = this.jQ.children(':last').children(':eq(1)');
    var height = contentjQ.outerHeight() / parseInt(contentjQ.css('fontSize'), 10);
    scale(delimjQs, min(1 + .2*(height - 1), 1.2), 1.05*height);
  };
  _.text = function(opts) {
    if(typeof opts.operatorNameTextOutput !== 'undefined')
      return opts.operatorNameTextOutput(this, this.blocks[0].text(opts), this.blocks[1].text(opts));
    else
      return this.blocks[0].text(opts) + '(' + this.blocks[1].text(opts) + ')';
  };
  _.latex = function() {
    return '\\operatorname{' + this.blocks[0].latex() + '}\\left({' + this.blocks[1].latex() + '}\\right)';
  };
  _.parser = function() {
    var string = Parser.string;
    var optWhitespace = Parser.optWhitespace;
    var succeed = Parser.succeed;
    var block = latexMathParser.block;
    var fn = this.ctrlSeq;

    var self = this;
    var blocks = self.blocks = [ MathBlock(), MathBlock() ];
    for (var i = 0; i < blocks.length; i += 1) {
      blocks[i].adopt(self, self.ends[R], 0);
    }

    return optWhitespace.then(function() {
      var child = blocks[0];
      return block.then(function(block) {
        block.children().adopt(child, child.ends[R], 0);
        for(var node = block.ends[L]; node !== 0; node = node[R]) {
          if(node.ctrlSeq === 'f') 
            node.htmlTemplate = '<var>f</var>';
          else if((node instanceof SupSub) && (node.supsub === 'sub')) {
            for(var node2 = node.blocks[0].ends[L]; node2 !== 0; node2 = node2[R]) {
              if(node2.ctrlSeq === 'f') 
                node2.htmlTemplate = '<var>f</var>';
            }
          }
        }
        return succeed(self);
      });
    }).then(string('\\left(')).then(function() {
      var child = blocks[1];
      return block.then(function (block) {
        block.children().adopt(child, child.ends[R], 0);
        return succeed(self);
      });
    }).then(string('\\right)')).result(self);
  };
});
for (var fn in BuiltInOpNames) if (BuiltInOpNames.hasOwnProperty(fn)) {
  LatexCmds[fn] = OperatorName;
}