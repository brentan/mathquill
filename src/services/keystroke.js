/*****************************************
 * Deals with the browser DOM events from
 * interaction with the typist.
 ****************************************/

Controller.open(function(_) {
  _.lastKeySpacebar = false;
  _.keystroke = function(key, evt) {
    this.cursor.delayPopups();
    this.cursor.parent.keystroke(key, evt, this);
    this.lastKeySpacebar = (this.cursor.parent === this.root) && (key == 'Spacebar');
  };
});

Node.open(function(_) {
  _.keystroke = function(key, e, ctrlr) {
    var cursor = ctrlr.cursor;
    switch (key) {
    case 'Ctrl-Shift-Backspace':
    case 'Ctrl-Backspace':
      while (cursor[L] || cursor.selection) {
        ctrlr.backspace();
      }
      break;

    case 'Shift-Backspace':
    case 'Backspace':
      ctrlr.backspace();
      break;

    case 'Enter':
      var el = ctrlr.mq_popup();
      if(el.length > 0) {
        //Find the element that is currently selected
        el.find('li.mq-popup-selected').click();
        break;
      }
      return;

    // Tab or Esc -> go one block right if it exists, else escape right.
    case 'Esc':
      var el = ctrlr.mq_popup();
      if(el.length > 0) {
        //Close the popup
        ctrlr.closePopup();
        break;
      }
      ctrlr.escapeDir(R, key, e);
      return;
    case 'Tab':
      var el = ctrlr.mq_popup();
      if(el.length > 0) {
        //Find the element that is currently selected
        el.find('li.mq-popup-selected').click();
        break;
      }
      if(ctrlr.cursor.initialPosition() && (ctrlr.element) && (ctrlr.element.indent) && ctrlr.element.indent(ctrlr.API, true)) {
        // tab pressed with cursor in initial position.  
        e.preventDefault();
        return;
      }
      ctrlr.escapeDir(R, key, e);
      return;

    case 'Shift-Esc':
      ctrlr.escapeDir(L, key, e);
      return;

    // End -> move to the end of the current block.
    case 'End':
      ctrlr.notify('move').cursor.insAtRightEnd(cursor.parent);
      ctrlr.cursor.workingGroupChange();
      break;

    // Ctrl-End -> move all the way to the end of the root block.
    case 'Ctrl-End':
    case 'Meta-Right':
      ctrlr.notify('move').cursor.insAtRightEnd(ctrlr.root);
      ctrlr.cursor.workingGroupChange();
      break;

    // Shift-End -> select to the end of the current block.
    case 'Shift-End':
      if((cursor.parent === ctrlr.root) && (cursor[R] === 0)) ctrlr.selectRight();
      while (cursor[R]) {
        ctrlr.selectRight();
      }
      break;

    // Ctrl-Shift-End -> select to the end of the root block.
    case 'Ctrl-Shift-End':
    case 'Meta-Shift-Right':
      if((cursor.parent === ctrlr.root) && (cursor[R] === 0)) ctrlr.selectRight();
      while (cursor[R] || cursor.parent !== ctrlr.root) {
        ctrlr.selectRight();
      }
      break;

    // Home -> move to the start of the root block or the current block.
    case 'Home':
      ctrlr.notify('move').cursor.insAtLeftEnd(cursor.parent);
      ctrlr.cursor.workingGroupChange();
      break;

    // Shift-Tab -> go one block left if it exists, else escape left.
    case 'Shift-Tab':
      if(ctrlr.cursor.initialPosition() && (ctrlr.element) && (ctrlr.element.indent) && ctrlr.element.indent(ctrlr.API, false)) {
        // shift-tab pressed with cursor in initial position.  
        e.preventDefault();
        return;
      } else if(ctrlr.cursor.initialPosition()) {
        ctrlr.escapeDir(L, key, e);
        return;
      }
      // IF not in first place, move to first place
    // Ctrl-Home -> move to the start of the current block.
    case 'Ctrl-Home':
    case 'Meta-Left':
      ctrlr.notify('move').cursor.insAtLeftEnd(ctrlr.root);
      ctrlr.cursor.workingGroupChange();
      break;

    // Shift-Home -> select to the start of the current block.
    case 'Shift-Home':
    case 'Shift-Meta-Left':
      if((cursor.parent === ctrlr.root) && (cursor[L] === 0)) ctrlr.selectLeft();
      while (cursor[L]) {
        ctrlr.selectLeft();
      }
      break;

    // Ctrl-Shift-Home -> move to the start of the root block.
    case 'Ctrl-Shift-Home':
    case 'Meta-Shift-Left':
      if((cursor.parent === ctrlr.root) && (cursor[L] === 0)) ctrlr.selectLeft();
      while (cursor[L] || cursor.parent !== ctrlr.root) {
        ctrlr.selectLeft();
      }
      break;

    case 'Left': ctrlr.moveLeft(); break;
    case 'Shift-Left': ctrlr.selectLeft(); break;
    case 'Ctrl-Left': break;

    case 'Right': 
      var el = ctrlr.mq_popup();
      if(el.length > 0) {
        //Close the popup
        ctrlr.closePopup();
        break;
      }
      ctrlr.moveRight(); 
      break;
    case 'Shift-Right': ctrlr.selectRight(); break;
    case 'Ctrl-Right': break;

    case 'Up': ctrlr.moveUp(); break;
    case 'Down': ctrlr.moveDown(); break;

    case 'Shift-Up':
      if (cursor[L]) {
        while (cursor[L]) ctrlr.selectLeft();
      } else {
        ctrlr.selectLeft();
      }
      break;
    case 'Shift-Down':
      if (cursor[R]) {
        while (cursor[R]) ctrlr.selectRight();
      }
      else {
        ctrlr.selectRight();
      }
      break;
    case 'Ctrl-Up': break;
    case 'Ctrl-Down': break;

    case 'Ctrl-Shift-Del':
    case 'Ctrl-Del':
      while (cursor[R] || cursor.selection) {
        ctrlr.deleteForward();
      }
      break;

    case 'Shift-Del':
    case 'Del':
      ctrlr.deleteForward();
      break;

    case 'Meta-A':
    case 'Ctrl-A':
      ctrlr.notify('move').cursor.insAtRightEnd(ctrlr.root);
      while (cursor[L]) ctrlr.selectLeft();
      break;

    default:
      return;
    }
    e.preventDefault();
    if(!ctrlr.blurred) ctrlr.scrollHoriz();
  };

  _.moveOutOf = // called by Controller::escapeDir, moveDir
  _.moveTowards = // called by Controller::moveDir
  _.deleteOutOf = // called by Controller::deleteDir
  _.deleteTowards = // called by Controller::deleteDir
  _.unselectInto = // called by Controller::selectDir
  _.selectOutOf = // called by Controller::selectDir
  _.selectTowards = // called by Controller::selectDir
    function() { pray('overridden or never called on this node'); };
});

Controller.open(function(_) {
  this.onNotify(function(e) {
    if (e === 'move' || e === 'upDown') this.show().clearSelection();
  });
  _.escapeDir = function(dir, key, e) {

    prayDirection(dir);
    var cursor = this.cursor;

    e.preventDefault();

    cursor.parent.moveOutOf(dir, cursor);
    cursor.workingGroupChange();
    return this.notify('move');
  };

  optionProcessors.leftRightIntoCmdGoes = function(updown) {
    if (updown && updown !== 'up' && updown !== 'down') {
      throw '"up" or "down" required for leftRightIntoCmdGoes option, '
            + 'got "'+updown+'"';
    }
    return updown;
  };
  _.moveDir = function(dir) {
    prayDirection(dir);
    var cursor = this.cursor, updown = cursor.options.leftRightIntoCmdGoes;

    if (cursor.selection) {
      cursor.insDirOf(dir, cursor.selection.ends[dir]);
    }
    else if (cursor[dir]) cursor[dir].moveTowards(dir, cursor, updown);
    else cursor.parent.moveOutOf(dir, cursor, updown);
    
    if(this.container.children('.mq-autocomplete').length > 0) {
      if(cursor[L] instanceof Variable) cursor[L].autoComplete();
      else if(cursor[R] instanceof Variable) cursor[R].autoComplete();
      else if((cursor[L] instanceof SupSub) && (cursor[L].supsub == 'sub') && (cursor[L].sub.ends[R])) cursor[L].sub.ends[R].autoComplete();
      else this.container.children('.mq-autocomplete').remove();
    }

    cursor.workingGroupChange();
    return this.notify('move');
  };
  _.moveLeft = function() { return this.moveDir(L); };
  _.moveRight = function() { 
    if(this.cursor[L] instanceof Letter) 
      this.cursor[L].autoOperator(this.cursor, (this.cursor.parent && this.cursor.parent.suppressAutoUnit) ? true : undefined,false,true);
    return this.moveDir(R); 
  };

  /**
   * moveUp and moveDown have almost identical algorithms:
   * - first check left and right, if so insAtLeft/RightEnd of them
   * - else check the parent's 'upOutOf'/'downOutOf' property:
   *   + if it's a function, call it with the cursor as the sole argument and
   *     use the return value as if it were the value of the property
   *   + if it's a Node, jump up or down into it:
   *     - if there is a cached Point in the block, insert there
   *     - else, seekHoriz within the block to the current x-coordinate (to be
   *       as close to directly above/below the current position as possible)
   *   + unless it's exactly `true`, stop bubbling
   */
  _.moveUp = function() { return moveUpDown(this, 'up'); };
  _.moveDown = function() { return moveUpDown(this, 'down'); };
  function moveUpDown(self, dir) {
    // Test if a popup menu (autocomplete or units menu) is currently active
    var el = self.mq_popup();
    if(el.length > 0) {
      //Find the element that is currently selected
      var current_selection = el.find('li.mq-popup-selected');
      var to_select = dir === 'up' ? current_selection.prev('li') : current_selection.next('li');
      if(to_select.length == 0) return self;
      current_selection.removeClass('mq-popup-selected');
      to_select.addClass('mq-popup-selected');
      return self;
    }

    var cursor = self.notify('upDown').cursor;
    var dirInto = dir+'Into', dirOutOf = dir+'OutOf';
    if (cursor[R][dirInto]) cursor.insAtLeftEnd(cursor[R][dirInto]);
    else if (cursor[L][dirInto]) cursor.insAtRightEnd(cursor[L][dirInto]);
    else {
      cursor.parent.bubble(function(ancestor) {
        var prop = ancestor[dirOutOf];
        if (prop) {
          if (typeof prop === 'function') prop = ancestor[dirOutOf](cursor);
          if (prop instanceof Node) cursor.jumpUpDown(ancestor, prop);
          if (prop !== true) return false;
        }
      });
    }
    cursor.workingGroupChange();
    return self;
  }
  this.onNotify(function(e) { if (e !== 'upDown') this.upDownCache = {}; });

  this.onNotify(function(e) { if (e === 'edit') this.show().deleteSelection(); });
  _.deleteDir = function(dir) {
    if(this.errorBlock) {
      this.errorBlock.remove();
      this.errorBlock = 0;
    }
    prayDirection(dir);
    var cursor = this.cursor;

    var hadSelection = cursor.selection;
    if(hadSelection) cursor.controller.scheduleUndoPoint();
    this.notify('edit'); // deletes selection if present
    if (!hadSelection) {
      if (cursor[dir]) {
        cursor.controller.scheduleUndoPoint();
        cursor[dir].deleteTowards(dir, cursor);
      } else {
        if(cursor.parent != cursor.controller.root) cursor.controller.scheduleUndoPoint();
        cursor.parent.deleteOutOf(dir, cursor);
      }
    }

    if (cursor[L].siblingDeleted) cursor[L].siblingDeleted(cursor.options, R);
    if (cursor[R].siblingDeleted) cursor[R].siblingDeleted(cursor.options, L);
    cursor.parent.bubble('reflow');
    cursor.workingGroupChange();
    cursor.controller.reviveGhost();

    return this;
  };
  _.backspace = function() { return this.deleteDir(L); };
  _.deleteForward = function() { return this.deleteDir(R); };

  this.onNotify(function(e) { if (e !== 'select') this.endSelection(); });
  _.selectDir = function(dir) {
    var cursor = this.notify('select').cursor, seln = cursor.selection;
    prayDirection(dir);

    if (!cursor.anticursor) cursor.startSelection();

    var node = cursor[dir];
    if (node) {
      // "if node we're selecting towards is inside selection (hence retracting)
      // and is on the *far side* of the selection (hence is only node selected)
      // and the anticursor is *inside* that node, not just on the other side"
      if (seln && seln.ends[dir] === node && cursor.anticursor[-dir] !== node) {
        node.unselectInto(dir, cursor);
      }
      else node.selectTowards(dir, cursor);
    }
    else cursor.parent.selectOutOf(dir, cursor);

    cursor.clearSelection();
    cursor.select() || cursor.show();
  };
  _.selectLeft = function() { return this.selectDir(L); };
  _.selectRight = function() { return this.selectDir(R); };
});
