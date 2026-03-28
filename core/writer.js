import { parseEnv, parseEnvDocument } from "./parser.js";
import fs from "fs";

function formatEnvValue(value) {
  const normalizedValue = value ?? "";

  if (normalizedValue === "") return "";

  if (/[\s#"'`]/.test(normalizedValue) || normalizedValue.includes("\n")) {
    return JSON.stringify(normalizedValue);
  }

  return normalizedValue;
}

function isBlankRecord(record) {
  return record.type === "blank";
}

function isEntryRecord(record) {
  return record.type === "entry";
}

function shouldKeepBlankRecord(records, index) {
  const previous = records[index - 1];
  const next = records[index + 1];

  if (!previous || !next) {
    return false;
  }

  if (isBlankRecord(previous) || isBlankRecord(next)) {
    return false;
  }

  // Keep spacing around comments or invalid lines, but tighten plain entry blocks.
  return !isEntryRecord(previous) || !isEntryRecord(next);
}

function normalizeRecords(records) {
  return records.filter((record, index) => {
    if (!isBlankRecord(record)) {
      return true;
    }

    return shouldKeepBlankRecord(records, index);
  });
}

function serializeRecords(records, newline) {
  const normalizedRecords = normalizeRecords(records);

  if (!normalizedRecords.length) return "";

  return `${normalizedRecords.map((record) => record.raw).join(newline)}${newline}`;
}

function syncDocumentToDisk(filePath, document) {
  const nextContent = serializeRecords(document.records, document.newline);
  const currentContent = fs.existsSync(filePath)
    ? fs.readFileSync(filePath, "utf-8")
    : "";

  if (currentContent === nextContent) {
    return false;
  }

  fs.writeFileSync(filePath, nextContent);
  return true;
}

function createEntryRecord(key, value) {
  return {
    type: "entry",
    key,
    value,
    raw: `${key}=${formatEnvValue(value)}`,
  };
}

export function ensureEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, "");
  }
}

export function appendVars(filePath, vars) {
  ensureEnvFile(filePath);

  const existing = parseEnv(filePath);
  const entriesToAdd = Object.entries(vars).filter(
    ([key]) => !(key in existing),
  );
  const document = parseEnvDocument(filePath);

  if (!entriesToAdd.length) {
    syncDocumentToDisk(filePath, document);
    return [];
  }

  for (const [key, value] of entriesToAdd) {
    document.records.push(createEntryRecord(key, value));
  }

  syncDocumentToDisk(filePath, document);

  return entriesToAdd.map(([key]) => key);
}

export function upsertVar(filePath, key, value = "", options = {}) {
  ensureEnvFile(filePath);

  const { overwrite = true } = options;
  const document = parseEnvDocument(filePath);
  const nextRecords = [];
  let found = false;
  let changed = false;

  for (const record of document.records) {
    if (record.type !== "entry" || record.key !== key) {
      nextRecords.push(record);
      continue;
    }

    if (!found) {
      const nextValue = overwrite ? value : record.value;
      const nextRaw = `${key}=${formatEnvValue(nextValue)}`;

      if (record.raw !== nextRaw) {
        changed = true;
      }

      nextRecords.push(createEntryRecord(key, nextValue));
      found = true;
      continue;
    }

    changed = true;
  }

  if (!found) {
    nextRecords.push(createEntryRecord(key, value));
    changed = true;
  }

  document.records = nextRecords;

  const formatted = syncDocumentToDisk(filePath, document);

  return {
    changed: changed || formatted,
    added: !found,
    updated: found && changed,
    formatted,
  };
}

export function removeVar(filePath, key) {
  if (!fs.existsSync(filePath)) {
    return { removed: false, count: 0 };
  }

  const document = parseEnvDocument(filePath);
  const originalCount = document.records.length;

  document.records = document.records.filter(
    (record) => !(record.type === "entry" && record.key === key),
  );

  const removedCount = originalCount - document.records.length;

  const formatted = syncDocumentToDisk(filePath, document);

  return {
    removed: removedCount > 0,
    count: removedCount,
    formatted,
  };
}

export function syncVars(filePath, vars, options = {}) {
  ensureEnvFile(filePath);

  const { overwrite = false } = options;
  const document = parseEnvDocument(filePath);
  const incomingEntries = Object.entries(vars);
  const desiredValues = new Map(incomingEntries);
  const seenKeys = new Set();
  const nextRecords = [];
  const changedKeys = [];

  for (const record of document.records) {
    if (record.type !== "entry" || !desiredValues.has(record.key)) {
      nextRecords.push(record);
      continue;
    }

    if (seenKeys.has(record.key)) {
      changedKeys.push(record.key);
      continue;
    }

    seenKeys.add(record.key);

    const nextValue = overwrite
      ? (desiredValues.get(record.key) ?? "")
      : record.value;
    const nextRecord = createEntryRecord(record.key, nextValue);

    if (record.raw !== nextRecord.raw) {
      changedKeys.push(record.key);
    }

    nextRecords.push(nextRecord);
  }

  for (const [key, value] of incomingEntries) {
    if (seenKeys.has(key)) continue;

    nextRecords.push(createEntryRecord(key, value ?? ""));
    changedKeys.push(key);
  }

  document.records = nextRecords;
  syncDocumentToDisk(filePath, document);

  return [...new Set(changedKeys)];
}
