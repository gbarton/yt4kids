import log from '../Log';

/**
 * null test
 * @param {*} val any object
 * @returns true if its null or undefined
 */
export function isNull(val: any): boolean {
  return val === undefined || val === null;
}

/**
 * @param {*} val any object
 * @returns true if the val is not null and not undefined
 */
export function isntNull(val: any): boolean {
  return val !== null && val !== undefined;
}

// simple promise we can wait for to 'sleep'
export const delay = (ms: number) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

// simplest and safest (but slow) deep copy of an obj
export function deepCopy(obj: any) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Used for checking against enums to see if a given
 * value is in the enum like this:
 * enum foo { A = 'a' }
 * returned function will test if 'a' is in this enum
 * @param strEnum enum to test against
 * @returns a function that can tell if a string is inside an enum
 */
export function inStringEnum<E extends string>(strEnum: Record<string, E>) {
  const enumValues = Object.values(strEnum) as string[];

  return (value: string) : value is E => enumValues.includes(value);
}

/**
 * while not a true cancellation as the async op will continue to run
 * this will allow an early break out on our code to go do something else
 * @param fn function() to execute
 * @param timeMS (default 10s) how long to wait for
 * @returns whatever is typed on the function
 */
export async function cancellable<T>(fn: () => Promise<T>, timeMS: number = 10000): Promise<T> {
  let timer: Timer;
  let cancelled = false;
  const p = new Promise<T>(async (resolve, reject) => {
    timer = setTimeout(() => {
      cancelled = true;
      return reject(new Error("CANCEL TIMEOUT TRIGGERED"));
    }, timeMS);
    try {
      const res : T = await fn();
      if (!cancelled) {
        return resolve(res);
      }
    } catch (err) {
      log.warn(err, "cancellable caught error");
      reject(err);
    }
    return reject(new Error("TIMEOUT EXCEEDED (but shouldnt have hit this?"));
  }).finally(() => {
    clearTimeout(timer);
    if (cancelled) {
      log.warn("cancellable was cancelled");
    } else {
      log.info("cancellable completed");
    }
  });

  return p;
}