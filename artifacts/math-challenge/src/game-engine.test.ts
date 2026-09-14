import assert from 'node:assert/strict';
import test from 'node:test';
import { DIGIT_RANGES, generateQuestion, randomInt, type DigitLevel } from './game-engine.ts';

const levels: DigitLevel[] = [1, 2, 3, 4];

test('randomInt includes both boundaries', () => {
  assert.equal(randomInt(10, 20, () => 0), 10);
  assert.equal(randomInt(10, 20, () => 0.999999), 20);
});

test('addition respects digit ranges and computes the answer', () => {
  for (const level of levels) {
    const question = generateQuestion('addition', level, () => 0);
    assert.equal(question.operand1, DIGIT_RANGES[level].min);
    assert.equal(question.operand2, DIGIT_RANGES[level].min);
    assert.equal(question.correctAnswer, question.operand1 + question.operand2);
  }
});

test('subtraction never produces a negative answer', () => {
  const randomValues = [0, 0.999999];
  const question = generateQuestion('subtraction', 2, () => randomValues.shift() ?? 0);
  assert.ok(question.operand1 >= question.operand2);
  assert.equal(question.correctAnswer, question.operand1 - question.operand2);
  assert.ok(question.correctAnswer >= 0);
});

test('multiplication computes the exact product', () => {
  const question = generateQuestion('multiplication', 3, () => 0.5);
  assert.equal(question.correctAnswer, question.operand1 * question.operand2);
});

test('division always has a whole-number answer', () => {
  for (const level of levels) {
    for (let sample = 0; sample < 100; sample += 1) {
      const question = generateQuestion('division', level);
      assert.notEqual(question.operand2, 0);
      assert.equal(question.operand1 % question.operand2, 0);
      assert.equal(question.correctAnswer, question.operand1 / question.operand2);
    }
  }
});
