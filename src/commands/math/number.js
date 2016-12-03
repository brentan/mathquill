
var NumberSymbol = P(VanillaSymbol, function(_, super_) {
  _.reflow = function() {
    if(!(this[L] instanceof NumberSymbol)) this.redrawComma();
  }
  _.redrawComma = function() {
    var start_block = false;
    var decimal_encountered = false;
    var i = this.leftMostNumber();
    if(i[L] && (i[L].ctrlSeq == '.')) return i.clearCommas();
    for(i; (i instanceof NumberSymbol) || (!decimal_encountered && i && i.ctrlSeq == '.'); i = i[R]) {
      if(decimal_encountered) 
        i.dropComma();
      else {
        if(i.ctrlSeq == '.') 
          decimal_encountered = true;
        else 
          start_block = i;
      }
    }
    var count = 0;
    for(var i = start_block; i instanceof NumberSymbol; i = i[L]) {
      if(count == 3) {
        count = 0;
        i.addComma();
      } else
        i.dropComma();
      count++;
    }
  }
  _.clearCommas = function() {
    for(var i = this; i instanceof NumberSymbol; i = i[R]) 
      i.dropComma();
  }
  _.leftMostNumber = function() {
    for(var i = this; i[L] instanceof NumberSymbol; i = i[L]);
    return i;
  }
  _.dropComma = function() {
    this.jQ.removeClass('add_comma');
  }
  _.addComma = function() {
    this.jQ.addClass('add_comma');
  }
});

LatexCmds['2'] = P(NumberSymbol, function(_, super_) {  //Do this for units, so that 2 becomes a letter in the unit box (inH2O)
  _.init = function() {
    super_.init.call(this, '2');
  }
  _.createLeftOf = function(cursor) {
    if((cursor.parent && cursor.parent.parent && cursor.parent.parent instanceof Unit && (cursor.parent === cursor.parent.parent.ends[R])) || (cursor.parent && cursor.parent.parent && cursor.parent.parent.unit && !(cursor.parent.parent instanceof SupSub))) {
      if(cursor[L] && (cursor[L].ctrlSeq === 'H'))
        Letter('2').createLeftOf(cursor);
      else
        cursor.parent.flash();
    }
    else
      super_.createLeftOf.call(this, cursor);
  };
});