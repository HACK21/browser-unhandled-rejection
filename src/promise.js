const OriginalPromise = Promise;

/**
 * ES5 subclassing is used per:
 * https://github.com/rtsao/browser-unhandled-rejection/issues/1
 * https://kangax.github.io/compat-table/es6/#test-Promise_is_subclassable
 *
 * Adapted from: https://gist.github.com/domenic/8ed6048b187ee8f2ec75
 */
const InstrumentedPromise = function Promise(resolver) {
  if (!(this instanceof InstrumentedPromise)) {
    throw new TypeError('Cannot call a class as a function');
  }
  const promise = new OriginalPromise((resolve, reject) =>
    resolver(resolve, arg => {
      OriginalPromise.resolve().then(() => {
        if (promise._hasDownstreams === undefined) {
          dispatchUnhandledRejectionEvent(promise, arg);
        }
      });
      return reject(arg);
    }));
  // 确保调用链先走 pollyfill 定义的 then 方法
  promise.__proto__ = InstrumentedPromise.prototype;
  return promise;
};

// 确保使用者能直接调用原生 Promise 方法
InstrumentedPromise.__proto__ = OriginalPromise;
// 确保 InstrumentedPromise 内部函数能调用到原生 Promise 方法
InstrumentedPromise.prototype.__proto__ = OriginalPromise.prototype;

InstrumentedPromise.prototype.then = function then(onFulfilled, onRejected) {
  const next = OriginalPromise.prototype.then.call(this, onFulfilled, onRejected);
  this._hasDownstreams = true;
  return next;
};

function dispatchUnhandledRejectionEvent(promise, reason) {
  const event = document.createEvent('Event');
  /**
   * Note: these properties should not be enumerable, which is the default setting
   */
  Object.defineProperties(event, {
    promise: {
      value: promise,
      writable: false
    },
    reason: {
      value: reason,
      writable: false
    }
  });
  event.initEvent(
    'unhandledrejection', // Define that the event name is 'unhandledrejection'
    false, // PromiseRejectionEvent is not bubbleable
    true // PromiseRejectionEvent is cancelable
  );
  window.dispatchEvent(event);
}

export default InstrumentedPromise;
