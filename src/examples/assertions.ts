import { strict as assert } from "assert";

const obj1 = {
  a: {
    b: 1
  }
};
const obj2 = {
  a: {
    b: 2
  }
};

assert(true);

assert.deepEqual(obj1, obj2);
