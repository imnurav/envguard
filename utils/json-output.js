export function printJson(payload) {
  console.log(JSON.stringify(payload, null, 2));
}

export function errorPayload(command, details = {}) {
  return {
    command,
    status: "error",
    ...details,
  };
}

export function okPayload(command, details = {}) {
  return {
    command,
    status: "ok",
    ...details,
  };
}
