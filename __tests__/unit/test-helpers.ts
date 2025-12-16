// __tests__/unit/test-helpers.ts
// Lightweight helpers to build Request objects for route handler tests

export function makeJsonRequest(url: string, body: any, method: string = 'POST', headers?: Record<string, string>) {
  return new Request(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(headers || {}),
    },
    body: JSON.stringify(body),
  });
}

export function makeAuthedJsonRequest(url: string, body: any, token: string = 'test-token', method: string = 'POST') {
  return makeJsonRequest(url, body, method, {
    Authorization: `Bearer ${token}`,
  });
}

export function setEnv(vars: Record<string, string>) {
  for (const [k, v] of Object.entries(vars)) {
    process.env[k] = v;
  }
}
