Controller.open(function(_) {
  _.focusBlurEvents = function() {
    var ctrlr = this, root = ctrlr.root, cursor = ctrlr.cursor;
    ctrlr.focus = function() {
      ctrlr.blurred = false;
      if(ctrlr.unitMode) return;
      if(ctrlr.element) ctrlr.element.setFocusedItem(ctrlr.API);
      ctrlr.container.addClass('mq-focused');
      if (!cursor.parent)
        cursor.insAtRightEnd(root);
      if (cursor.selection) { 
        cursor.selection.jQ.removeClass('mq-blur');
        ctrlr.selectionChanged(); //re-select textarea contents after tabbing away and back
      } else if(cursor.anticursor) {
        cursor.select();
      } else
        cursor.show();
      if(ctrlr.element) {
        ctrlr.element.worksheet.attachToolbar(ctrlr.API, ctrlr.element.worksheet.toolbar.mathToolbar());
        if(ctrlr.staticMode) ctrlr.element.worksheet.blurToolbar(this.API);
      }
    };
    ctrlr.blur = function() { // not directly in the textarea blur handler so as to be
      ctrlr.blurred = true;
      if(ctrlr.unitMode) {
        ctrlr.element.unitChosen(ctrlr.API.latex());
        return;
      }
      ctrlr.destroyTooltip();
      if(ctrlr.element) ctrlr.element.worksheet.blurToolbar(ctrlr.API);
      if(ctrlr.element) ctrlr.element.clearFocusedItem(ctrlr.API);
      root.postOrder('intentionalBlur'); // none, intentional blur: #264
      cursor.clearSelection();
      cursor.hide().parent.blur(); // synchronous with/in the same frame as
      ctrlr.closePopup();
      ctrlr.container.removeClass('mq-focused'); // clearing/blurring selection
      ctrlr.handle('blur');
    };
    ctrlr.windowBlur = function() {
      ctrlr.blurred = true;
      if(ctrlr.unitMode) {
        ctrlr.element.unitChosen(ctrlr.API.latex());
        return;
      }
      if(ctrlr.element) ctrlr.element.clearFocusedItem(ctrlr.API);
      if (cursor.selection) cursor.selection.jQ.addClass('mq-blur');
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
