
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
        var number = 0;
        for(var i = this.parent; i !== 0; i = i.parent)
          if(i instanceof Matrix) number++;
        ctrlSeq += number;

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
      _.nested = false; // Only used during parse command, where it is also set.  Using it elsewhere may result in erroneous result
      _.parser = function () {
        var regex = Parser.regex;
        return regex(/^\{[pbvBV]?matrix([0-9]+)\}[\s\S]*?\\end\{[pbvBV]?matrix\1\}/).map(function (body) {
          if(body.substring(1,1) == 'm') 
            var command = body.substring(1,7);
          else 
            var command = body.substring(1,8);
          var id = body.replace(/^[\s\S]*\\end\{[pbvBV]?matrix([0-9]+)\}$/,'$1')*1;
          body = body.replace(/^\{[pbvBV]?matrix[0-9]+\}/,'').replace(/\\end\{[pbvBV]?matrix[0-9]+\}$/,'');
          // Lets see if we are nested
          var child_blocks = [];
          var nested = false;
          var child = '';
          while(true) {
            if(!body.match(RegExp("^[\\s\\S]*\\{[pbvBV]?matrix" + (id+1) + "\\}[\\s\\S]*$",''))) break;
            // We have a nested matrix.  We should extract the child(ren) and parse them on their own.  To keep errors from popping up, we simply extract here for later parsing
            nested = true; //need to push in to 'matrix' below
            child = body.replace(RegExp("^[\\s\\S]*(\\\\begin[\\s]*\\{[pbvBV]?matrix" + (id+1) + "\\}[\\s\\S]*?\\\\end\\{[pbvBV]?matrix" + (id + 1) + "\\})[\\s\\S]*$",''),"$1");
            body = body.replace(RegExp("^([\\s\\S]*)\\\\begin[\\s]*\\{[pbvBV]?matrix" + (id+1) + "\\}[\\s\\S]*?\\\\end\\{[pbvBV]?matrix" + (id + 1) + "\\}([\\s\\S]*)$",''),"$1{BLOCK" + child_blocks.length + '}$2');
            child_blocks.push(child);
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
          matrix.nested = nested;

          var blocks = matrix.blocks = Array(matrix.numBlocks());
          for (var i = 0; i < blocks.length; i++) {
            while(true) {
              if(!cells[i].match(/\{BLOCK[0-9]+\}/)) break;
              // This cell holds its own matrix.  Insert the matrix code into this cell so it can be properly parsed.
              var cid = cells[i].replace(/^[\s\S]*\{BLOCK([0-9]+)\}[\s\S]*$/,"$1") * 1;
              cells[i] = cells[i].replace(RegExp("\\{BLOCK" + cid + "\\}",''),child_blocks[cid]);
            }
            var newBlock = blocks[i] = latexMathParser.parse(cells[i]);
            newBlock.deleteOutOf = MatrixMathBlock().deleteOutOf;
            newBlock.adopt(matrix, matrix.ends[R], 0);
          }
          // Check if we are list of equal sized, non-nested lists.  This means emgiac returned a matrix as a list of lists, and we should return to matrix form
          child = matrix.ends[L];
          if(matrix.nested && (rowsCount == 1) && child && (child.ends[L] === child.ends[R]) && (child.ends[L] instanceof Matrix) && !child.ends[L].nested && (child.ends[L].row == 1)) {
            var is_list_of_lists = true;
            var size = child.ends[L].col;
            for(child = child[R]; child !== 0; child = child[R]) {
              if(!(child.ends[L] instanceof Matrix) || (child.ends[L] !== child.ends[R]) || child.ends[L].nested || (child.ends[L].row != 1) || (child.ends[L].col != size)) {
                is_list_of_lists = false;
                break;
              }
            }
            if(is_list_of_lists) {
              var new_matrix = Matrix('\\' + command, matrix.ends[L].ends[L].col, colsCount);
              new_matrix.blocks = Array(new_matrix.numBlocks());
              var i = 0;
              var next = 0;
              for(child = matrix.ends[L]; child !== 0; child = child[R]) {
                for(var el = child.ends[L].ends[L]; el !== 0; el = next) {
                  next = el[R];
                  el.adopt(new_matrix, new_matrix.ends[R], 0);
                  new_matrix.blocks[i] = el;
                  i++;
                }
              }
              return new_matrix;
            }
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
        cursor.workingGroupChange();
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
        cursor.workingGroupChange();
      }
      _.createBlocks = function() {
        var cmd = this,
          numBlocks = cmd.numBlocks(),
          blocks = cmd.blocks = Array(numBlocks);

        for (var i = 0; i < numBlocks; i += 1) {
          var newBlock = blocks[i] = MatrixMathBlock();
          newBlock.adopt(cmd, cmd.ends[R], 0);
        }
      };
      _.insertRow = function(cursor, dir) {
        //Insert a row into the matrix immediately after the cell the cursor is in, then move cursor.
        //If the comma is inserted at the beginning of a cell with content, insert BEFORE the cell.
        var cell = this.cursorRowCol(cursor);
        if(typeof dir === 'undefined')
          var insertBefore = ((cursor[L] === 0) && (cursor[R] !== 0));
        else
          var insertBefore = dir == L ? true : false;
        var startIndex = cell.row * this.col + (insertBefore ? 0 : this.col);
        // Add in the new row
        if(insertBefore)
          this.jQ.children(".mq-matrix").first().children(".mq-row").eq(cell.row).before('<span class="mq-row"></span>');
        else
          this.jQ.children(".mq-matrix").first().children(".mq-row").eq(cell.row).after('<span class="mq-row"></span>');
        for(var i=0; i<this.col; i++) {
          var newCell = MatrixMathBlock();
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
        cursor.workingGroupChange();
      }
      _.insertColumn = function(cursor, dir) {
        //Insert a column into the matrix immediately after the cell the cursor is in, then move cursor.
        //If the comma is inserted at the beginning of a cell with content, insert BEFORE the cell.
        var cell = this.cursorRowCol(cursor);
        if(typeof dir === 'undefined')
          var insertBefore = ((cursor[L] === 0) && (cursor[R] !== 0));
        else
          var insertBefore = dir == L ? true : false;

        // Add in the new column
        for(var i=(this.row - 1); i >= 0; i--) {  //Increment backwards so that block element indexes dont shift as we go
          var newCell = MatrixMathBlock();
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
        cursor.workingGroupChange();
      }
      _.moveOrInsertColumn = function(cursor) {
        var cell = this.cursorRowCol(cursor);
        if((cell.col + 1) == this.col) return this.insertColumn(cursor);
        cursor.insAtLeftEnd(cursor.parent[R]);
        cursor.workingGroupChange();
      }
    });
LatexCmds.matrix = bind(Matrix, '\\matrix', 1, 1);
LatexCmds.bmatrix = bind(Matrix, '\\bmatrix', 1, 1);
LatexCmds.Bmatrix = bind(Matrix, '\\Bmatrix', 1, 1);
LatexCmds.vmatrix = bind(Matrix, '\\vmatrix', 1, 1);
LatexCmds.Vmatrix = bind(Matrix, '\\Vmatrix', 1, 1);
LatexCmds.pmatrix = bind(Matrix, '\\pmatrix', 1, 1);
var MatrixMathBlock = P(MathBlock, function(_, super_) {
  _.deleteOutOf = function(dir, cursor) {
    if(this.ends[L] === 0) {
      if (dir === L)
        var to_place_cursor = this[L];
      else
        var to_place_cursor = this[R];
      this.parent.deleteColumn(cursor);
      if(dir === L)
        if(to_place_cursor) cursor.insAtRightEnd(to_place_cursor);
      else
        if(to_place_cursor) cursor.insAtLeftEnd(to_place_cursor);
    } else {
      var to_remove = this[dir];
      var location = this.parent.cursorRowCol(cursor);
      if((dir === L) && (location.col === 0)) to_remove = 0;
      if((dir === R) && ((location.col + 1) === this.parent.col)) to_remove = 0;
      if(to_remove === 0) {
        if(this.parent[L]) {
          var cursor_target = this.parent[L];
          this.parent.remove();
          cursor.insRightOf(cursor_target);
        } else {
          var cursor_target = this.parent.parent;
          this.parent.remove();
          cursor.insAtLeftEnd(cursor_target);
        }
      } else {
        for(var el= to_remove.ends[L]; el !== 0; el = el[R])
          el.remove();
        cursor.insAtRightEnd(to_remove);
        this.parent.deleteColumn(cursor);
        if(dir === L)
          cursor.insAtLeftEnd(this);
        else
          cursor.insAtRightEnd(this);
      }
    }
  };
});
