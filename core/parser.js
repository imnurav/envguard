import fs from "fs";
import dotenv from "dotenv";

function isQuotedValueClosed(value, quote) {
  let escaped = false;

  for (let index = 1; index < value.length; index += 1) {
    const char = value[index];

    if (quote === '"' && char === "\\" && !escaped) {
      escaped = true;
      continue;
    }

    if (char === quote && !escaped) {
      return true;
    }

    escaped = false;
  }

  return false;
}

function startsMultilineValue(line) {
  const trimmed = line.trim();

  if (!trimmed || trimmed.startsWith("#")) return false;

  const separatorIndex = line.indexOf("=");

  if (separatorIndex === -1) return false;

  const rawValue = line.slice(separatorIndex + 1).trimStart();
  const quote = rawValue[0];

  if (quote !== '"' && quote !== "'") return false;

  return !isQuotedValueClosed(rawValue, quote);
}

function splitLogicalBlocks(content) {
  const physicalLines = content.split(/\r?\n/);
  const blocks = [];
  let current = null;

  for (const line of physicalLines) {
    if (current === null) {
      if (startsMultilineValue(line)) {
        current = line;
        continue;
      }

      blocks.push(line);
      continue;
    }

    current = `${current}\n${line}`;

    const separatorIndex = current.indexOf("=");
    const rawValue = current.slice(separatorIndex + 1).trimStart();
    const quote = rawValue[0];

    if (isQuotedValueClosed(rawValue, quote)) {
      blocks.push(current);
      current = null;
    }
  }

  if (current !== null) {
    blocks.push(current);
  }

  return blocks;
}

function classifyBlock(block) {
  const trimmed = block.trim();

  if (!trimmed) {
    return { type: "blank", raw: block };
  }

  if (trimmed.startsWith("#")) {
    return { type: "comment", raw: block };
  }

  if (!block.includes("=")) {
    return { type: "invalid", raw: block };
  }

  const parsed = dotenv.parse(block);
  const entries = Object.entries(parsed);

  if (entries.length !== 1) {
    return { type: "invalid", raw: block };
  }

  const [[key, value]] = entries;
  const separatorIndex = block.indexOf("=");

  return {
    type: "entry",
    raw: block,
    key,
    value,
  };
}

export function parseEnvDocument(filePath) {
  if (!fs.existsSync(filePath)) {
    return {
      exists: false,
      newline: "\n",
      records: [],
    };
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const newline = content.includes("\r\n") ? "\r\n" : "\n";

  return {
    exists: true,
    newline,
    records: splitLogicalBlocks(content).map(classifyBlock),
  };
}

export function parseEnv(filePath) {
  return parseEnvDocument(filePath).records.reduce((accumulator, record) => {
    if (record.type === "entry") {
      accumulator[record.key] = record.value;
    }

    return accumulator;
  }, {});
}
