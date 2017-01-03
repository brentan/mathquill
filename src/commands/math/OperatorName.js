
var OperatorName = LatexCmds.operatorname = P(MathCommand, function(_, super_) {
  _.htmlTemplate = '<span class="mq-operator-name-holder"><span class="mq-operator-name">&0</span>'
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
  _.textOutput = function(opts) {
    var out = [];
    if(this[L] && !(this[L] instanceof BinaryOperator))
      out.push({text:'*'}); //BRENTAN: This needs lots of testing to make sure it doesnt add a '*' in situations where it shouldn't! UPDATE: Been here a while and no issues...
    if((this.blocks[0].text(opts)+"").match(/^'+$/)) out = [];
    out.push({text:this.blocks[0].text(opts), obj:this.blocks[0]});
    out.push({text:'('});
    out.push({text: this.blocks[1].text(opts), obj: this.blocks[1]});
    out.push({text:')'});
    return out;
  };
  _.latex = function() {
    if(BuiltInOpNames.hasOwnProperty(this.blocks[0].text())) //This is a built-in latex command
      return '\\' + this.blocks[0].latex() + '\\left({' + this.blocks[1].latex() + '}\\right)';
    else
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
    if(BuiltInOpNames.hasOwnProperty(this.ctrlSeq)) {
      for (var i = 0; i < fn.length; i += 1) {
        Letter(fn.charAt(i)).adopt(this.ends[L], this.ends[L].ends[R], 0);
      }
      return optWhitespace.then(string('\\left(')).then(function() {
        var child = blocks[1];
        return block.then(function (block) {
          block.children().adopt(child, child.ends[R], 0);
          return succeed(self);
        });
      }).then(string('\\right)')).result(self);
    } else {
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
    }
  };
  _.createTooltip = function() {
    var command = this.blocks[0].text({});
    if(!this.controller) this.getController();
    if(this.controller.current_tooltip === this) return this;
    if(this.controller.API.__options.helpList && this.controller.API.__options.helpList[command]) {
      this.controller.current_tooltip = this;
      if(this.controller.element) this.controller.element.worksheet.tooltip_holder = this;
      var html = this.controller.API.__options.helpList[command];
      SwiftCalcs.createHelpPopup(html, this.jQ.find('.mq-operator-name'));
      return this;
    } 
    if(this.blocks[0].ends[L] instanceof Variable) return this.blocks[0].ends[L].createTooltip();
    this.controller.destroyTooltip();
    return false;
  }
});