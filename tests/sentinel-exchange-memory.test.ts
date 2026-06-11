import { describe, expect, it } from "vitest";

function appendExchange(
  current: Array<{ question: string; answer: string; at: number }>,
  question: string,
  answer: string,
) {
  const trimmedQuestion = question.trim();
  const trimmedAnswer = answer.trim();
  if (!trimmedQuestion || !trimmedAnswer) {
    return current;
  }

  return [...current, { question: trimmedQuestion, answer: trimmedAnswer, at: Date.now() }].slice(
    -3,
  );
}

describe("sentinel exchange memory", () => {
  it("keeps only the last three question-answer pairs", () => {
    let exchanges: Array<{ question: string; answer: string; at: number }> = [];
    exchanges = appendExchange(exchanges, "Q1", "A1");
    exchanges = appendExchange(exchanges, "Q2", "A2");
    exchanges = appendExchange(exchanges, "Q3", "A3");
    exchanges = appendExchange(exchanges, "Q4", "A4");

    expect(exchanges).toHaveLength(3);
    expect(exchanges.map((entry) => entry.question)).toEqual(["Q2", "Q3", "Q4"]);
  });

  it("ignores blank question or answer entries", () => {
    const exchanges = appendExchange([], "  ", "Answer");
    expect(exchanges).toEqual([]);
  });
});
