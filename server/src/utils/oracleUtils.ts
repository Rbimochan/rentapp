export const parseJsonArray = <T = string>(value: unknown): T[] => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value as T[];
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean) as T[];
    }
  }

  return [];
};

export const toOracleJsonArray = (value: unknown): string => {
  if (!value) {
    return JSON.stringify([]);
  }
  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      return trimmed;
    }
    const items = trimmed
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    return JSON.stringify(items);
  }
  return JSON.stringify([]);
};

export const normalizeBoolean = (value: unknown): number => {
  if (value === true || value === "true" || value === 1 || value === "1") {
    return 1;
  }
  return 0;
};

export const toNumber = (value: unknown, fallback = 0): number => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};
