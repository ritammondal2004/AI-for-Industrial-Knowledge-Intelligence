// Server-only Gemini API key pool with round-robin + failover rotation.
// Mirrors the reference Python implementation.

const ENV_VARS = [
  "GEMINI_KEY_1",
  "GEMINI_KEY_2",
  "GEMINI_KEY_3",
  "GEMINI_KEY_4",
  "GEMINI_KEY_5",
  "GEMINI_KEY_6",
] as const;

function loadKeys(): string[] {
  return ENV_VARS.map((k) => process.env[k]).filter(
    (v): v is string => typeof v === "string" && v.length > 0,
  );
}

let _keys: string[] | null = null;
let _index = 0;

function keys(): string[] {
  if (!_keys) _keys = loadKeys();
  if (_keys.length === 0) {
    throw new Error(
      "No Gemini API keys found. Set GEMINI_KEY_1..GEMINI_KEY_6 in project secrets.",
    );
  }
  return _keys;
}

export function getCurrentKey(): string {
  return keys()[_index];
}

export function switchApiKey(): string {
  const k = keys();
  _index = (_index + 1) % k.length;
  console.log(`🔄 Switched to Gemini API key #${_index + 1} of ${k.length}`);
  return getCurrentKey();
}

export function keyCount(): number {
  return keys().length;
}
