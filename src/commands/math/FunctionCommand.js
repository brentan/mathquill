
// Not truly latex appropriate, but useful for creating object.method calls with autocomplete
// We extend off scientific notation because we want to import all of
var FunctionCommand = LatexCmds.functionCommand = P(DerivedMathCommand, function(_, super_) {
  _.ctrlSeq = 'FunctionCommand{...}{...}';
  _.htmlTemplate =
      '<span>'
    +   '<span>&0</span>'
    +   '<span>.</span>'
    +   '<span>&1</span>'
    + '</span>'
  ;
  _.init = function(ch) {
    if(ch !== 'functionCommand')
      this.incorporate_previous = ch;
    super_.init.call(this);
  };
  _.text = function(opts) {
    return this.blocks[0].text(opts) + '__' + this.blocks[1].text(opts);
  }
  _.latex = function() {
    return '\\functionCommand{' + this.blocks[0].latex() + '}{' + this.blocks[1].latex() + '}';
  }
  _.finalizeTree = function() {
    this.ends[R].write = function(cursor, ch) {
      if(!RegExp(/[A-Za-z0-9_\(]/).test(ch)) {
        if(cursor[L] instanceof Variable) cursor[L].autoOperator(cursor);
        cursor.insRightOf(this.parent);
        cursor.parent.write(cursor, ch);
      } else
        MathBlock.p.write.apply(this, arguments);
    };
  }
  _.getObject = function() {
    if(this.saved_object) return this.saved_object;
    try {
      this.saved_object = SC_Objects[this.objectName()];
      if(typeof this.saved_object === 'string') {
        SC_Objects[this.objectName()] = eval(this.saved_object);
        this.saved_object = SC_Objects[this.objectName()];
      }
      return this.saved_object;
    } catch(err) {
      this.saved_object = false;
      return SC_Object();
      //BRENTAN: Do something here...?
    }
  }
  _.objectName = function() {
    return this.blocks[0].text({});
  }
  _.createLeftOf = function(cursor) {
    super_.createLeftOf.apply(this, arguments);
    if(typeof this.incorporate_previous !== 'undefined') {
      // If this is set, it means we were automagically created from a object.method type of syntax
      // We need to roll up the previous letters into this element and place the cursor
      var e = this[L];
      if(e === 0) return; //this shouldn't happen....
      if(e[L] === 0) return; //nor should this...
      // Zip up all the preceding letters
      for(next = e[L]; (next !== 0) && (next instanceof Variable); next = e[L]) {
        next.disown().adopt(this.ends[L], 0, this.ends[L].ends[L]);
        next.jQ.prependTo(this.ends[L].jQ);
      }
      // Remove the preceeding '.'
      e.remove();

      // Insert the last command into the method area and place the cursor
      cursor.insAtLeftEnd(this.ends[R]);
      if(this.incorporate_previous !== true) //'true' means don't add in a character
        Letter(this.incorporate_previous).createLeftOf(cursor);
    }
  };
});

//BRENTAN: Look at operatorName for strategies on jumping out of functionCommand when + is used etc
