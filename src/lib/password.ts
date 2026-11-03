// Same rule as the backend (backend/src/utils/password.ts) and the zod
// schemas in lib/validations.ts — returns the first problem, or null.
export function passwordProblem(pw: string): string | null {
  if (!pw) return "Password is required";
  if (pw.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(pw)) return "Password must contain an uppercase letter (A-Z)";
  if (!/[a-z]/.test(pw)) return "Password must contain a lowercase letter (a-z)";
  if (!/[0-9]/.test(pw)) return "Password must contain a number (0-9)";
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(pw))
    return "Password must contain a special character (!@#$%^&*)";
  return null;
}

export const PASSWORD_HINT =
  "At least 8 characters with an uppercase letter, a lowercase letter, a number and a special character (!@#$%^&*).";

// Random password that always satisfies the rule above (crypto-backed).
export function generatePassword(length = 14): string {
  const sets = [
    "ABCDEFGHJKLMNPQRSTUVWXYZ",
    "abcdefghijkmnopqrstuvwxyz",
    "23456789",
    "!@#$%^&*",
  ];
  const all = sets.join("");
  const rand = (n: number) => {
    const buf = new Uint32Array(1);
    // Rejection sampling keeps the distribution uniform.
    const limit = Math.floor(0x100000000 / n) * n;
    do crypto.getRandomValues(buf);
    while (buf[0] >= limit);
    return buf[0] % n;
  };
  const chars = sets.map((s) => s[rand(s.length)]);
  while (chars.length < length) chars.push(all[rand(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}
