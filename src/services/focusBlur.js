Controller.open(function(_) {
  _.focusBlurEvents = function() {
    var ctrlr = this, root = ctrlr.root, cursor = ctrlr.cursor;
    ctrlr.focus = function() {
      ctrlr.blurred = false;
      ctrlr.container.addClass('mq-focused');
      if(ctrlr.captiveMode) return;
      if(ctrlr.element && ctrlr.element.setFocusedItem) ctrlr.element.setFocusedItem(ctrlr.API);
      if (!cursor.parent)
        cursor.insAtRightEnd(root);
      if (cursor.selection) { 
        cursor.selection.jQ.removeClass('mq-blur');
        ctrlr.selectionChanged(); //re-select textarea contents after tabbing away and back
      } else if(cursor.anticursor) {
        cursor.select();
      } else
        cursor.show();
      if(ctrlr.element && ctrlr.element.worksheet) {
        ctrlr.element.worksheet.attachToolbar(ctrlr.API, ctrlr.element.worksheet.toolbar.mathToolbar());
        if(ctrlr.staticMode) ctrlr.element.worksheet.blurToolbar(this.API);
      }
    };
    ctrlr.blur = function() { // not directly in the textarea blur handler so as to be
      if(ctrlr.captiveUnitMode || ctrlr.units_only) {
        //Perform unit check
        reg = /([^a-zA-Z0-9_~]|^)_([a-zA-Zµ2]+)/g;
        var result;
        while((result = reg.exec(ctrlr.API.text())) !== null) {
          if(!window.checkForValidUnit(result[2])) {
            // Invalid unit in entry
            showNotice("Unknown unit: " + result[2] + ".  Please correct your input and try again.",'red');
            ctrlr.API.highlightError(result.index);
          }
        }
      }
      ctrlr.blurred = true;
      if(ctrlr.captiveMode) {
        ctrlr.element.itemChosen(ctrlr.API.latex());
        return;
      }
      ctrlr.destroyTooltip();
      if(ctrlr.element && ctrlr.element.worksheet) ctrlr.element.worksheet.blurToolbar(ctrlr.API);
      if(ctrlr.element && ctrlr.element.clearFocusedItem) ctrlr.element.clearFocusedItem(ctrlr.API);
      root.postOrder('intentionalBlur'); // none, intentional blur: #264
      cursor.clearSelection();
      if(cursor[L] instanceof Letter)
        cursor[L].autoOperator(cursor, (cursor.parent && cursor.parent.suppressAutoUnit) ? true : undefined);
      cursor.hide().parent.blur(); // synchronous with/in the same frame as
      ctrlr.closePopup();
      ctrlr.container.removeClass('mq-focused'); // clearing/blurring selection
      ctrlr.handle('blur');
      ctrlr.suppress_auto_commands = false;
    };
    ctrlr.windowBlur = function() {
      ctrlr.blurred = true;
      if(ctrlr.captiveMode) {
        ctrlr.element.itemChosen(ctrlr.API.latex());
        return;
      }
      //if(ctrlr.element) ctrlr.element.clearFocusedItem(ctrlr.API); // Window blur should refocus this on next focus, so we need this to stay...why was this added?
      if (cursor.selection) cursor.selection.jQ.addClass('mq-blur');
      if(cursor[L] instanceof Letter)
        cursor[L].autoOperator(cursor, (cursor.parent && cursor.parent.suppressAutoUnit) ? true : undefined);
      cursor.hide().parent.blur(); // synchronous with/in the same frame as
      ctrlr.closePopup();
      ctrlr.container.removeClass('mq-focused'); // clearing/blurring selection
      ctrlr.handle('blur');
    }
    ctrlr.blurred = true;
    cursor.hide().parent.blur();
  };
});

/**
 * TODO: I wanted to move MathBlock::focus and blur here, it would clean
 * up lots of stuff.
 *
 * Problem is, there's lots of calls to .focus()/.blur() on nodes
 * outside Controller::focusBlurEvents(), such as .postOrder('blur') on
 * insertion, which if MathBlock::blur becomes Node::blur, would add the
 * 'blur' CSS class to all Symbol's (because .isEmpty() is true for all
 * of them).
 *
 * I'm not even sure there aren't other troublesome calls to .focus() or
 * .blur(), so this is TODO for now.
 */
