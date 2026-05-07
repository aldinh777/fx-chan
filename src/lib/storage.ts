export function load<T>(key: string, orelse: T): T {
  try {
    const item = localStorage.getItem(key);
    if (item === null) {
      return orelse;
    }
    return JSON.parse(item) as T;
  } catch {
    return orelse;
  }
}

export function save<T>(key: string, data: T) {
  localStorage.setItem(key, JSON.stringify(data));
}
