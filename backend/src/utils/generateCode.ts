/**
 * Generates a unique society registration code based on initials.
 * Example: "New Mamta Co Housing So Ltd" -> "NMC-4921"
 */
export const generateSocietyCode = (name: string): string => {
  // 1. Remove extra spaces and split into words
  const words = name
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0);

  let initials = "";

  if (words.length >= 3) {
    // Take 1st letter of first 3 words
    initials = words[0][0] + words[1][0] + words[2][0];
  } else if (words.length === 2) {
    // Take 1st two letters of first word + 1st letter of second word
    initials = words[0].slice(0, 2) + words[1][0];
  } else {
    // Take first 3 letters of the single word
    initials = words[0].slice(0, 3);
  }

  // 2. Generate a random 4-digit number
  const randomNum = Math.floor(1000 + Math.random() * 9000);

  // 3. Return in Uppercase format
  return `${initials.toUpperCase()}-${randomNum}`;
};
