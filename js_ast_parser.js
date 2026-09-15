/**
 * Node JS AST Route Extractor for Express.js (JS & TS)
 * Uses @babel/parser and @babel/traverse to accurately parse AST.
 */

const fs = require('fs');
const babelParser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

function parseExpressCode(code, filename = 'app.js') {
  let ast;
  try {
    ast = babelParser.parse(code, {
      sourceType: 'module',
      plugins: [
        'typescript',
        'jsx',
        ['decorators', { decoratorsBeforeExport: true }],
        'classProperties',
        'objectRestSpread',
        'optionalChaining',
        'nullishCoalescing'
      ],
      attachComment: true,
      tokens: true,
    });
  } catch (err) {
    try {
      ast = babelParser.parse(code, {
        sourceType: 'script',
        plugins: ['typescript', 'jsx', 'classProperties'],
        attachComment: true,
      });
    } catch (e2) {
      return { error: e2.message, endpoints: [] };
    }
  }

  const routerPrefixes = {}; // var_name -> prefix string
  const endpoints = [];
  const HTTP_METHODS = new Set(['get', 'post', 'put', 'delete', 'patch', 'options', 'head', 'all']);

  // Pass 1: Collect router mount prefixes (e.g. app.use('/api/v1', userRouter))
  traverse(ast, {
    CallExpression(path) {
      const callee = path.node.callee;
      if (callee.type === 'MemberExpression') {
        const objectName = callee.object.name;
        const propertyName = callee.property.name;

        if (propertyName === 'use' && path.node.arguments.length >= 2) {
          const firstArg = path.node.arguments[0];
          const secondArg = path.node.arguments[1];

          if ((firstArg.type === 'StringLiteral' || firstArg.type === 'Literal') && secondArg.type === 'Identifier') {
            const prefix = firstArg.value;
            const routerVar = secondArg.name;
            routerPrefixes[routerVar] = prefix;
          }
        }
      }
    }
  });

  // Pass 2: Extract endpoints
  traverse(ast, {
    CallExpression(path) {
      const callee = path.node.callee;
      if (callee.type !== 'MemberExpression') return;

      const varName = callee.object.name || (callee.object.type === 'MemberExpression' ? callee.object.property.name : 'app');
      const methodName = callee.property.name ? callee.property.name.toLowerCase() : '';

      if (!HTTP_METHODS.has(methodName)) return;

      const args = path.node.arguments;
      if (args.length === 0) return;

      // Extract route path string
      let routePath = '/';
      const firstArg = args[0];
      if (firstArg.type === 'StringLiteral' || firstArg.type === 'Literal') {
        routePath = firstArg.value;
      } else if (firstArg.type === 'TemplateLiteral') {
        routePath = firstArg.quasis.map(q => q.value.raw).join('{param}');
      } else {
        return; // Non-literal paths skipped
      }

      // Apply router prefix
      const prefix = routerPrefixes[varName] || '';
      let fullPath = routePath;
      if (prefix) {
        fullPath = (prefix.replace(/\/$/, '') + '/' + routePath.replace(/^\//, '')).replace(/\/$/, '');
        if (!fullPath) fullPath = '/';
      }

      // Extract middleware and handler names
      const middlewares = [];
      let handlerName = 'anonymousHandler';

      for (let i = 1; i < args.length; i++) {
        const arg = args[i];
        if (arg.type === 'Identifier') {
          if (i === args.length - 1) {
            handlerName = arg.name;
          } else {
            middlewares.push(arg.name);
          }
        } else if (arg.type === 'FunctionExpression' || arg.type === 'ArrowFunctionExpression') {
          if (i === args.length - 1) {
            handlerName = arg.id ? arg.id.name : `handler_line_${arg.loc ? arg.loc.start.line : 1}`;
          }
        }
      }

      // Extract JSDoc / comments leading up to this statement or call expression
      let docstring = null;
      const leadingComments = path.node.leadingComments || path.parentPath.node.leadingComments;
      if (leadingComments && leadingComments.length > 0) {
        docstring = leadingComments
          .map(c => c.value.replace(/^\*+\s?/gm, '').trim())
          .filter(Boolean)
          .join('\n');
      }

      // Extract path parameters (e.g., :id -> {id})
      const pathParams = [];
      const cleanPath = fullPath.replace(/:([a-zA-Z0-9_]+)/g, (match, paramName) => {
        pathParams.push({
          name: paramName,
          type: 'string',
          location: 'path',
          required: true,
        });
        return `{${paramName}}`;
      });

      const httpMethod = methodName === 'all' ? 'GET' : methodName.toUpperCase();
      const lineNum = path.node.loc ? path.node.loc.start.line : 1;
      const epId = `express_${httpMethod}_${cleanPath.replace(/[^a-zA-Z0-9]/g, '_')}_${lineNum}`;

      // Request body for POST/PUT/PATCH
      let requestBody = null;
      if (['POST', 'PUT', 'PATCH'].includes(httpMethod)) {
        requestBody = {
          content_type: 'application/json',
          description: 'JSON request payload',
          fields: []
        };
      }

      endpoints.push({
        id: epId,
        file_path: filename,
        framework: 'express',
        method: httpMethod,
        path: cleanPath,
        handler_name: handlerName,
        docstring: docstring,
        parameters: pathParams,
        request_body: requestBody,
        response_info: {
          status_code: 200,
          type_annotation: 'json',
          description: 'HTTP Response'
        },
        auth_middleware: middlewares,
        tags: [varName !== 'app' ? varName : 'default'],
        line_number: lineNum
      });
    }
  });

  return { endpoints };
}

// CLI Execution mode
if (require.main === module) {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error(JSON.stringify({ error: 'No file path provided' }));
    process.exit(1);
  }

  try {
    const code = fs.readFileSync(filePath, 'utf8');
    const result = parseExpressCode(code, filePath);
    console.log(JSON.stringify(result));
  } catch (err) {
    console.error(JSON.stringify({ error: err.message, endpoints: [] }));
    process.exit(1);
  }
}

module.exports = { parseExpressCode };
