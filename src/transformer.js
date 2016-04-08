module.exports = transformer;

var slice = Array.prototype.slice;

function traverser(ast, visitor) {
  function traverseArray(array, parent) {
    array.forEach(function(child) {
      traverseNode(child, parent);
    });
  }

  function traverseNode(node, parent) {
    var method = visitor[node.type];

    if (method) {
      method(node, parent);
    }

    switch (node.type) {
      case 'Program':
        traverseArray(node.body, node);
        break;

      case 'CallExpression':
        traverseArray(node.params, node);
        break;

      case 'Assignment':
        traverseArray(node.expression.params, node);
        break;

      case 'ReturnStatement':
        traverseNode(node.expression, node);

      case 'Value':
      case 'MathLiteral':
      case 'MathExpression':
      case 'NumberLiteral':
        break;

      default:
        notImplemented(node.type);
    }
  }

  traverseNode(ast, null);
}

function transformer(ast) {
  var newAst = {
    type: 'Program',
    body: []
  };

  ast._context = newAst.body;

  traverser(ast, {
    NumberLiteral: function(node, parent) {
      parent._context.push({
        type: 'NumberLiteral',
        value: node.value
      });
    },

    MathLiteral: function(node, parent){
      parent._context.push({
        type: 'MathLiteral',
        value: node.value
      });
    },

    MathExpression: function(node, parent){
      parent._context.push({
        type: 'MathExpression',
        params: slice.call(node.params)
      });
    },

    CallExpression: function(node, parent) {
      var expression = {
        type: 'CallExpression',
        callee: {
          type: 'Identifier',
          name: node.name
        },
        arguments: []
      };

      node._context = expression.arguments;

      if (parent.type !== 'CallExpression') {
        expression = {
          type: 'ExpressionStatement',
          expression: expression
        };
      }

      parent._context.push(expression);
    },

    Assignment: function(node, parent) {
      var context = parent._context;
      var args = [];

      while(context.length && last(context).type === 'Value') {
        args.unshift(context.pop());
      }
      var value = args.shift();

      var expression;

      // This is a function
      if(args.length) {
        var params = node.expression.params;
        params.push({
          type: 'ReturnStatement',
          expression: params.pop()
        });

        expression = {
          type: 'FunctionAssignment',
          value: value,
          expression: {
            type: 'FunctionExpression',
            arguments: args,
            body: []
          }
        };
        node._context = expression.expression.body;
      } else {
        expression = {
          type: 'Assignment',
          value: value,
          expression: {
            type: 'AssignmentExpression',
            params: []
          }
        };
        node._context = expression.expression.params;
      }

      context.push(expression);
    },

    Value: function(node, parent) {
      parent._context.push({
        type: 'Value',
        name: node.name
      });
    },

    ReturnStatement: function(node, parent) {
      var ret = {
        type: 'ReturnStatement',
        params: []
      };
      node._context = ret.params;
      parent._context.push(ret);
    }
  });

  return newAst;
}

function notImplemented(type){
  var msg = 'Transformer does not yet support ' + type;
  throw new TypeError(msg);
}

function last(arr) {
  return arr[arr.length - 1];
}