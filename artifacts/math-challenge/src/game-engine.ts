export type Operation = 'addition' | 'subtraction' | 'multiplication' | 'division';
export type DigitLevel = 1 | 2 | 3 | 4;

export type Question = {
  operand1: number;
  operand2: number;
  operator: string;
  correctAnswer: number;
};

type RandomSource = () => number;

export const DIGIT_RANGES: Record<DigitLevel, { min: number; max: number }> = {
  1: { min: 1, max: 9 },
  2: { min: 10, max: 99 },
  3: { min: 100, max: 999 },
  4: { min: 1000, max: 9999 },
};

const DIVISION_QUOTIENT_MAX: Record<DigitLevel, number> = {
  1: 9,
  2: 12,
  3: 25,
  4: 50,
};

export function randomInt(min: number, max: number, random: RandomSource = Math.random) {
  return Math.floor(random() * (max - min + 1)) + min;
}

export function generateQuestion(
  operation: Operation,
  digitLevel: DigitLevel,
  random: RandomSource = Math.random,
): Question {
  const { min, max } = DIGIT_RANGES[digitLevel];
  const first = randomInt(min, max, random);
  const second = randomInt(min, max, random);

  switch (operation) {
    case 'addition':
      return { operand1: first, operand2: second, operator: '+', correctAnswer: first + second };
    case 'subtraction': {
      const operand1 = Math.max(first, second);
      const operand2 = Math.min(first, second);
      return { operand1, operand2, operator: '−', correctAnswer: operand1 - operand2 };
    }
    case 'multiplication':
      return { operand1: first, operand2: second, operator: '×', correctAnswer: first * second };
    case 'division': {
      const divisor = second;
      const quotient = randomInt(1, DIVISION_QUOTIENT_MAX[digitLevel], random);
      return {
        operand1: divisor * quotient,
        operand2: divisor,
        operator: '÷',
        correctAnswer: quotient,
      };
    }
  }
}
