const COMPLETION = Symbol('fnosCompletion');

const SERVER_COMPLETION = Object.freeze({ kind: 'server' });

function fixedValues(values) {
  return Object.freeze({
    kind: 'values',
    values: Object.freeze(values.map((value) => String(value)))
  });
}

function withCompletion(target, completion) {
  Object.defineProperty(target, COMPLETION, {
    value: completion,
    enumerable: false,
    configurable: false,
    writable: false
  });
  return target;
}

function getCompletion(target) {
  return target?.[COMPLETION] || null;
}

module.exports = {
  SERVER_COMPLETION,
  fixedValues,
  getCompletion,
  withCompletion
};
