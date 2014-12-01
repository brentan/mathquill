/***************************
 * Commands and Operators.
 **************************/

var scale, // = function(jQ, x, y) { ... }
//will use a CSS 2D transform to scale the jQuery-wrapped HTML elements,
//or the filter matrix transform fallback for IE 5.5-8, or gracefully degrade to
//increasing the fontSize to match the vertical Y scaling factor.

//ideas from http://github.com/louisremi/jquery.transform.js
//see also http://msdn.microsoft.com/en-us/library/ms533014(v=vs.85).aspx

  forceIERedraw = noop,
  div = document.createElement('div'),
  div_style = div.style,
  transformPropNames = {
    transform:1,
    WebkitTransform:1,
    MozTransform:1,
    OTransform:1,
    msTransform:1
  },
  transformPropName;

for (var prop in transformPropNames) {
  if (prop in div_style) {
    transformPropName = prop;
    break;
  }
}

if (transformPropName) {
  scale = function(jQ, x, y) {
    jQ.css(transformPropName, 'scale('+x+','+y+')');
  };
}
else if ('filter' in div_style) { //IE 6, 7, & 8 fallback, see https://github.com/laughinghan/mathquill/wiki/Transforms
  forceIERedraw = function(el){ el.className = el.className; };
  scale = function(jQ, x, y) { //NOTE: assumes y > x
    x /= (1+(y-1)/2);
    jQ.css('fontSize', y + 'em');
    if (!jQ.hasClass('mq-matrixed-container')) {
      jQ.addClass('mq-matrixed-container')
      .wrapInner('<span class="mq-matrixed"></span>');
    }
    var innerjQ = jQ.children()
    .css('filter', 'progid:DXImageTransform.Microsoft'
        + '.Matrix(M11=' + x + ",SizingMethod='auto expand')"
    );
    function calculateMarginRight() {
      jQ.css('marginRight', (innerjQ.width()-1)*(x-1)/x + 'px');
    }
    calculateMarginRight();
    var intervalId = setInterval(calculateMarginRight);
    $(window).load(function() {
      clearTimeout(intervalId);
      calculateMarginRight();
    });
  };
}
else {
  scale = function(jQ, x, y) {
    jQ.css('fontSize', y + 'em');
  };
}

var Style = P(MathCommand, function(_, super_) {
  _.init = function(ctrlSeq, tagName, attrs) {
    super_.init.call(this, ctrlSeq, '<'+tagName+' '+attrs+'>&0</'+tagName+'>');
  };
});

//fonts
LatexCmds.mathrm = bind(Style, '\\mathrm', 'span', 'class="mq-roman mq-font"');
LatexCmds.mathit = bind(Style, '\\mathit', 'i', 'class="mq-font"');
LatexCmds.mathbf = bind(Style, '\\mathbf', 'b', 'class="mq-font"');
LatexCmds.mathsf = bind(Style, '\\mathsf', 'span', 'class="mq-sans-serif mq-font"');
LatexCmds.mathtt = bind(Style, '\\mathtt', 'span', 'class="mq-monospace mq-font"');
//text-decoration
LatexCmds.underline = bind(Style, '\\underline', 'span', 'class="mq-non-leaf mq-underline"');
LatexCmds.overline = LatexCmds.bar = bind(Style, '\\overline', 'span', 'class="mq-non-leaf mq-overline"');

// `\textcolor{color}{math}` will apply a color to the given math content, where
// `color` is any valid CSS Color Value (see [SitePoint docs][] (recommended),
// [Mozilla docs][], or [W3C spec][]).
//
// [SitePoint docs]: http://reference.sitepoint.com/css/colorvalues
// [Mozilla docs]: https://developer.mozilla.org/en-US/docs/CSS/color_value#Values
// [W3C spec]: http://dev.w3.org/csswg/css3-color/#colorunits
var TextColor = LatexCmds.textcolor = P(MathCommand, function(_, super_) {
  _.setColor = function(color) {
    this.color = color;
    this.htmlTemplate =
      '<span class="mq-textcolor" style="color:' + color + '">&0</span>';
  };
  _.latex = function() {
    return '\\textcolor{' + this.color + '}{' + this.blocks[0].latex() + '}';
  };
  _.parser = function() {
    var self = this;
    var optWhitespace = Parser.optWhitespace;
    var string = Parser.string;
    var regex = Parser.regex;

    return optWhitespace
      .then(string('{'))
      .then(regex(/^[#\w\s.,()%-]*/))
      .skip(string('}'))
      .then(function(color) {
        self.setColor(color);
        return super_.parser.call(self);
      })
    ;
  };
});

// Very similar to the \textcolor command, but will add the given CSS class.
// Usage: \class{classname}{math}
// Note regex that whitelists valid CSS classname characters:
// https://github.com/mathquill/mathquill/pull/191#discussion_r4327442
var Class = LatexCmds['class'] = P(MathCommand, function(_, super_) {
  _.parser = function() {
    var self = this, string = Parser.string, regex = Parser.regex;
    return Parser.optWhitespace
      .then(string('{'))
      .then(regex(/^[-\w\s\\\xA0-\xFF]*/))
      .skip(string('}'))
      .then(function(cls) {
        self.htmlTemplate = '<span class="mq-class '+cls+'">&0</span>';
        return super_.parser.call(self);
      })
    ;
  };
});

var SupSub = P(MathCommand, function(_, super_) {
  _.ctrlSeq = '_{...}^{...}';
  _.createLeftOf = function(cursor) {
    if (!cursor[L] && cursor.options.supSubsRequireOperand) return;
    return super_.createLeftOf.apply(this, arguments);
  };
  _.contactWeld = function(cursor) {
    // Look on either side for a SupSub, if one is found compare my
    // .sub, .sup with its .sub, .sup. If I have one that it doesn't,
    // then call .addBlock() on it with my block; if I have one that
    // it also has, then insert my block's children into its block,
    // unless my block has none, in which case insert the cursor into
    // its block (and not mine, I'm about to remove myself) in the case
    // I was just typed.
    // TODO: simplify

    // equiv. to [L, R].forEach(function(dir) { ... });
    for (var dir = L; dir; dir = (dir === L ? R : false)) {
      if (this[dir] instanceof SupSub) {
        // equiv. to 'sub sup'.split(' ').forEach(function(supsub) { ... });
        for (var supsub = 'sub'; supsub; supsub = (supsub === 'sub' ? 'sup' : false)) {
          var src = this[supsub], dest = this[dir][supsub];
          if (!src) continue;
          if (!dest) this[dir].addBlock(src.disown());
          else if (!src.isEmpty()) { // ins src children at -dir end of dest
            src.jQ.children().insAtDirEnd(-dir, dest.jQ);
            var children = src.children().disown();
            var pt = Point(dest, children.ends[R], dest.ends[L]);
            if (dir === L) children.adopt(dest, dest.ends[R], 0);
            else children.adopt(dest, 0, dest.ends[L]);
          }
          else var pt = Point(dest, 0, dest.ends[L]);
          this.placeCursor = (function(dest, src) { // TODO: don't monkey-patch
            return function(cursor) { cursor.insAtDirEnd(-dir, dest || src); };
          }(dest, src));
        }
        this.remove();
        if (cursor && cursor[L] === this) {
          if (dir === R && pt) {
            pt[L] ? cursor.insRightOf(pt[L]) : cursor.insAtLeftEnd(pt.parent);
          }
          else cursor.insRightOf(this[dir]);
        }
        break;
      }
    }
    this.respace();
  };
  Options.p.charsThatBreakOutOfSupSub = '';
  _.finalizeTree = function() {
    var supsub = this.supsub;
    this.ends[L].write = function(cursor, ch) {
      if (cursor.options.charsThatBreakOutOfSupSub.indexOf(ch) > -1) {
        cursor.insRightOf(this.parent);
      }
      if ((supsub == 'sub') && cursor.options.noOperatorsInSubscript && !RegExp(/[A-Za-z0-9]/).test(ch)) {
        cursor.insRightOf(this.parent);
      }
      MathBlock.p.write.apply(this, arguments);
    };
  };
  _.latex = function() {
    function latex(prefix, block) {
      var l = block && block.latex();
      return block ? prefix + (l.length === 1 ? l : '{' + (l || ' ') + '}') : '';
    }
    return latex('_', this.sub) + latex('^', this.sup);
  };
  _.text = function(opts) {
    //subscript first
    var tex = '';
    if(this.sub) {
      if(opts.noOperatorsInSubscript) {
        // If this flag is enabled, subscripts should create variable names like 'r_outer', not 'r_(outer)'
        tex += '_' + (this.sub && this.sub.ends[L] === this.sub.ends[R] ?
            this.sub.ends[L].text(opts) :
            this.sub.foldChildren('', function (text, child) {
              return text + child.text(opts);
            }));
      } else {
        tex += '_' +  (this.sub && this.sub.ends[L] === this.sub.ends[R] ?
            this.sub.ends[L].text(opts) :
        '(' + this.sub.foldChildren('', function (text, child) {
          return text + child.text(opts);
        })
        + ')');
      }
    }
    if(this.sup) {
      tex += '^' + (this.sup && this.sup.ends[L] === this.sup.ends[R] ?
          this.sup.ends[L].text(opts) :
      '(' + this.sup.foldChildren('', function (text, child) {
        return text + child.text(opts);
      })
      + ')');
    }
    return tex;
  };
  _.respace = _.siblingCreated = _.siblingDeleted = function(opts, dir) {
    if (dir === R) return; // ignore if sibling only changed on the right
    this.jQ.toggleClass('mq-limit', this[L].ctrlSeq === '\\int ');
  };
  _.addBlock = function(block) {
    if (this.supsub === 'sub') {
      this.sup = this.upInto = this.sub.upOutOf = block;
      block.adopt(this, this.sub, 0).downOutOf = this.sub;
      block.jQ = $('<span class="mq-sup"/>').append(block.jQ.children())
        .attr(mqBlockId, block.id).prependTo(this.jQ);
    }
    else {
      this.sub = this.downInto = this.sup.downOutOf = block;
      block.adopt(this, 0, this.sup).upOutOf = this.sup;
      block.jQ = $('<span class="mq-sub"></span>').append(block.jQ.children())
        .attr(mqBlockId, block.id).appendTo(this.jQ.removeClass('mq-sup-only'));
      this.jQ.append('<span style="display:inline-block;width:0">&nbsp;</span>');
    }
    // like 'sub sup'.split(' ').forEach(function(supsub) { ... });
    for (var i = 0; i < 2; i += 1) (function(cmd, supsub, oppositeSupsub, updown) {
      cmd[supsub].deleteOutOf = function(dir, cursor) {
        cursor.insDirOf(dir, this.parent);
        if (!this.isEmpty()) {
          cursor[-dir] = this.ends[dir];
          this.children().disown()
            .withDirAdopt(dir, cursor.parent, cursor[dir], this.parent)
            .jQ.insDirOf(dir, this.parent.jQ);
        }
        cmd.supsub = oppositeSupsub;
        delete cmd[supsub];
        delete cmd[updown+'Into'];
        cmd[oppositeSupsub][updown+'OutOf'] = insLeftOfMeUnlessAtEnd;
        delete cmd[oppositeSupsub].deleteOutOf;
        if (supsub === 'sub') $(cmd.jQ.addClass('mq-sup-only')[0].lastChild).remove();
        this.remove();
      };
    }(this, 'sub sup'.split(' ')[i], 'sup sub'.split(' ')[i], 'down up'.split(' ')[i]));
  };
});

var SummationNotation = P(MathCommand, function(_, super_) {
  _.init = function(ch, html) {
    if(Options.p.autoParensSummationNotation)
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
    else
      var htmlTemplate =
          '<span class="mq-large-operator mq-non-leaf">'
          +   '<span class="mq-to"><span>&1</span></span>'
          +   '<big>'+html+'</big>'
          +   '<span class="mq-from"><span>&0</span></span>'
          + '</span>';
    Symbol.prototype.init.call(this, ch, htmlTemplate);
  };
  _.createLeftOf = function(cursor) {
    super_.createLeftOf.apply(this, arguments);
    if (cursor.options.sumStartsWithNEquals) {
      Letter('n').createLeftOf(cursor);
      Equality().createLeftOf(cursor);
    }
  };
  _.reflow = function() {
    if(Options.p.autoParensSummationNotation) {
      var delimjQs = this.jQ.children(':last').children(':first').add(this.jQ.children(':last').children(':last'));
      var contentjQ = this.jQ.children(':last').children(':eq(1)');
      var height = contentjQ.outerHeight() / parseInt(contentjQ.css('fontSize'), 10);
      scale(delimjQs, min(1 + .2*(height - 1), 1.2), 1.05*height);
    }
  };
  _.latex = function() {
    function simplify(latex) {
      return latex.length === 1 ? latex : '{' + (latex || ' ') + '}';
    }
    if(Options.p.autoParensSummationNotation)
      return this.ctrlSeq + '_{' + this.blocks[0].latex() +
          '}^{' + this.blocks[1].latex() + '}\\left({' + this.blocks[2].latex() + '}\\right)';
    else
      return this.ctrlSeq + '_' + simplify(this.ends[L].latex()) +
          '^' + simplify(this.ends[R].latex());
  };
  _.text = function(opts) {
    if(Options.p.autoParensSummationNotation)
      return ' ' + this.ctrlSeq + '("' + this.blocks[0].text(opts).replace('=','" , ') + ' , ' + this.blocks[1].text(opts) + ',' + this.blocks[2].text(opts) + ')';
    else
      return ' ' + this.ctrlSeq +  '("' + this.ends[L].text(opts).replace('=','" , ') + ' , ' + this.ends[R].text(opts) + ')';
  }
  _.parser = function() {
    var string = Parser.string;
    var optWhitespace = Parser.optWhitespace;
    var whitespace = Parser.whitespace;
    var succeed = Parser.succeed;
    var block = latexMathParser.block;

    var self = this;
    if(Options.p.autoParensSummationNotation)
      var blocks = self.blocks = [ MathBlock(), MathBlock(), MathBlock() ];
    else
      var blocks = self.blocks = [ MathBlock(), MathBlock() ];
    for (var i = 0; i < blocks.length; i += 1) {
      blocks[i].adopt(self, self.ends[R], 0);
    }

    if(Options.p.autoParensSummationNotation)
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
    else
      return optWhitespace.then(string('_').or(string('^'))).then(function(supOrSub) {
        var child = blocks[supOrSub === '_' ? 0 : 1];
        return block.then(function(block) {
          block.children().adopt(child, child.ends[R], 0);
          return succeed(self);
        });
      }).many().result(self);
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



function insLeftOfMeUnlessAtEnd(cursor) {
  // cursor.insLeftOf(cmd), unless cursor at the end of block, and every
  // ancestor cmd is at the end of every ancestor block
  var cmd = this.parent, ancestorCmd = cursor;
  do {
    if (ancestorCmd[R]) return cursor.insLeftOf(cmd);
    ancestorCmd = ancestorCmd.parent.parent;
  } while (ancestorCmd !== cmd);
  cursor.insRightOf(cmd);
}

LatexCmds.subscript =
LatexCmds._ = P(SupSub, function(_, super_) {
  _.supsub = 'sub';
  _.ctrlSeq = '_';
  _.htmlTemplate =
      '<span class="mq-supsub mq-non-leaf">'
    +   '<span class="mq-sub">&0</span>'
    +   '<span style="display:inline-block;width:0">&nbsp;</span>'
    + '</span>'
  ;
  _.textTemplate = [ '_' ];
  _.finalizeTree = function() {
    this.downInto = this.sub = this.ends[L];
    this.sub.upOutOf = insLeftOfMeUnlessAtEnd;
    super_.finalizeTree.call(this);
  };
});

LatexCmds.superscript =
LatexCmds.supscript =
LatexCmds['^'] = P(SupSub, function(_, super_) {
  _.supsub = 'sup';
  _.ctrlSeq = '^';
  _.htmlTemplate =
      '<span class="mq-supsub mq-non-leaf mq-sup-only">'
    +   '<span class="mq-sup">&0</span>'
    + '</span>'
  ;
  _.textTemplate = [ '^' ];
  _.finalizeTree = function() {
    this.upInto = this.sup = this.ends[R];
    this.sup.downOutOf = insLeftOfMeUnlessAtEnd;
    super_.finalizeTree.call(this);
  };
});

var Fraction =
LatexCmds.frac =
LatexCmds.dfrac =
LatexCmds.cfrac =
LatexCmds.fraction = P(MathCommand, function(_, super_) {
  _.ctrlSeq = '\\frac';
  _.htmlTemplate =
      '<span class="mq-fraction mq-non-leaf">'
    +   '<span class="mq-numerator">&0</span>'
    +   '<span class="mq-denominator">&1</span>'
    +   '<span style="display:inline-block;width:0">&nbsp;</span>'
    + '</span>'
  ;
  _.textTemplate = ['((', ')/(', '))'];
  _.finalizeTree = function() {
    this.upInto = this.ends[R].upOutOf = this.ends[L];
    this.downInto = this.ends[L].downOutOf = this.ends[R];
  };
});

var LiveFraction =
LatexCmds.over =
CharCmds['/'] = P(Fraction, function(_, super_) {
  _.createLeftOf = function(cursor) {
    if (!this.replacedFragment) {
      var leftward = cursor[L];
      while (leftward &&
        !(
          leftward instanceof BinaryOperator ||
          leftward instanceof (LatexCmds.text || noop) ||
          leftward instanceof SummationNotation ||
          leftward.ctrlSeq === '\\ ' ||
          /^[,;:]$/.test(leftward.ctrlSeq)
        ) //lookbehind for operator
      ) leftward = leftward[L];

      if (leftward instanceof SummationNotation && leftward[R] instanceof SupSub) {
        leftward = leftward[R];
        if (leftward[R] instanceof SupSub && leftward[R].ctrlSeq != leftward.ctrlSeq)
          leftward = leftward[R];
      }

      if (leftward !== cursor[L]) {
        this.replaces(Fragment(leftward[R] || cursor.parent.ends[L], cursor[L]));
        cursor[L] = leftward;
      }
    }
    super_.createLeftOf.call(this, cursor);
  };
});

var SquareRoot =
LatexCmds.sqrt =
LatexCmds['√'] = P(MathCommand, function(_, super_) {
  _.ctrlSeq = '\\sqrt';
  _.htmlTemplate =
      '<span class="mq-non-leaf">'
    +   '<span class="mq-scaled mq-sqrt-prefix">&radic;</span>'
    +   '<span class="mq-non-leaf mq-sqrt-stem">&0</span>'
    + '</span>'
  ;
  _.textTemplate = [' sqrt(', ')'];
  _.parser = function() {
    return latexMathParser.optBlock.then(function(optBlock) {
      return latexMathParser.block.map(function(block) {
        var nthroot = NthRoot();
        nthroot.blocks = [ optBlock, block ];
        optBlock.adopt(nthroot, 0, 0);
        block.adopt(nthroot, optBlock, 0);
        return nthroot;
      });
    }).or(super_.parser.call(this));
  };
  _.reflow = function() {
    var block = this.ends[R].jQ;
    scale(block.prev(), 1, block.innerHeight()/+block.css('fontSize').slice(0,-2) - .1);
  };
});

var Vec = LatexCmds.vec = P(MathCommand, function(_, super_) {
  _.ctrlSeq = '\\vec';
  _.htmlTemplate =
      '<span class="mq-non-leaf">'
    +   '<span class="mq-vector-prefix">&rarr;</span>'
    +   '<span class="mq-vector-stem">&0</span>'
    + '</span>'
  ;
  _.textTemplate = ['vec(', ')'];
});

var NthRoot =
LatexCmds.nthroot = P(SquareRoot, function(_, super_) {
  _.htmlTemplate =
      '<sup class="mq-nthroot mq-non-leaf">&0</sup>'
    + '<span class="mq-scaled">'
    +   '<span class="mq-sqrt-prefix mq-scaled">&radic;</span>'
    +   '<span class="mq-sqrt-stem mq-non-leaf">&1</span>'
    + '</span>'
  ;
  _.textTemplate = ['sqrt[', '](', ')'];
  _.latex = function() {
    return '\\sqrt['+this.ends[L].latex()+']{'+this.ends[R].latex()+'}';
  };
  _.text = function(opts) {
    return ' ' + this.ends[R].text(opts) + '^(1/' + this.ends[L].text(opts) + ')';
  }
});

var Matrix =
    LatexCmds.begin = P(MathCommand, function (_, _super) {
      _.numBlocks = function () {
        return this.col * this.row;
      };
      _.init = function (seq, col, row) {
        this.col = col;
        this.row = row;
        this.ctrlSeq = seq;
        var html = '';
        for (var i = 0; i < row; i++) {
          var r = '';
          for (var j = 0; j < col; j++)
            r += '<span class="mq-cell">&' + (i * col + j) + '</span>'
          html += '<span class="mq-row">' + r + '</span>';
        }
        switch(this.ctrlSeq) {
          case '\\pmatrix':
            html = '<span class="mq-scaled mq-paren">(</span><span class="mq-matrix">' + html + '</span><span class="mq-scaled mq-paren">)</span>';
            break;
          case '\\bmatrix':
            html = '<span class="mq-scaled mq-paren">[</span><span class="mq-matrix">' + html + '</span><span class="mq-scaled mq-paren">]</span>';
            break;
          case '\\Bmatrix':
            html = '<span class="mq-scaled mq-paren">{</span><span class="mq-matrix">' + html + '</span><span class="mq-scaled mq-paren">}</span>';
            break;
          case '\\vmatrix':
            html = '<span class="mq-scaled mq-paren">|</span><span class="mq-matrix">' + html + '</span><span class="mq-scaled mq-paren">|</span>';
            break;
          case '\\Vmatrix':
            html = '<span class="mq-scaled mq-paren">||</span><span class="mq-matrix">' + html + '</span><span class="mq-scaled mq-paren">||</span>';
            break;
          default:
            html = '<span class="mq-matrix">' + html + '</span>';
        }

        _super.init.call(this, this.ctrlSeq, '<span class="mq-matrix-outer mq-non-leaf">' + html + '</span>', [ 'text' ]);
      };
      _.reflow = function() {
        var delimjQs = this.jQ.children('.mq-paren');
        var contentjQ = this.jQ.children('.mq-matrix').first();
        var height = contentjQ.outerHeight() / (1.133333 * parseInt(contentjQ.css('fontSize'), 10));
        console.log(height);
        scale(delimjQs, min(1 + .2*(height - 1), 1.2), 1.05*height);
        delimjQs.css('position','relative');
        delimjQs.css('top',Math.round(height*0.6) + 'px');
      };
      _.latex = function () {
        var latex = '';
        var index = 1;
        var c = this.col;
        var numBlocks = this.numBlocks();
        var ctrlSeq = this.ctrlSeq.substring(1,this.ctrlSeq.length);

        this.eachChild(function (child) {
          if (child.ends[L])
            latex += child.latex();
          if ((index) != numBlocks) {
            if (index % c == 0)
              latex += " \\\\ ";
            else
              latex += " & ";
          }
          index++;
        });
        return '\\begin{'+ctrlSeq+'}' + latex + '\\end{'+ctrlSeq+'}';
      };
      _.text = function (opts) {
        var cells = [];
        this.eachChild(function (child) {
          if (child.ends[L])
            cells.push(child.text(opts))
          else
            cells.push(0);
        });
        var out = '';
        for(var i=0; i<cells.length;i++) {
          if((i > 0) && ((i % this.col) == 0))
            out += '],[';
          else if(i > 0)
            out+=',';
          out+=cells[i];
        }
        return (this.row > 1) ? ('[[' + out + ']]') : ('[' + out + ']')
      };
      _.parser = function () {
        var block = latexMathParser.block;
        var string = Parser.string;
        var regex = Parser.regex;
        var optWhitespace = Parser.optWhitespace;
        return regex(/^\{[pbvBV]?matrix\}[\s\S]*?\\end\{[pbvBV]?matrix\}/).map(function (body) {
          if(body.substring(7,1) == '}') {
            var command = body.substring(1,7);
            body = body.substring(8, body.length - 12).trim();
          } else {
            var command = body.substring(1,8);
            body = body.substring(9, body.length - 13).trim();
          }
          var rows = body.split(/\\\\/).map(function (r) {
            return r.trim();
          });
          var rowsCount = rows.length;
          var colsCount = 0;
          var cells = [];
          rows.forEach(function (r) {
            var cols = r.split(/&/);
            colsCount = Math.max(colsCount, cols.length);
            cells = cells.concat(cols);
          });
          var matrix = Matrix('\\' + command, colsCount, rowsCount);

          var blocks = matrix.blocks = Array(matrix.numBlocks());
          for (var i = 0; i < blocks.length; i++) {
            var newBlock = blocks[i] = latexMathParser.parse(cells[i]);
            newBlock.adopt(matrix, matrix.ends[R], 0);
          }
          return matrix;
        })
      };
      _.finalizeTree = function () {
        for (var i = 0; i < this.row; i++) {
          for (var j = 0; j < this.col; j++) {
            var b = this.blocks[i * this.col + j];
            b.upOutOf = (i == 0 && j != 0) ? this.blocks[this.row * this.col - this.row + j - 1 ] : this.blocks[(i - 1) * this.col + j];
            b.downOutOf = ((i + 1) == this.row && (j + 1) != this.col) ? this.blocks[j + 1] : this.blocks[(i + 1) * this.col + j];
          }
        }
      }
      _.cursorRowCol = function(cursor) {
        // Determine which block this command was typed in (0 indexed)
        var col = 0;
        var row = 0;
        var cell = cursor.parent;
        while(cell[L] !== 0) {
          col++;
          if(col == this.col) {
            col = 0;
            row++;
          }
          cell = cell[L];
        }
        return {row: row, col: col};
      }
      _.deleteRow = function(cursor) {
        if(this.row == 1) return;
        // Determine which block this command was typed in (0 indexed)
        var cell = this.cursorRowCol(cursor);
        var startIndex = cell.row * this.col;
        for(var i=0; i<this.col; i++) {
          this.blocks[startIndex].remove();
          this.blocks.splice(startIndex, 1);
        }
        if((startIndex > 0) && (startIndex < this.blocks.length)) {
          this.blocks[startIndex][L] = this.blocks[startIndex-1];
          this.blocks[startIndex-1][R] = this.blocks[startIndex];
        } else if(startIndex == 0)
          this.blocks[startIndex][L] = 0;
        else
          this.blocks[startIndex-1][R] = 0;
        this.jQ.children(".mq-matrix").first().children(".mq-row").eq(cell.row).remove();
        this.row--;
        this.finalizeTree();
        cursor.insAtLeftEnd(this.blocks[(cell.row > 0) ? ((cell.row-1)*this.col + cell.col) : cell.col]);
        this.reflow();
        this.bubble('workingGroupChange');
      }
      _.deleteColumn = function(cursor) {
        if(this.col == 1) return;
        var cell = this.cursorRowCol(cursor);
        var startIndex = cell.col;
        for(var i=0; i<this.row; i++) {
          this.blocks[startIndex].remove();
          this.blocks.splice(startIndex, 1);
          if((startIndex > 0) && (startIndex < this.blocks.length)) {
            this.blocks[startIndex][L] = this.blocks[startIndex-1];
            this.blocks[startIndex-1][R] = this.blocks[startIndex];
          } else if(startIndex == 0)
            this.blocks[startIndex][L] = 0;
          else
            this.blocks[startIndex-1][R] = 0;
          startIndex += this.col - 1;
        }
        this.col--;
        this.finalizeTree();
        cursor.insAtLeftEnd(this.blocks[(cell.col < this.col) ? (cell.row*this.col + cell.col) : (cell.row*this.col + cell.col - 1)]);
        this.reflow();
        this.bubble('workingGroupChange');
      }
      _.insertRow = function(cursor) {
        //Insert a row into the matrix immediately after the cell the cursor is in, then move cursor.
        //If the comma is inserted at the beginning of a cell with content, insert BEFORE the cell.
        var cell = this.cursorRowCol(cursor);
        var insertBefore = ((cursor[L] === 0) && (cursor[R] !== 0));
        var startIndex = cell.row * this.col + (insertBefore ? 0 : this.col);
        // Add in the new row
        if(insertBefore)
          this.jQ.children(".mq-matrix").first().children(".mq-row").eq(cell.row).before('<span class="mq-row"></span>');
        else
          this.jQ.children(".mq-matrix").first().children(".mq-row").eq(cell.row).after('<span class="mq-row"></span>');
        for(var i=0; i<this.col; i++) {
          var newCell = MathBlock();
          newCell.adopt(this,
              (startIndex + i) > 0 ? this.blocks[startIndex + i - 1] : 0,
              (startIndex + i) > 0 ? this.blocks[startIndex + i - 1][R] : this.ends[L] );
          newCell.jQ = $('<span class="mq-cell mq-empty" ' + mqBlockId + '="' + newCell.id + '"></span>');
          if((startIndex + i) > 0)
            this.blocks[startIndex + i - 1][R] = newCell;
          this.blocks.splice(startIndex + i, 0, newCell);
          this.jQ.children(".mq-matrix").first().children(".mq-row").eq(cell.row + (insertBefore ? 0 : 1)).append(newCell.jQ);
        }
        if((startIndex + i) < this.blocks.length) {
          this.blocks[startIndex + i][L] = newCell;
          newCell[R] = this.blocks[startIndex + i];
        }
        this.row++;
        this.finalizeTree();
        cursor.insAtLeftEnd(this.blocks[startIndex]);
        this.reflow();
        this.bubble('workingGroupChange');
      }
      _.insertColumn = function(cursor) {
        //Insert a column into the matrix immediately after the cell the cursor is in, then move cursor.
        //If the comma is inserted at the beginning of a cell with content, insert BEFORE the cell.
        var cell = this.cursorRowCol(cursor);
        var insertBefore = ((cursor[L] === 0) && (cursor[R] !== 0));

        // Add in the new column
        for(var i=(this.row - 1); i >= 0; i--) {  //Increment backwards so that block element indexes dont shift as we go
          var newCell = MathBlock();
          if(insertBefore) {
            newCell.adopt(this,
                ((i*this.col + cell.col - 1) >= 0) ? this.blocks[i*this.col + cell.col - 1] : 0,
                this.blocks[i*this.col + cell.col]);
            newCell.jQ = $('<span class="mq-cell mq-empty" ' + mqBlockId + '="' + newCell.id + '"></span>');
            if((i*this.col + cell.col - 1) >= 0)
              this.blocks[i*this.col + cell.col - 1][R] = newCell;
            this.blocks[i*this.col + cell.col][L] = newCell;
            this.blocks.splice(i*this.col + cell.col, 0, newCell);
            this.jQ.children(".mq-matrix").first().children(".mq-row").eq(i).children(".mq-cell").eq(cell.col).before(newCell.jQ);
          } else {
            newCell.adopt(this,
                this.blocks[i*this.col + cell.col],
                ((i*this.col + cell.col + 1) < (this.row * this.col)) ? this.blocks[i*this.col + cell.col + 1] : 0);
            newCell.jQ = $('<span class="mq-cell mq-empty" ' + mqBlockId + '="' + newCell.id + '"></span>');
            this.blocks[i*this.col + cell.col][R] = newCell;
            if((i*this.col + cell.col + 1) < (this.row * this.col))
              this.blocks[i*this.col + cell.col + 1][L] = newCell;
            this.blocks.splice(i*this.col + cell.col + 1, 0, newCell);
            this.jQ.children(".mq-matrix").first().children(".mq-row").eq(i).children(".mq-cell").eq(cell.col).after(newCell.jQ);
          }
        }
        this.col++;
        this.finalizeTree();
        cursor.insAtLeftEnd(cursor.parent[insertBefore ? L : R]);
        this.reflow();
        this.bubble('workingGroupChange');
      }
      _.moveOrInsertColumn = function(cursor) {
        var cell = this.cursorRowCol(cursor);
        if((cell.col + 1) == this.col) return this.insertColumn(cursor);
        cursor.insAtLeftEnd(cursor.parent[R]);
        this.bubble('workingGroupChange');
      }
    });
LatexCmds.matrix = bind(Matrix, '\\matrix', 1, 1);
LatexCmds.bmatrix = bind(Matrix, '\\bmatrix', 1, 1);
LatexCmds.Bmatrix = bind(Matrix, '\\Bmatrix', 1, 1);
LatexCmds.vmatrix = bind(Matrix, '\\vmatrix', 1, 1);
LatexCmds.Vmatrix = bind(Matrix, '\\Vmatrix', 1, 1);
LatexCmds.pmatrix = bind(Matrix, '\\pmatrix', 1, 1);



function DelimsMixin(_, super_) {
  _.jQadd = function() {
    super_.jQadd.apply(this, arguments);
    this.delimjQs = this.jQ.children(':first').add(this.jQ.children(':last'));
    this.contentjQ = this.jQ.children(':eq(1)');
  };
  _.reflow = function() {
    var height = this.contentjQ.outerHeight()
                 / parseInt(this.contentjQ.css('fontSize'), 10);
    scale(this.delimjQs, min(1 + .2*(height - 1), 1.2), 1.05*height);
  };
}

// Round/Square/Curly/Angle Brackets (aka Parens/Brackets/Braces)
//   first typed as one-sided bracket with matching "ghost" bracket at
//   far end of current block, until you type an opposing one
var Bracket = P(P(MathCommand, DelimsMixin), function(_, super_) {
  _.init = function(side, open, close, ctrlSeq, end) {
    super_.init.call(this, '\\left'+ctrlSeq, undefined, [open, close]);
    this.side = side;
    this.sides = {};
    this.sides[L] = { ch: open, ctrlSeq: ctrlSeq };
    this.sides[R] = { ch: close, ctrlSeq: end };
  };
  _.numBlocks = function() { return 1; };
  _.html = function() { // wait until now so that .side may
    this.htmlTemplate = // be set by createLeftOf or parser
        '<span class="mq-non-leaf">'
      +   '<span class="mq-scaled mq-paren'+(this.side === R ? ' mq-ghost' : '')+'">'
      +     this.sides[L].ch
      +   '</span>'
      +   '<span class="mq-non-leaf">&0</span>'
      +   '<span class="mq-scaled mq-paren'+(this.side === L ? ' mq-ghost' : '')+'">'
      +     this.sides[R].ch
      +   '</span>'
      + '</span>'
    ;
    return super_.html.call(this);
  };
  _.latex = function() {
    return '\\left'+this.sides[L].ctrlSeq+this.ends[L].latex()+'\\right'+this.sides[R].ctrlSeq;
  };
  _.oppBrack = function(node, expectedSide) {
    // node must be 1-sided bracket of expected side (if any, may be undefined),
    // and unless I'm a pipe, node and I must be opposite-facing sides
    return node instanceof Bracket && node.side && node.side !== -expectedSide
      && (this.sides[this.side].ch === '|' || node.side === -this.side) && node;
  };
  _.closeOpposing = function(brack) {
    brack.side = 0;
    brack.sides[this.side] = this.sides[this.side]; // copy over my info (may be
    brack.delimjQs.eq(this.side === L ? 0 : 1) // mis-matched, like [a, b))
      .removeClass('mq-ghost').html(this.sides[this.side].ch);
  };
  _.createLeftOf = function(cursor) {
    if (!this.replacedFragment) { // unless wrapping seln in brackets,
        // check if next to or inside an opposing one-sided bracket
      var brack = this.oppBrack(cursor[L], L) || this.oppBrack(cursor[R], R)
                  || this.oppBrack(cursor.parent.parent);
    }
    if (brack) {
      var side = this.side = -brack.side; // may be pipe with .side not yet set
      this.closeOpposing(brack);
      if (brack === cursor.parent.parent && cursor[side]) { // move the stuff between
        Fragment(cursor[side], cursor.parent.ends[side], -side) // me and ghost outside
          .disown().withDirAdopt(-side, brack.parent, brack, brack[side])
          .jQ.insDirOf(side, brack.jQ);
        brack.bubble('reflow');
      }
    }
    else {
      brack = this, side = brack.side;
      if (brack.replacedFragment) brack.side = 0; // wrapping seln, don't be one-sided
      else if (cursor[-side]) { // elsewise, auto-expand so ghost is at far end
        brack.replaces(Fragment(cursor[-side], cursor.parent.ends[-side], side));
        cursor[-side] = 0;
      }
      super_.createLeftOf.call(brack, cursor);
    }
    if (side === L) cursor.insAtLeftEnd(brack.ends[L]);
    else cursor.insRightOf(brack);
    cursor.parent.bubble('workingGroupChange');
  };
  _.placeCursor = noop;
  _.unwrap = function() {
    this.ends[L].children().disown().adopt(this.parent, this, this[R])
      .jQ.insertAfter(this.jQ);
    this.remove();
  };
  _.deleteSide = function(side, outward, cursor) {
    var parent = this.parent, sib = this[side], farEnd = parent.ends[side];

    if (side === this.side) { // deleting non-ghost of one-sided bracket, unwrap
      this.unwrap();
      sib ? cursor.insDirOf(-side, sib) : cursor.insAtDirEnd(side, parent);
      return;
    }

    this.side = -side;
    // check if like deleting outer close-brace of [(1+2)+3} where inner open-
    if (this.oppBrack(this.ends[L].ends[this.side], side)) { // paren is ghost,
      this.closeOpposing(this.ends[L].ends[this.side]); // if so become [1+2)+3
      var origEnd = this.ends[L].ends[side];
      this.unwrap();
      if (origEnd.siblingCreated) origEnd.siblingCreated(cursor.options, side);
      sib ? cursor.insDirOf(-side, sib) : cursor.insAtDirEnd(side, parent);
    }
    else { // check if like deleting inner close-brace of ([1+2}+3) where
      if (this.oppBrack(this.parent.parent, side)) { // outer open-paren is
        this.parent.parent.closeOpposing(this); // ghost, if so become [1+2+3)
        this.parent.parent.unwrap();
      }
      else { // deleting one of a pair of brackets, become one-sided
        this.sides[side] = { ch: OPP_BRACKS[this.sides[this.side].ch],
                             ctrlSeq: OPP_BRACKS[this.sides[this.side].ctrlSeq] };
        this.delimjQs.removeClass('mq-ghost')
          .eq(side === L ? 0 : 1).addClass('mq-ghost').html(this.sides[side].ch);
      }
      if (sib) { // auto-expand so ghost is at far end
        var origEnd = this.ends[L].ends[side];
        Fragment(sib, farEnd, -side).disown()
          .withDirAdopt(-side, this.ends[L], origEnd, 0)
          .jQ.insAtDirEnd(side, this.ends[L].jQ.removeClass('mq-empty'));
        if (origEnd.siblingCreated) origEnd.siblingCreated(cursor.options, side);
        cursor.insDirOf(-side, sib);
      } // didn't auto-expand, cursor goes just outside or just inside parens
      else (outward ? cursor.insDirOf(side, this)
                    : cursor.insAtDirEnd(side, this.ends[L]));
    }
  };
  _.deleteTowards = function(dir, cursor) {
    this.deleteSide(-dir, false, cursor);
  };
  _.finalizeTree = function(opts) {
    this.ends[L].deleteOutOf = function(dir, cursor) {
      this.parent.deleteSide(dir, true, cursor);
    };
    if(opts.autoOnBrackets && this[L] instanceof Letter)
      this[L].autoUnItalicize(opts);
    // FIXME HACK: after initial creation/insertion, finalizeTree would only be
    // called if the paren is selected and replaced, e.g. by LiveFraction
    this.finalizeTree = this.intentionalBlur = function() {
      this.delimjQs.eq(this.side === L ? 1 : 0).removeClass('mq-ghost');
      this.side = 0;
    };
  };
  _.siblingCreated = function(opts, dir) { // if something typed between ghost and far
    if (dir === -this.side) this.finalizeTree(); // end of its block, solidify
  };
});

var OPP_BRACKS = {
  '(': ')',
  ')': '(',
  '[': ']',
  ']': '[',
  '{': '}',
  '}': '{',
  '\\{': '\\}',
  '\\}': '\\{',
  '&lang;': '&rang;',
  '&rang;': '&lang;',
  '\\langle ': '\\rangle ',
  '\\rangle ': '\\langle ',
  '|': '|'
};

function bindCharBracketPair(open, ctrlSeq) {
  var ctrlSeq = ctrlSeq || open, close = OPP_BRACKS[open], end = OPP_BRACKS[ctrlSeq];
  CharCmds[open] = bind(Bracket, L, open, close, ctrlSeq, end);
  CharCmds[close] = bind(Bracket, R, open, close, ctrlSeq, end);
}
bindCharBracketPair('(');

// Custom use of the bracket for matrix.  Non-standard for MathQuill
//bindCharBracketPair('[');
CharCmds['['] = bind(Matrix, '\\bmatrix',1,1);

bindCharBracketPair('{', '\\{');
LatexCmds.langle = bind(Bracket, L, '&lang;', '&rang;', '\\langle ', '\\rangle ');
LatexCmds.rangle = bind(Bracket, R, '&lang;', '&rang;', '\\langle ', '\\rangle ');
CharCmds['|'] = bind(Bracket, L, '|', '|', '|', '|');

LatexCmds.left = P(MathCommand, function(_) {
  _.parser = function() {
    var regex = Parser.regex;
    var string = Parser.string;
    var succeed = Parser.succeed;
    var optWhitespace = Parser.optWhitespace;

    return optWhitespace.then(regex(/^(?:[([|]|\\\{)/))
      .then(function(ctrlSeq) { // TODO: \langle, \rangle
        var open = (ctrlSeq.charAt(0) === '\\' ? ctrlSeq.slice(1) : ctrlSeq);
        return latexMathParser.then(function (block) {
          return string('\\right').skip(optWhitespace)
            .then(regex(/^(?:[\])|]|\\\})/)).map(function(end) {
              var close = (end.charAt(0) === '\\' ? end.slice(1) : end);
              var cmd = Bracket(0, open, close, ctrlSeq, end);
              cmd.blocks = [ block ];
              block.adopt(cmd, 0, 0);
              return cmd;
            })
          ;
        });
      })
    ;
  };
});

LatexCmds.right = P(MathCommand, function(_) {
  _.parser = function() {
    return Parser.fail('unmatched \\right');
  };
});

var Binomial =
LatexCmds.binom =
LatexCmds.binomial = P(P(MathCommand, DelimsMixin), function(_, super_) {
  _.ctrlSeq = '\\binom';
  _.htmlTemplate =
      '<span class="mq-non-leaf">'
    +   '<span class="mq-paren mq-scaled">(</span>'
    +   '<span class="mq-non-leaf">'
    +     '<span class="mq-array mq-non-leaf">'
    +       '<span>&0</span>'
    +       '<span>&1</span>'
    +     '</span>'
    +   '</span>'
    +   '<span class="mq-paren mq-scaled">)</span>'
    + '</span>'
  ;
  _.textTemplate = ['choose(',',',')'];
});

var Choose =
LatexCmds.choose = P(Binomial, function(_) {
  _.createLeftOf = LiveFraction.prototype.createLeftOf;
});

var InnerMathField = P(MathQuill.MathField, function(_) {
  _.init = function(root, container) {
    RootBlockMixin(root);
    this.__options = Options();
    var ctrlr = Controller(this, root, container);
    ctrlr.editable = true;
    ctrlr.createTextarea();
    ctrlr.editablesTextareaEvents();
    ctrlr.cursor.insAtRightEnd(root);
  };
});
LatexCmds.MathQuillMathField = P(MathCommand, function(_, super_) {
  _.ctrlSeq = '\\MathQuillMathField';
  _.htmlTemplate =
      '<span class="mq-editable-field">'
    +   '<span class="mq-root-block">&0</span>'
    + '</span>'
  ;
  _.parser = function() {
    var self = this,
      string = Parser.string, regex = Parser.regex, succeed = Parser.succeed;
    return string('[').then(regex(/^[a-z][a-z0-9]*/i)).skip(string(']'))
      .map(function(name) { self.name = name; }).or(succeed())
      .then(super_.parser.call(self));
  };
  _.finalizeTree = function() { InnerMathField(this.ends[L], this.jQ); };
  _.registerInnerField = function(innerFields) {
    innerFields.push(innerFields[this.name] = this.ends[L].controller.API);
  };
  _.latex = function(){ return this.ends[L].latex(); };
  _.text = function(opts){ return this.ends[L].text(opts); };
});
