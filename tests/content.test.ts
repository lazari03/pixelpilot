import { describe, it, expect } from "vitest";
import chapters from "../src/data/chapters.json";
import challenges from "../src/data/challenges.json";
import questions from "../scripts/content/questions.private.json";
import { messages } from "../src/i18n/messages";
describe("bilingual course content", () => {
  it("has matching UI keys and complete translated lessons and activities", () => {
    expect(Object.keys(messages.en).sort()).toEqual(
      Object.keys(messages.sq).sort(),
    );
    expect(chapters).toHaveLength(5);
    for (const chapter of chapters) {
      expect(chapter.units).toHaveLength(3);
      expect(chapter.units.reduce((sum, u) => sum + u.minutes, 0)).toBe(25);
      for (const unit of chapter.units) {
        expect(unit.activities).toHaveLength(3);
        for (const locale of ["en", "sq"] as const) {
          expect(unit.title[locale].length).toBeGreaterThan(5);
          expect(unit.body[locale].length).toBeGreaterThan(100);
          expect(unit.activities.every((a) => a[locale].length > 15)).toBe(
            true,
          );
        }
      }
    }
  });
  it("has differentiated challenges and an eight-question bilingual bank per chapter", () => {
    expect(challenges.filter((c) => !c.exam)).toHaveLength(45);
    expect(challenges.filter((c) => c.exam)).toHaveLength(2);
    for (let day = 0; day < 5; day++)
      expect(questions.filter((q) => q.day === day)).toHaveLength(8);
    for (const q of questions) {
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(3);
      for (const locale of ["en", "sq"] as const) {
        expect(q.options[locale]).toHaveLength(3);
        expect(q.explanation[locale].length).toBeGreaterThan(10);
      }
    }
  });
});
