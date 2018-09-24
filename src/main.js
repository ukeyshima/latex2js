const katex = require('katex');
const mathjs = require('mathjs');
const mathIntegral = require('mathjs-simple-integral');
const atl = require('asciimath-to-latex');
const acorn = require('acorn');

let code = '';
mathjs.import(mathIntegral);
let latex2js,
  radix,
  frac,
  pow,
  sin,
  cos,
  tan,
  leftright,
  naturalLog,
  log,
  sum,
  definiteIntegral,
  indefiniteIntegral,
  differential,
  limit,
  matrix,
  dot,
  matrixMultiplication,
  matrixOperations,
  matrixShape,
  shape,
  nextMulti,
  inverse;

radix = input => {
  return input.index
    ? `Math.pow(${shape(input.body)},1/${shape(input.index.body)})`
    : input.body.body[0].type === 'leftright'
      ? `Math.sqrt${shape(input.body.body)}`
      : `Math.sqrt(${shape(input.body.body)})`;
};

frac = input => {
  return `${shape(input.numer.body)}/${shape(input.denom.body)}`;
};

pow = input => {
  return `Math.pow(${
    input.base.type === 'leftright' ? shape(input.base.body) : shape(input.base)
  },${
    input.sup.body[0].type === 'leftright'
      ? shape(input.sup.body[0].body)
      : shape(input.sup.body)
  })`;
};

sin = input => {
  return input.type === 'leftright'
    ? `Math.sin${shape(input)}`
    : `Math.sin(${shape(input)})`;
};

cos = input => {
  return input.type === 'leftright'
    ? `Math.cos${shape(input)}`
    : `Math.cos(${shape(input)})`;
};

tan = input => {
  return input.type === 'leftright'
    ? `Math.tan${shape(input)}`
    : `Math.tan(${shape(input)})`;
};

leftright = input => {
  let left = '(';
  let right = ')';
  if (input.left === '[') {
    left = 'Math.floor(';
  }
  return `${left}${shape(input.body)}${right}`;
};

naturalLog = input => {
  return input.type === 'leftright'
    ? `Math.log${shape(input)}`
    : `Math.log(${shape(input)})`;
};

log = input => {
  const base = shape(input[0].sub.body);
  const expression = input[1];
  return expression.type === 'leftright'
    ? `Math.log${shape(expression)}/Math.log(${base})`
    : `Math.log(${shape(expression)})/Math.log(${base})`;
};

sum = input => {
  const expression = shape(input.slice(1, input.length));
  const index = input[0].sub.body.findIndex(e => {
    return e.type === 'atom' && e.text === '=';
  });
  const startVari = shape(input[0].sub.body.slice(0, index));
  const startValu = shape(
    input[0].sub.body.slice(index + 1, input[0].sub.body.length)
  );
  const end = shape(input[0].sup.body);
  return `((() => {
        let result = 0;
        for(let ${startVari}=${startValu};${startVari}<${end};${startVari}++){
            result += ${expression};
        }
        return result;
    })())`;
};

definiteIntegral = (input, deltaIndex) => {
  const start = shape(input[0].sub.body);
  const end = shape(input[0].sup.body);
  const expression = shape(input.slice(1, deltaIndex)).replace(/Math\./g, '');
  const val = shape(input[deltaIndex + 1]);
  return `((${val}=>{return ${latex2js(
    atl(mathjs.integral(expression, val).toString())
  )}})(${end})-(${val}=>{return ${latex2js(
    atl(mathjs.integral(expression, val).toString())
  )}})(${start}))`;
};

indefiniteIntegral = (input, deltaIndex) => {
  const expression = shape(input.slice(1, deltaIndex)).replace(/Math\./g, '');
  const val = shape(input[deltaIndex + 1]);
  return `(${latex2js(atl(mathjs.integral(expression, val).toString()))})`;
};

differential = input => {
  const expression = shape(input.base)
    .replace(/Math\./g, '')
    .replace(/pow\((.*)\,(.*)\)/g, '$1^$2');
  return mathjs.derivative(expression, 'x').toString();
};

limit = input => {
  const index = input[0].sub.body.findIndex(e => {
    return e.value === '\\rightarrow';
  });
  return `((${shape(input[0].sub.body.slice(0, index - 1))})=>${shape(
    input[1]
  )})(${shape(input[0].sub.body.slice(index, input[0].sub.body.length))})`;
};

matrix = input => {
  if (!input.hasOwnProperty('type')) {
    return input;
  }
  if (input.type === 'textord' || input.type === 'mathord') {
    return input.text;
  }
  return input.body[0].body.map(e => {
    return e.map(f => {
      return shape(f);
    });
  });
};

inverse = input => {};

dot = (input1, input2) => {
  let result = '';
  input1.forEach((e, i) => {
    result += `+${e}*${input2[i]}`;
  });
  return `(${result})`;
};

matrixMultiplication = (array, input) => {
  input = [matrix(input)];
  input.unshift(array);
  return (() => {
    if (!Array.isArray(input[0])) {
      return input[1].map(e => {
        return e.map(f => {
          return `(${input[0]}*${f})`;
        });
      });
    } else if (input[0][0].length === 1 && input[1][0].length === 1) {
      return dot(input[0], input[1]);
    } else {
      return (input => {
        const o = [];
        input[0].forEach((e, j) => {
          const q = [];
          e.some((f, k) => {
            let r = '';
            for (let i = 0; i < e.length; i++) {
              r += `+${e[i]}*${input[1][i][k]}`;
            }
            r = '(' + r.slice(1, r.length) + ')';
            q.push(r);
            if (k === input[1].length - 1) return true;
          });
          o.push(q);
        });
        return o;
      })(input);
    }
  })();
};

matrixOperations = (array, input, operations) => {
  console.log(array);
  console.log(input);
  const o = [];
  array.forEach((e, j) => {
    const q = [];
    e.forEach((f, k) => {
      q.push(f + operations + input[j][k]);
    });
    o.push(q);
  });
  console.log(o);
  return o;
};

matrixShape = (array, input) => {
  if (input.length === 0) {
    return array;
  }
  let result = '';
  if (!input[0].hasOwnProperty('type')) {
    result =
      input.length > 1
        ? matrixShape(
            matrixMultiplication(array, input[0][0]),
            input.slice(1, input.length)
          )
        : matrixMultiplication(array, input[0][0]);
  } else {
    switch (input[0].type) {
      case 'leftright':
        result =
          input.length > 1
            ? matrixShape(
                matrixMultiplication(array, input[0]),
                input.slice(1, input.length)
              )
            : matrixMultiplication(array, input[0]);
        break;
      case 'atom':
        switch (input[0].text) {
          case '=':
            result = `${(() => {
              const jsParse = acorn.parse(code);
              return jsParse.body.find(e => {
                return (
                  e.type === 'VariableDeclaration' &&
                  e.declarations[0].id.name === array
                );
              })
                ? array
                : `let ${array}`;
            })(array)}=${
              input.length > 2
                ? (() => {
                    input[1] = input[1].hasOwnProperty('type')
                      ? input[1]
                      : input[1][0];
                    return Array.isArray(
                      matrixShape(
                        matrix(input[1]),
                        input.slice(2, input.length)
                      )
                    )
                      ? `[${matrixShape(
                          matrix(input[1]),
                          input.slice(2, input.length)
                        )}]`
                      : matrixShape(
                          matrix(input[1]),
                          input.slice(2, input.length)
                        );
                  })()
                : `[${matrix(input[1])}]`
            }`;
            break;
          case '*':
            result = (() => {
              input[1] = input[1].hasOwnProperty('type')
                ? input[1]
                : input[1][0];
              return input.length > 2
                ? matrixShape(
                    matrixMultiplication(array, input[1]),
                    input.slice(2, input.length)
                  )
                : matrixMultiplication(array, input[1]);
            })();
            break;
          default:
            result = (() => {
              input[1] = input[1].hasOwnProperty('type')
                ? input[1]
                : input[1][0];
              return input.length > 2
                ? matrixShape(
                    matrixOperations(array, matrix(input[1]), input[0].text),
                    input.slice(2, input.length)
                  )
                : matrixOperations(array, matrix(input[1]), input[0].text);
            })();
            break;
        }
        break;
      case 'supsub':
        console.log(input[0].sup.body[0].text);
        result =
          input.length > 1
            ? matrixShape(inverse(input[0].base), input.slice(1, input.length))
            : inverse(input[0].base);
    }
  }
  return result;
};

nextMulti = (input, num) => {
  return input.length > num
    ? (input[num].type !== 'atom' &&
      input[num].type !== 'punct' &&
      input[num].type !== 'bin' &&
      input[num].type !== 'spacing'
        ? '*'
        : '') + shape(input.slice(num, input.length))
    : ``;
};

shape = input => {
  let result;
  if (!Array.isArray(input)) {
    switch (typeof input) {
      case 'object':
        input = [input];
        break;
      case 'string':
        return input;
      default:
        break;
    }
  }
  switch (input[0].type) {
    case 'textord':
      result = `${input[0].text === '\\infty' ? Infinity : input[0].text}${
        input.length > 1
          ? (input[1].type !== 'textord' &&
            input[1].type !== 'atom' &&
            input[1].type !== 'bin' &&
            input[1].type !== 'spacing'
              ? '*'
              : '') + shape(input.slice(1, input.length))
          : ``
      }`;
      break;
    case 'mathord':
      result = `${
        input[0].text === '\\pi'
          ? `Math.PI`
          : input.length > 1 &&
            input[1].type === 'atom' &&
            input[1].text === '='
            ? (() => {
                const jsParse = acorn.parse(code);
                return jsParse.body.find(e => {
                  return (
                    e.type === 'VariableDeclaration' &&
                    e.declarations[0].id.name === input[0].text
                  );
                })
                  ? input[0].text
                  : `let ${input[0].text}`;
              })()
            : input[0].text
      }${
        input.length > 1
          ? input[1].type === 'leftright' &&
            input[1].left === '[' &&
            input[1].right === ']'
            ? (() => {
                let index = input.slice(1, input.length).findIndex(e => {
                  return !(
                    e.type === 'leftright' &&
                    e.left === '[' &&
                    e.right === ']'
                  );
                });
                index = index === -1 ? input.length - 1 : index;
                const array = input.slice(2, index + 1);
                array.unshift(`[${shape(input[1].body)}]`);
                return `${array.reduce((pre, cur) => {
                  return pre + `[${shape(cur.body)}]`;
                })}${
                  input.length > index + 1
                    ? (input[index + 1].type !== 'atom' &&
                      input[index + 1].type !== 'punct' &&
                      input[index + 1].type !== 'bin' &&
                      input[index + 1].type !== 'spacing' &&
                      (input[index + 1].type === 'leftright'
                        ? shape(input[index + 1]).length !== 3 &&
                          !/\,/.test(shape(input[index])) &&
                          !input[index + 1].left === '['
                        : true)
                        ? `*`
                        : ``) + shape(input.slice(index + 1, input.length))
                    : ``
                }`;
              })()
            : (input[1].type !== 'atom' &&
              input[1].type !== 'punct' &&
              input[1].type !== 'bin' &&
              input[1].type !== 'spacing' &&
              (input[1].type === 'leftright'
                ? shape(input[1]).length !== 3 &&
                  !/\,/.test(shape(input[1])) &&
                  !input[1].left === '['
                : true)
                ? `*`
                : ``) + shape(input.slice(1, input.length))
          : ``
      }`;
      break;
    case 'spacing':
      result = `],[${
        input.length > 1 ? shape(input.slice(1, input.length)) : ''
      }`;
      break;
    case 'styling':
      result = shape(input[0].body);
      break;
    case 'atom':
      switch (input[0].text) {
        case '\\cdot':
          result = '*';
          break;
        default:
          result = input[0].text;
          break;
      }
      result += input.length > 1 ? shape(input.slice(1, input.length)) : ``;
      break;
    case 'punct':
      result = `${input[0].value}${
        input.length > 1 ? shape(input.slice(1, input.length)) : ``
      }`;
      break;
    case 'ordgroup':
      result = `${shape(input[0].body)}${nextMulti(input, 1)}`;
      break;
    case 'sqrt':
      result = `${radix(input[0])}${nextMulti(input, 1)}`;
      break;
    case 'leftright':
      result = `${leftright(input[0])}${nextMulti(input, 1)}`;
      break;
    case 'array':
      input = input[0].body[0][0].body[0].body;
      input = (() => {
        const input1 = [];
        for (let i = 0; i < input.length; i++) {
          if (
            input[i].type === 'leftright' &&
            input[i + 1] &&
            input[i + 1].type === 'leftright'
          ) {
            let index = input.slice(i, input.length).findIndex(f => {
              return f.type !== 'leftright';
            });
            index = index === -1 ? input.length : index;
            input1.push([
              matrixShape(matrix(input[i]), input.slice(i + 1, index))
            ]);
            i = index - 1;
          } else {
            input1.push(input[i]);
          }
        }
        return input1;
      })();
      result = (() => {
        if (input[0].hasOwnProperty('type')) {
          input[0] = matrix(input[0]);
        } else {
          input[0] = input[0][0];
        }

        return Array.isArray(
          matrixShape(input[0], input.slice(1, input.length))
        )
          ? `[${matrixShape(input[0], input.slice(1, input.length))}]`
          : matrixShape(input[0], input.slice(1, input.length));
      })();
      break;
    case 'genfrac':
      result = `${frac(input[0])}${nextMulti(input, 1)}`;
      break;
    case 'bin':
      switch (input[0].value) {
        case '\\cdot':
          result = `*${shape(input.slice(1, input.length))}`;
          break;
        default:
          result = `${input[0].value}${nextMulti(input, 1)}`;
          break;
      }
      break;
    case 'op':
      switch (input[0].name) {
        case '\\sin':
          result = `${sin(input[1])}${nextMulti(input, 2)}`;
          break;
        case '\\cos':
          result = `${cos(input[1])}${nextMulti(input, 2)}`;
          break;
        case '\\tan':
          result = `${tan(input[1])}${nextMulti(input, 2)}`;
          break;
        case '\\log':
          result = `${naturalLog(input[1])}${nextMulti(input, 2)}`;
          break;
        case '\\int':
          const deltaIndex = input.findIndex(e => {
            return e.type === 'mathord' && e.text === 'd';
          });
          result = `${indefiniteIntegral(input, deltaIndex)}${nextMulti(
            input,
            deltaIndex + 2
          )}`;
          break;
        default:
          break;
      }
      break;
    case 'supsub':
      if (input[0].sub) {
        switch (input[0].base.name) {
          case '\\log':
            result = `${log(input)}${nextMulti(input, 2)}`;
            break;
          case '\\sum':
            result = `${sum(input)}${nextMulti(input, 2)}`;
            break;
          case '\\int':
            const deltaIndex = input.findIndex(e => {
              return e.type === 'mathord' && e.text === 'd';
            });
            result = `${definiteIntegral(input, deltaIndex)}${nextMulti(
              input,
              deltaIndex + 2
            )}`;
            break;
          case '\\lim':
            result = `${limit(input)}${nextMulti(input, 2)}`;
            break;
          default:
            let elementIndex = `[${shape(input[0].sub.body)}]`;
            elementIndex = elementIndex.replace(/,/g, '][');
            result =
              `${shape(input[0].base)}${elementIndex}` + nextMulti(input, 1);
            break;
        }
      } else {
        if (input[0].sup.body[0].text === '\\prime') {
          result = `${differential(input[0])}${nextMulti(input, 1)}`;
        } else {
          result = `${pow(input[0])}${nextMulti(input, 1)}`;
        }
      }
      break;
    default:
      result = `${input[0]}${nextMulti(input, 1)}`;
      break;
  }
  return result;
};

export default (latex2js = (input, program) => {
  code = program;
  while (input.search(/\n/) >= 0) {
    input = input.replace(/\n/g, ' ');
  }
  const parseTree = katex.__parse(input);
  return shape(parseTree, code);
});

console.log(
  latex2js(`\\begin{aligned}\\begin{pmatrix}
1 & 2 \\\\
0 & 0
\\end{pmatrix}\\begin{pmatrix}
2 & 4 \\\\
5 & 3
\\end{pmatrix}+\\begin{pmatrix}
1 & 2 \\\\
9 & 2
\\end{pmatrix}\\end{aligned}`)
);
console.log(
  latex2js(`\\begin{aligned}\\begin{pmatrix}
\\left[ x\\right]  \\\\
\\left[ y\\right]
\\end{pmatrix}\\end{aligned}`)
);
// console.log(
//   latex2js(`\\begin{aligned}\\begin{pmatrix}
// 1 & 0 \\\\
// 0 & 1
// \\end{pmatrix}^{-1}\\end{aligned}`)
// );
console.log(
  latex2js(`\\begin{aligned}2\\begin{pmatrix}
1 & 0 \\\\
0 & 1
\\end{pmatrix}\\begin{pmatrix}
1 & 5 \\\\
2 & 3
\\end{pmatrix}\\end{aligned}`)
);
console.log(
  latex2js(`\\begin{aligned}\\begin{pmatrix}
1.5 & i\\left[ 0\\right] & 0 & 3^{4^{2}} \\\\
0.9 & \\left[ n\\right] & 0 & 0 \\\\
0 & 0 & 1 & \\cos \\left( \\pi \\right) \\\\
0 & 0 & 0 & 1
\\end{pmatrix}-\\begin{pmatrix}
2 & 3 & 4 & v \\\\
t & g & 3 & 2 \\\\
0 & a & 3 & 1 \\\\
5 & 2 & 2 & k
\\end{pmatrix}\\begin{pmatrix}
4 & 2 & 4 & 8 \\\\
5 & 9 & h & 2 \\\\
6 & h & b & n \\\\
k & g & a & x
\\end{pmatrix}\\begin{pmatrix}
4 & s & 4 & 8 \\\\
5 & r & h & 2 \\\\
m & r & b & n \\\\
b & t & a & 3
\\end{pmatrix}\\end{aligned}`)
);
console.log(
  latex2js(`\\begin{aligned}y=2\\begin{pmatrix}
  3 & 2 \\\\
  1 & 0
  \\end{pmatrix}\\end{aligned}`)
);
// console.log(latex2js(`x_{1,0,3,4}`));
// console.log(latex2js(`x_{10}`));
// console.log(latex2js(`y=\\sqrt {\\dfrac {3^{5}}{2}}`, code));
// console.log(latex2js(`a=\\sqrt {\\dfrac {3^{5}}{2}}`, code));
// console.log(latex2js(`n-\\left[ n\\right] `));
// console.log(latex2js(`c\\left[ 0\\right] +2`));
// console.log(latex2js(`p\\left( 0\\right) +2`));
// console.log(
//   eval(
//     latex2js('\\lim _{x\\rightarrow \\infty }\\left( \\dfrac {3}{x}\\right) ')
//   )
// );
// console.log(
//   eval(
//     latex2js('\\lim _{x\\rightarrow \\infty }\\left( \\dfrac {x}{2}\\right) ')
//   )
// );
// console.log(latex2js('3+3'));
// console.log(latex2js('x+y'));
// console.log(latex2js('3-2'));
// console.log(latex2js('x-y'));
// console.log(latex2js("\\left( \\log \\left( x\\right)\\right) '"));
// console.log(latex2js('\\int ^{3}_{2}5xdx'));
// console.log(latex2js('\\int 3x^{5}dx'));
// console.log(latex2js('\\int \\log \\left( x\\right) dx'));
// console.log(latex2js('\\sum ^{10}_{k=1}\\left( 3k^{3}\\right)'));
// console.log(latex2js('\\sum ^{10}_{k=1}p\\left( x,y\\right) '));
// console.log(latex2js('\\sum ^{10}_{k=1}p\\left( xy\\right) '));
// console.log(latex2js('\\sum ^{10}_{k=1}p\\left( x\\right) '));
// console.log(
//   latex2js(
//     '\\dfrac {\\sum ^{10}_{k=1}\\left( \\left( \\dfrac {1}{2}\\right) ^{k}p\\left( 2^{k}x,2^{k}y\\right) \\right) }{\\sum ^{10}_{k=1}\\left( \\dfrac {1}{2}\\right) ^{k}}'
//   )
// );
// console.log(latex2js('42^{3}'));
// console.log(latex2js('\\left( 42\\right) ^{\\left( 3\\right)}'));
// console.log(latex2js('\\sqrt {3}'));
// console.log(latex2js('\\dfrac {2}{3}'));
// console.log(latex2js('3^{2}'));
// console.log(latex2js('\\sqrt [3] {2}'));
// console.log(latex2js('\\sqrt {\\left( 3\\right) }'));
// console.log(latex2js('\\cos \\left( \\pi \\right)'));
// console.log(latex2js('\\log _{2}3'));
// console.log(latex2js('\\log _{2}\\left( 3^{2}\\right)'));
// console.log(latex2js('32xy'));
// console.log(latex2js('3x\\sqrt {y}'));
// console.log(latex2js('32x\\sqrt {2}'));
// console.log(latex2js('8\\sqrt {\\dfrac {42^{3}}{3}}'));
