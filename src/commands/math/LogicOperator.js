
var LogicOperator = P(BinaryOperator, function(_, super_) {
  _.init = function(ch) {
    var latex = '\\' + ch + ' ';
    var htmlTemplate = '<span class="mq-logic-operator">' + ch + '</span>';
    var textTemplate = ' ' + ch + ' '; 
    super_.init.call(this, latex, htmlTemplate, textTemplate);
  };
  _.finalizeTree = function() {
    if((this[L] instanceof BinaryOperator) && (this[L].ctrlSeq === '\\cdot '))
      this[L].remove();
  };
});

var logicOperators = ['or','and','xor'];
for(var i = 0; i < logicOperators.length; i++)
  LatexCmds[logicOperators[i]] =  bind(LogicOperator, logicOperators[i]);

var TrueFalse = P(BinaryOperator, function(_, super_) {
  _.init = function(ch) {
    var latex = '\\' + ch + ' ';
    var htmlTemplate = '<span class="mq-' + ch + '">' + ch + '</span>';
    var textTemplate = ' ' + ch + ' '; 
    super_.init.call(this, latex, htmlTemplate, textTemplate);
  };
  _.finalizeTree = function() {
    if((this[L] instanceof BinaryOperator) && (this[L].ctrlSeq === '\\cdot '))
      this[L].remove();
  };
});

var trueFalseOperators = ['true','false'];
for(var i = 0; i < trueFalseOperators.length; i++)
  LatexCmds[trueFalseOperators[i]] =  bind(TrueFalse, trueFalseOperators[i]);
