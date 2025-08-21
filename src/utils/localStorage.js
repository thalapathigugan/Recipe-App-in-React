export function getLocal(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

export function setLocal(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
