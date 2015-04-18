/*********************************************
 * Manage the MathQuill instance's textarea
 * (as owned by the Controller)
 ********************************************/

Controller.open(function(_) {
  _.createTextarea = function() {
    var ctrlr = this;
    ctrlr.cursor.selectionChanged = function() { ctrlr.selectionChanged(); };
    ctrlr.copy = function(e) { ctrlr.setTextareaSelection(); };
  };
  _.selectionChanged = function() {
    var ctrlr = this;
    forceIERedraw(ctrlr.container[0]);

    // throttle calls to setTextareaSelection(), because setting textarea.value
    // and/or calling textarea.select() can have anomalously bad performance:
    // https://github.com/mathquill/mathquill/issues/43#issuecomment-1399080
    if (ctrlr.textareaSelectionTimeout === undefined) {
      ctrlr.textareaSelectionTimeout = setTimeout(function() {
        ctrlr.setTextareaSelection();
      });
    }
  };
  _.setTextareaSelection = function() {
    this.textareaSelectionTimeout = undefined;
    var latex = '';
    if (this.cursor.selection) {
      latex = this.cursor.selection.join('latex');
      //BRENTAN: Flag for if we are math or text mode
      latex = 'latex{' + latex + '}';
    }
    this.selectFn(latex);
  };
  _.editablesTextareaEvents = function() {
    var ctrlr = this, cursor = ctrlr.cursor
    this.selectFn = function(text) { this.element.workspace.selectFn(text); };
    this.cut = function(e) {
      if (cursor.selection) {
        setTimeout(function() {
          ctrlr.notify('edit'); // deletes selection if present
          cursor.parent.bubble('reflow');
        });
      }
    };
    this.focusBlurEvents();
  };
  _.typedText = function(ch) {
    if (ch === '\n') { this.handle('enter'); return this.API.blur(); }
    var cursor = this.notify().cursor;
    cursor.parent.write(cursor, ch, cursor.show().replaceSelection());
    this.scrollHoriz();
  };
  _.paste = function(text) {
    if (text.slice(0,6) === 'latex{' && text.slice(-1) === '}') {
      text = text.slice(6, -1);
      // BRENTAN: set as 'math' mode
    } else {
      // Set as 'text' mode
    }
    this.writeLatex(text).blur();
  };
});
