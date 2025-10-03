const { stdout, stderr } = require("node:process");

const LEVELS = {
  info: "INFO",
  warn: "WARN",
  error: "ERROR",
  debug: "DEBUG",
};

function formatMessage(level, message, meta) {
  const ts = new Date().toISOString();
  const base = `[${ts}] [${LEVELS[level] || "INFO"}] ${message}`;
  if (!meta) return base;
  try {
    const asString = typeof meta === "string" ? meta : JSON.stringify(meta);
    return `${base} ${asString}`;
  } catch (error) {
    return `${base} (meta: ${String(meta)})`;
  }
}

function log(level, message, meta) {
  const line = formatMessage(level, message, meta);
  if (level === "error") {
    stderr.write(`${line}\n`);
  } else {
    stdout.write(`${line}\n`);
  }
}

module.exports = {
  info: (message, meta) => log("info", message, meta),
  warn: (message, meta) => log("warn", message, meta),
  error: (message, meta) => log("error", message, meta),
  debug: (message, meta) => log("debug", message, meta),
};
