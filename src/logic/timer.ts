function delay(miliseconds) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(1), miliseconds);
  });
}

const Timer = () => {
  let timerId;
  const f = () => {
    return null;
  };
  f.start = (time, func, ...args) => {
    timerId = setInterval(async () => {
      // console.log(`after ${time / 1000}sec `);
      await func(...args);
    }, time);
  };
  f.stop = (time) => {
    setTimeout(() => {
      clearInterval(timerId);
      console.log('stop');
    }, time | 0);
  };
  return f;
};

export { delay, Timer };
