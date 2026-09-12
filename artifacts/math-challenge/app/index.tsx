import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

type Operation = 'addition' | 'subtraction' | 'multiplication' | 'division';
type DigitLevel = 1 | 2 | 3 | 4;
type Screen = 'setup' | 'game' | 'results' | 'history' | 'leaderboard';

type Question = {
  operand1: number;
  operand2: number;
  operator: string;
  correctAnswer: number;
};

type ScoreRecord = {
  id: string;
  operation: Operation;
  digitLevel: DigitLevel;
  correctAnswers: number;
  incorrectAnswers: number;
  totalAttempted: number;
  accuracy: number;
  score: number;
  completedAt: string;
};

const SCORE_STORAGE_KEY = 'math-challenge:scores';
const GAME_DURATION_SECONDS = 240;
const DIGIT_RANGES: Record<DigitLevel, { min: number; max: number }> = {
  1: { min: 1, max: 9 },
  2: { min: 10, max: 99 },
  3: { min: 100, max: 999 },
  4: { min: 1000, max: 9999 },
};

const OPERATION_META: Record<
  Operation,
  { label: string; short: string; icon: keyof typeof Feather.glyphMap }
> = {
  addition: { label: 'Addition', short: '+', icon: 'plus' },
  subtraction: { label: 'Subtraction', short: '−', icon: 'minus' },
  multiplication: { label: 'Multiplication', short: '×', icon: 'x' },
  division: { label: 'Division', short: '÷', icon: 'slash' },
};

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateQuestion(operation: Operation, digitLevel: DigitLevel): Question {
  const { min, max } = DIGIT_RANGES[digitLevel];
  const first = randomInt(min, max);
  const second = randomInt(min, max);

  if (operation === 'addition') {
    return { operand1: first, operand2: second, operator: '+', correctAnswer: first + second };
  }

  if (operation === 'subtraction') {
    const operand1 = Math.max(first, second);
    const operand2 = Math.min(first, second);
    return { operand1, operand2, operator: '−', correctAnswer: operand1 - operand2 };
  }

  if (operation === 'multiplication') {
    return { operand1: first, operand2: second, operator: '×', correctAnswer: first * second };
  }

  const divisor = second;
  const quotient = randomInt(1, digitLevel === 1 ? 9 : digitLevel === 2 ? 12 : digitLevel === 3 ? 25 : 50);
  return {
    operand1: divisor * quotient,
    operand2: divisor,
    operator: '÷',
    correctAnswer: quotient,
  };
}

function formatNumber(value: number) {
  return value.toLocaleString('en-US');
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remainder = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}

function getOperationLabel(operation: Operation) {
  return OPERATION_META[operation].label;
}

function getBestScore(scores: ScoreRecord[], operation: Operation, digitLevel: DigitLevel) {
  return scores
    .filter((score) => score.operation === operation && score.digitLevel === digitLevel)
    .reduce((best, score) => Math.max(best, score.score), 0);
}

export default function GameScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'ios' ? Math.max(insets.top, 59) : insets.top;
  const gameTopInset = Platform.OS === 'ios' ? Math.max(insets.top, 86) : topInset;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [screen, setScreen] = useState<Screen>('setup');
  const [operation, setOperation] = useState<Operation>('addition');
  const [digitLevel, setDigitLevel] = useState<DigitLevel>(2);
  const [question, setQuestion] = useState<Question>(() => generateQuestion('addition', 2));
  const [answerText, setAnswerText] = useState('');
  const [remaining, setRemaining] = useState(GAME_DURATION_SECONDS);
  const [gameEndsAt, setGameEndsAt] = useState<number | null>(null);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [incorrectAnswers, setIncorrectAnswers] = useState(0);
  const [totalAttempted, setTotalAttempted] = useState(0);
  const [scores, setScores] = useState<ScoreRecord[]>([]);
  const [lastResult, setLastResult] = useState<ScoreRecord | null>(null);
  const finishingRef = useRef(false);
  const answerInputRef = useRef<TextInput>(null);

  useEffect(() => {
    AsyncStorage.getItem(SCORE_STORAGE_KEY)
      .then((stored) => {
        if (!stored) return;
        const parsed = JSON.parse(stored) as ScoreRecord[];
        setScores(Array.isArray(parsed) ? parsed : []);
      })
      .catch(() => setScores([]));
  }, []);

  const finishGame = useCallback(
    async (finalCorrect = correctAnswers, finalIncorrect = incorrectAnswers, finalAttempted = totalAttempted) => {
      if (finishingRef.current) return;
      finishingRef.current = true;
      const result: ScoreRecord = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        operation,
        digitLevel,
        correctAnswers: finalCorrect,
        incorrectAnswers: finalIncorrect,
        totalAttempted: finalAttempted,
        accuracy: finalAttempted > 0 ? Math.round((finalCorrect / finalAttempted) * 100) : 0,
        score: finalCorrect,
        completedAt: new Date().toISOString(),
      };
      setLastResult(result);
      setScores((current) => {
        const next = [result, ...current].slice(0, 50);
        AsyncStorage.setItem(SCORE_STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
        return next;
      });
      setRemaining(0);
      setGameEndsAt(null);
      setAnswerText('');
      setScreen('results');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    [correctAnswers, digitLevel, incorrectAnswers, operation, totalAttempted],
  );

  useEffect(() => {
    if (screen !== 'game' || !gameEndsAt) return;
    const timer = setInterval(() => {
      const nextRemaining = Math.max(0, Math.ceil((gameEndsAt - Date.now()) / 1000));
      setRemaining(nextRemaining);
      if (nextRemaining <= 0) {
        clearInterval(timer);
        void finishGame();
      }
    }, 200);
    return () => clearInterval(timer);
  }, [finishGame, gameEndsAt, screen]);

  const startGame = () => {
    const endsAt = Date.now() + GAME_DURATION_SECONDS * 1000;
    finishingRef.current = false;
    setQuestion(generateQuestion(operation, digitLevel));
    setAnswerText('');
    setRemaining(GAME_DURATION_SECONDS);
    setCorrectAnswers(0);
    setIncorrectAnswers(0);
    setTotalAttempted(0);
    setGameEndsAt(endsAt);
    setScreen('game');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTimeout(() => answerInputRef.current?.focus(), 150);
  };

  const submitAnswer = () => {
    const trimmed = answerText.trim();
    if (!trimmed || screen !== 'game') return;
    const isCorrect = Number(trimmed) === question.correctAnswer;
    const nextCorrect = correctAnswers + (isCorrect ? 1 : 0);
    const nextIncorrect = incorrectAnswers + (isCorrect ? 0 : 1);
    const nextAttempted = totalAttempted + 1;
    Keyboard.dismiss();
    setAnswerText('');
    setCorrectAnswers(nextCorrect);
    setIncorrectAnswers(nextIncorrect);
    setTotalAttempted(nextAttempted);
    void Haptics.impactAsync(
      isCorrect ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Heavy,
    );

    if (gameEndsAt && Date.now() >= gameEndsAt) {
      void finishGame(nextCorrect, nextIncorrect, nextAttempted);
      return;
    }
    setQuestion(generateQuestion(operation, digitLevel));
    setTimeout(() => answerInputRef.current?.focus(), 50);
  };

  const resetToSetup = () => {
    finishingRef.current = false;
    setScreen('setup');
    setLastResult(null);
  };

  const renderHeader = (title: string, onBack?: () => void) => (
    <View style={[styles.header, { paddingTop: topInset + 10 }]}>
      {onBack ? (
        <Pressable
          accessibilityLabel="Go back"
          onPress={onBack}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <Feather name="arrow-left" size={21} color={colors.foreground} />
        </Pressable>
      ) : (
        <View style={styles.iconButton} />
      )}
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={styles.iconButton} />
    </View>
  );

  if (screen === 'game') {
    const timeProgress = Math.max(0, Math.min(100, (remaining / GAME_DURATION_SECONDS) * 100));
    const timerIsUrgent = remaining <= 30;
    return (
      <View style={[styles.screen, styles.gameScreen, { paddingTop: gameTopInset + 12, paddingBottom: insets.bottom + 10 }]}>
        <View style={styles.gameTopRow}>
          <View style={styles.gameContext}>
            <View style={styles.gameContextIcon}>
              <Feather name={OPERATION_META[operation].icon} size={17} color={colors.primaryForeground} />
            </View>
            <View style={styles.gameContextCopy}>
              <Text style={styles.gameContextTitle}>{getOperationLabel(operation)}</Text>
              <Text style={styles.gameContextMeta}>{digitLevel} digit{digitLevel === 1 ? '' : 's'} · 4 min round</Text>
            </View>
          </View>
          <View style={[styles.timerBlock, timerIsUrgent && styles.timerBlockUrgent]}>
            <View style={styles.timerLabelRow}>
              <Feather name="clock" size={13} color={timerIsUrgent ? colors.destructiveForeground : colors.primary} />
              <Text style={[styles.timerLabel, timerIsUrgent && { color: colors.destructiveForeground }]}>TIME LEFT</Text>
            </View>
            <Text style={[styles.timerText, timerIsUrgent && { color: colors.destructiveForeground }]}>{formatTime(remaining)}</Text>
          </View>
        </View>
        <View style={styles.timerTrack}>
          <View
            style={[
              styles.timerProgress,
              { width: `${timeProgress}%` },
              timerIsUrgent && styles.timerProgressUrgent,
            ]}
          />
        </View>

        <View style={styles.questionArea}>
          <View style={styles.problemCard}>
            <Text style={styles.questionLabel}>YOUR NEXT</Text>
            <Text style={styles.questionText}>
              {formatNumber(question.operand1)} {question.operator} {formatNumber(question.operand2)}
            </Text>
          </View>
          <Text style={styles.answerLabel}>TYPE THE ANSWER</Text>
          <View style={styles.answerRow}>
            <TextInput
              ref={answerInputRef}
              autoFocus
              autoCorrect={false}
              blurOnSubmit={false}
              keyboardType="number-pad"
              onChangeText={setAnswerText}
              onSubmitEditing={submitAnswer}
              returnKeyType="done"
              style={styles.answerInput}
              value={answerText}
            />
            <Pressable
              accessibilityLabel="Submit answer"
              onPress={submitAnswer}
              style={({ pressed }) => [styles.submitButton, pressed && styles.pressed]}
            >
              <Feather name="check" size={24} color={colors.primaryForeground} />
              <Text style={styles.submitButtonText}>Check</Text>
            </Pressable>
          </View>
          <Text style={styles.answerHint}>Press return or tap Check to submit</Text>
        </View>

        <View style={styles.gameBottom}>
          <View style={styles.statStrip}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalAttempted}</Text>
              <Text style={styles.statLabel}>attempted</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalAttempted ? Math.round((correctAnswers / totalAttempted) * 100) : 0}%</Text>
              <Text style={styles.statLabel}>accuracy</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.destructive }]}>{incorrectAnswers}</Text>
              <Text style={styles.statLabel}>missed</Text>
            </View>
          </View>
          <Pressable
            accessibilityLabel="End game"
            onPress={() => void finishGame()}
            style={({ pressed }) => [styles.endGameButton, pressed && styles.pressed]}
          >
            <Text style={styles.endGameText}>End game</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (screen === 'results' && lastResult) {
    const best = getBestScore(scores, lastResult.operation, lastResult.digitLevel);
    const isBest = lastResult.score >= best;
    return (
      <ScrollView
        contentContainerStyle={[styles.screenContent, { paddingTop: topInset + 14, paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.resultsHeader}>
          <View style={styles.resultIcon}>
            <Feather name={isBest ? 'award' : 'check'} size={28} color={colors.primaryForeground} />
          </View>
          <Text style={styles.eyebrow}>ROUND COMPLETE</Text>
          <Text style={styles.resultsTitle}>{isBest ? 'New personal best' : 'Nice work'}</Text>
          <Text style={styles.resultsSubtitle}>{getOperationLabel(lastResult.operation)} · {lastResult.digitLevel} digit</Text>
        </View>
        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>YOUR SCORE</Text>
          <Text style={styles.bigScore}>{lastResult.score}</Text>
          <Text style={styles.scoreCaption}>correct answers in four minutes</Text>
          <View style={styles.resultsGrid}>
            <ResultMetric label="Accuracy" value={`${lastResult.accuracy}%`} />
            <ResultMetric label="Attempted" value={lastResult.totalAttempted.toString()} />
            <ResultMetric label="Missed" value={lastResult.incorrectAnswers.toString()} />
          </View>
        </View>
        <View style={styles.noticeCard}>
          <Feather name="lock" size={18} color={colors.primary} />
          <View style={styles.noticeCopy}>
            <Text style={styles.noticeTitle}>Local practice score</Text>
            <Text style={styles.noticeText}>This score is saved on this device. Online rankings will be added with secure accounts and server validation.</Text>
          </View>
        </View>
        <Pressable onPress={startGame} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
          <Feather name="rotate-ccw" size={19} color={colors.primaryForeground} />
          <Text style={styles.primaryButtonText}>Play again</Text>
        </Pressable>
        <Pressable onPress={resetToSetup} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
          <Text style={styles.secondaryButtonText}>Change challenge</Text>
        </Pressable>
      </ScrollView>
    );
  }

  if (screen === 'history') {
    return (
      <View style={styles.screen}>
        {renderHeader('My scores', resetToSetup)}
        <FlatList
          data={scores}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="bar-chart-2" size={34} color={colors.mutedForeground} />
              <Text style={styles.emptyTitle}>No rounds yet</Text>
              <Text style={styles.emptyText}>Complete your first four-minute challenge and your personal history will appear here.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.historyRow}>
              <View style={styles.historyBadge}>
                <Text style={styles.historyBadgeText}>{OPERATION_META[item.operation].short}</Text>
              </View>
              <View style={styles.historyMain}>
                <Text style={styles.historyTitle}>{getOperationLabel(item.operation)} · {item.digitLevel} digit</Text>
                <Text style={styles.historyMeta}>{new Date(item.completedAt).toLocaleDateString()} · {item.accuracy}% accuracy</Text>
              </View>
              <View style={styles.historyScore}>
                <Text style={styles.historyScoreValue}>{item.score}</Text>
                <Text style={styles.historyScoreLabel}>score</Text>
              </View>
            </View>
          )}
        />
      </View>
    );
  }

  if (screen === 'leaderboard') {
    const rankedScores = scores
      .filter((record) => record.operation === operation && record.digitLevel === digitLevel)
      .sort((a, b) => b.score - a.score || b.accuracy - a.accuracy)
      .slice(0, 10);

    return (
      <View style={styles.screen}>
        {renderHeader('Leaderboard', resetToSetup)}
        <ScrollView
          contentContainerStyle={[styles.leaderboardContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.leaderboardHero}>
            <View style={styles.leaderboardHeroTop}>
              <View style={styles.leaderboardIcon}><Feather name="award" size={24} color={colors.accentForeground} /></View>
              <View style={styles.leaderboardHeroCopy}>
                <Text style={styles.leaderboardTitle}>Your best rounds</Text>
                <Text style={styles.leaderboardText}>Ranked practice scores saved on this device.</Text>
              </View>
            </View>
            <View style={styles.leaderboardBestRow}>
              <Text style={styles.leaderboardBestLabel}>BEST SCORE</Text>
              <Text style={styles.leaderboardBestValue}>{rankedScores[0]?.score ?? '—'}</Text>
            </View>
          </View>

          <View style={styles.leaderboardFilters}>
            <Text style={styles.categoryPreviewLabel}>CHOOSE CATEGORY</Text>
            <View style={styles.leaderboardOperationRow}>
              {(['addition', 'subtraction', 'multiplication', 'division'] as Operation[]).map((item) => {
                const selected = operation === item;
                return (
                  <Pressable
                    accessibilityLabel={getOperationLabel(item)}
                    key={item}
                    onPress={() => setOperation(item)}
                    style={({ pressed }) => [
                      styles.leaderboardOperationButton,
                      selected && styles.leaderboardFilterSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={[styles.leaderboardOperationText, selected && styles.leaderboardFilterTextSelected]}>
                      {OPERATION_META[item].short}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.leaderboardLevelRow}>
              {([1, 2, 3, 4] as DigitLevel[]).map((level) => {
                const selected = digitLevel === level;
                return (
                  <Pressable
                    accessibilityLabel={`${level} digit`}
                    key={level}
                    onPress={() => setDigitLevel(level)}
                    style={({ pressed }) => [
                      styles.leaderboardLevelButton,
                      selected && styles.leaderboardFilterSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={[styles.leaderboardLevelText, selected && styles.leaderboardFilterTextSelected]}>
                      {level}D
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.rankingSection}>
            <View style={styles.rankingHeadingRow}>
              <Text style={styles.categoryPreviewLabel}>TOP ROUNDS</Text>
              <Text style={styles.rankingCategory}>{getOperationLabel(operation)} · {digitLevel}D</Text>
            </View>
            {rankedScores.length ? (
              rankedScores.map((record, index) => (
                <View key={record.id} style={[styles.rankingRow, index === 0 && styles.rankingRowBest]}>
                  <View style={[styles.rankBadge, index === 0 && styles.rankBadgeBest]}>
                    <Text style={[styles.rankNumber, index === 0 && styles.rankNumberBest]}>{index + 1}</Text>
                  </View>
                  <View style={styles.rankingDetails}>
                    <Text style={styles.rankingScore}>{record.score} correct</Text>
                    <Text style={styles.rankingMeta}>{record.accuracy}% accuracy · {new Date(record.completedAt).toLocaleDateString()}</Text>
                  </View>
                  {index === 0 && <Feather name="award" size={20} color={colors.accentForeground} />}
                </View>
              ))
            ) : (
              <View style={styles.rankingEmpty}>
                <View style={styles.rankingEmptyIcon}><Feather name="bar-chart-2" size={24} color={colors.primary} /></View>
                <Text style={styles.rankingEmptyTitle}>No scores in this category</Text>
                <Text style={styles.rankingEmptyText}>Finish a {digitLevel}-digit {getOperationLabel(operation).toLowerCase()} round to take the first spot.</Text>
              </View>
            )}
          </View>

          <View style={styles.onlineNotice}>
            <Feather name="globe" size={19} color={colors.primary} />
            <View style={styles.onlineNoticeCopy}>
              <Text style={styles.onlineNoticeTitle}>Global competition is next</Text>
              <Text style={styles.onlineNoticeText}>Secure accounts and verified scores will unlock worldwide and location-based rankings.</Text>
            </View>
            <View style={styles.soonPill}><Text style={styles.soonPillText}>SOON</Text></View>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[
          styles.screenContent,
          {
            paddingTop: Platform.OS === 'web' ? 67 : 18,
            paddingBottom: Platform.OS === 'web' ? 34 : 24,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
      <View style={styles.brandRow}>
        <View style={styles.brandMark}><Feather name="zap" size={19} color={colors.primaryForeground} /></View>
        <View>
          <Text style={styles.brandEyebrow}>QANAKAGON</Text>
          <Text style={styles.brandTitle}>Think Fast.</Text>
        </View>
        <View style={styles.practiceBadge}><Text style={styles.practiceBadgeText}>PRACTICE</Text></View>
      </View>

      <View style={styles.heroCopy}>
        <Text style={styles.heroTitle}>Calculate faster.</Text>
        <Text style={styles.heroText}>Pick a challenge. Solve without slowing down. Your four minutes start when you do.</Text>
      </View>

      <View style={styles.selectionSection}>
        <View style={styles.sectionHeadingRow}>
          <Text style={styles.sectionLabel}>1 · CHOOSE OPERATION</Text>
          <Text style={styles.selectionValue}>{getOperationLabel(operation)}</Text>
        </View>
        <View style={styles.operationGrid}>
          {(['addition', 'subtraction', 'multiplication', 'division'] as Operation[]).map((item) => {
            const selected = operation === item;
            return (
              <Pressable
                key={item}
                accessibilityLabel={`Choose ${getOperationLabel(item)}`}
                onPress={() => setOperation(item)}
                style={({ pressed }) => [
                  styles.operationCard,
                  selected && styles.operationCardSelected,
                  pressed && styles.pressed,
                ]}
              >
                <View style={[styles.operationIcon, selected && styles.operationIconSelected]}>
                  <Feather name={OPERATION_META[item].icon} size={21} color={selected ? colors.primaryForeground : colors.primary} />
                </View>
                <Text style={[styles.operationLabel, selected && styles.operationLabelSelected]}>{getOperationLabel(item)}</Text>
                {selected && <Feather name="check-circle" size={16} color={colors.primary} />}
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.selectionSection}>
        <View style={styles.sectionHeadingRow}>
          <Text style={styles.sectionLabel}>2 · CHOOSE DIFFICULTY</Text>
          <Text style={styles.selectionValue}>{digitLevel} digit{digitLevel === 1 ? '' : 's'}</Text>
        </View>
        <View style={styles.levelRow}>
          {([1, 2, 3, 4] as DigitLevel[]).map((level) => {
            const selected = digitLevel === level;
            return (
              <Pressable
                key={level}
                accessibilityLabel={`Choose ${level} digit difficulty`}
                onPress={() => setDigitLevel(level)}
                style={({ pressed }) => [styles.levelButton, selected && styles.levelButtonSelected, pressed && styles.pressed]}
              >
                <Text style={[styles.levelNumber, selected && styles.levelNumberSelected]}>{level}</Text>
                <Text style={[styles.levelCaption, selected && styles.levelCaptionSelected]}>digit{level === 1 ? '' : 's'}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Pressable onPress={startGame} style={({ pressed }) => [styles.primaryButton, styles.startButton, pressed && styles.pressed]}>
        <Text style={styles.primaryButtonText}>Start challenge</Text>
        <Feather name="arrow-right" size={21} color={colors.primaryForeground} />
      </Pressable>

      <View style={styles.quickLinks}>
        <Pressable onPress={() => setScreen('history')} style={({ pressed }) => [styles.quickLink, pressed && styles.pressed]}>
          <Feather name="bar-chart-2" size={18} color={colors.primary} />
          <Text style={styles.quickLinkText}>My scores</Text>
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
        </Pressable>
        <Pressable onPress={() => setScreen('leaderboard')} style={({ pressed }) => [styles.quickLink, pressed && styles.pressed]}>
          <Feather name="globe" size={18} color={colors.primary} />
          <Text style={styles.quickLinkText}>Leaderboard</Text>
          <View style={styles.soonPill}><Text style={styles.soonPillText}>SOON</Text></View>
        </Pressable>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ResultMetric({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.resultMetric}>
      <Text style={styles.resultMetricValue}>{value}</Text>
      <Text style={styles.resultMetricLabel}>{label}</Text>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    screenContent: { paddingHorizontal: 20 },
    header: { minHeight: 78, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.background },
    headerTitle: { color: colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 18 },
    iconButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
    brandRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
    brandMark: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    brandEyebrow: { color: colors.primary, fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.1 },
    brandTitle: { color: colors.foreground, fontFamily: 'Inter_700Bold', fontSize: 18, letterSpacing: -0.4 },
    practiceBadge: { marginLeft: 'auto', backgroundColor: colors.accent, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 5 },
    practiceBadgeText: { color: colors.accentForeground, fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 0.8 },
    heroCopy: { marginTop: 35, marginBottom: 28 },
    heroTitle: { color: colors.foreground, fontFamily: 'Inter_700Bold', fontSize: 31, letterSpacing: -1.2, lineHeight: 37, maxWidth: 300 },
    heroText: { color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 22, marginTop: 10, maxWidth: 340 },
    selectionSection: { marginBottom: 25 },
    sectionHeadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 },
    sectionLabel: { color: colors.mutedForeground, fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 0.9 },
    selectionValue: { color: colors.primary, fontFamily: 'Inter_600SemiBold', fontSize: 12 },
    operationGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
    operationCard: { width: '48.6%', minHeight: 80, borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 9 },
    operationCardSelected: { borderColor: colors.primary, backgroundColor: colors.secondary },
    operationIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
    operationIconSelected: { backgroundColor: colors.primary },
    operationLabel: { flex: 1, color: colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 12 },
    operationLabelSelected: { color: colors.secondaryForeground },
    levelRow: { flexDirection: 'row', gap: 9 },
    levelButton: { flex: 1, minHeight: 70, borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
    levelButtonSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
    levelNumber: { color: colors.foreground, fontFamily: 'Inter_700Bold', fontSize: 21 },
    levelNumberSelected: { color: colors.primaryForeground },
    levelCaption: { color: colors.mutedForeground, fontFamily: 'Inter_500Medium', fontSize: 10, marginTop: 2 },
    levelCaptionSelected: { color: colors.primaryForeground },
    primaryButton: { minHeight: 57, borderRadius: 16, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
    startButton: { marginTop: 2 },
    primaryButtonText: { color: colors.primaryForeground, fontFamily: 'Inter_700Bold', fontSize: 16 },
    secondaryButton: { minHeight: 52, borderRadius: 15, borderWidth: 1, borderColor: colors.accent, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
    secondaryButtonText: { color: colors.accentForeground, fontFamily: 'Inter_700Bold', fontSize: 14 },
    quickLinks: { marginTop: 20, gap: 9 },
    quickLink: { minHeight: 54, backgroundColor: colors.card, borderRadius: 14, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 11 },
    quickLinkText: { flex: 1, color: colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 14 },
    soonPill: { backgroundColor: colors.muted, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 4 },
    soonPillText: { color: colors.mutedForeground, fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 0.6 },
    pressed: { opacity: 0.72 },
    gameScreen: { paddingHorizontal: 20, justifyContent: 'space-between' },
    gameTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    gameContext: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 },
    gameContextIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    gameContextCopy: { marginLeft: 10, flexShrink: 1 },
    gameContextTitle: { color: colors.foreground, fontFamily: 'Inter_700Bold', fontSize: 15 },
    gameContextMeta: { color: colors.mutedForeground, fontFamily: 'Inter_500Medium', fontSize: 11, marginTop: 3 },
    eyebrow: { color: colors.primary, fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.1 },
    gameScore: { color: colors.foreground, fontFamily: 'Inter_700Bold', fontSize: 17, marginTop: 6 },
    timerBlock: { minWidth: 96, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 11, paddingVertical: 8 },
    timerBlockUrgent: { borderColor: colors.destructive, backgroundColor: colors.destructive },
    timerLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
    timerLabel: { color: colors.mutedForeground, fontFamily: 'Inter_700Bold', fontSize: 8, letterSpacing: 0.8 },
    timerText: { color: colors.primary, fontFamily: 'Inter_700Bold', fontSize: 23, lineHeight: 27, textAlign: 'center', fontVariant: ['tabular-nums'], marginTop: 2 },
    timerTrack: { height: 5, borderRadius: 3, backgroundColor: colors.muted, overflow: 'hidden', marginTop: 12 },
    timerProgress: { height: '100%', borderRadius: 3, backgroundColor: colors.primary },
    timerProgressUrgent: { backgroundColor: colors.destructive },
    questionArea: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 18 },
    problemCard: { width: '100%', minHeight: 194, borderRadius: 25, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 22 },
    questionLabel: { color: colors.accentForeground, fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.4, opacity: 0.68 },
    questionText: { color: colors.accentForeground, fontFamily: 'Inter_700Bold', fontSize: 39, letterSpacing: -1.3, marginTop: 16, textAlign: 'center' },
    answerLabel: { color: colors.mutedForeground, fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.2, marginTop: 24 },
    answerRow: { width: '100%', flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 9 },
    answerInput: { width: 156, height: 68, borderRadius: 17, borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.card, color: colors.foreground, fontFamily: 'Inter_700Bold', fontSize: 30, paddingHorizontal: 12, textAlign: 'center' },
    submitButton: { width: 94, height: 68, borderRadius: 17, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', gap: 2 },
    submitButtonText: { color: colors.primaryForeground, fontFamily: 'Inter_700Bold', fontSize: 11 },
    answerHint: { color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 10 },
    gameBottom: { gap: 12 },
    statStrip: { minHeight: 70, borderRadius: 17, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
    statItem: { alignItems: 'center', minWidth: 80 },
    statValue: { color: colors.foreground, fontFamily: 'Inter_700Bold', fontSize: 20 },
    statLabel: { color: colors.mutedForeground, fontFamily: 'Inter_500Medium', fontSize: 11, marginTop: 3 },
    statDivider: { width: 1, height: 31, backgroundColor: colors.border },
    endGameButton: { alignItems: 'center', paddingVertical: 5 },
    endGameText: { color: colors.mutedForeground, fontFamily: 'Inter_500Medium', fontSize: 13 },
    resultsHeader: { alignItems: 'center', marginTop: 16, marginBottom: 24 },
    resultIcon: { width: 64, height: 64, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 19 },
    resultsTitle: { color: colors.foreground, fontFamily: 'Inter_700Bold', fontSize: 29, letterSpacing: -0.8, marginTop: 9 },
    resultsSubtitle: { color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 14, marginTop: 7 },
    scoreCard: { backgroundColor: colors.navy, borderRadius: 21, paddingHorizontal: 20, paddingVertical: 22, alignItems: 'center' },
    scoreLabel: { color: colors.navyMuted, fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.2 },
    bigScore: { color: colors.accent, fontFamily: 'Inter_700Bold', fontSize: 68, letterSpacing: -2, marginTop: 2 },
    scoreCaption: { color: colors.navyMuted, fontFamily: 'Inter_500Medium', fontSize: 12, marginTop: -5 },
    resultsGrid: { width: '100%', flexDirection: 'row', justifyContent: 'space-around', borderTopWidth: 1, borderTopColor: '#304064', marginTop: 20, paddingTop: 16 },
    resultMetric: { alignItems: 'center', minWidth: 75 },
    resultMetricValue: { color: colors.card, fontFamily: 'Inter_700Bold', fontSize: 18 },
    resultMetricLabel: { color: colors.navyMuted, fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 3 },
    noticeCard: { flexDirection: 'row', gap: 12, backgroundColor: colors.secondary, borderRadius: 16, padding: 15, marginTop: 13, marginBottom: 18 },
    noticeCopy: { flex: 1 },
    noticeTitle: { color: colors.secondaryForeground, fontFamily: 'Inter_700Bold', fontSize: 13 },
    noticeText: { color: colors.secondaryForeground, fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, marginTop: 4, opacity: 0.82 },
    listContent: { paddingHorizontal: 20, paddingTop: 8, flexGrow: 1 },
    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 26, paddingTop: 100 },
    emptyTitle: { color: colors.foreground, fontFamily: 'Inter_700Bold', fontSize: 19, marginTop: 15 },
    emptyText: { color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 8 },
    historyRow: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 16, minHeight: 75, padding: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    historyBadge: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' },
    historyBadgeText: { color: colors.primary, fontFamily: 'Inter_700Bold', fontSize: 18 },
    historyMain: { flex: 1, marginLeft: 12 },
    historyTitle: { color: colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 13 },
    historyMeta: { color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 5 },
    historyScore: { alignItems: 'flex-end', marginLeft: 8 },
    historyScoreValue: { color: colors.primary, fontFamily: 'Inter_700Bold', fontSize: 21 },
    historyScoreLabel: { color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 1 },
    leaderboardContent: { paddingHorizontal: 20, paddingTop: 18 },
    leaderboardHero: { backgroundColor: colors.navy, borderRadius: 21, padding: 18 },
    leaderboardHeroTop: { flexDirection: 'row', alignItems: 'center' },
    leaderboardHeroCopy: { flex: 1, marginLeft: 13 },
    leaderboardIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
    leaderboardTitle: { color: colors.primaryForeground, fontFamily: 'Inter_700Bold', fontSize: 20 },
    leaderboardText: { color: colors.navyMuted, fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, marginTop: 4 },
    leaderboardBestRow: { marginTop: 18, paddingTop: 15, borderTopWidth: 1, borderTopColor: colors.mutedForeground, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    leaderboardBestLabel: { color: colors.navyMuted, fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.1 },
    leaderboardBestValue: { color: colors.accent, fontFamily: 'Inter_700Bold', fontSize: 28 },
    leaderboardFilters: { marginTop: 22 },
    categoryPreviewLabel: { color: colors.mutedForeground, fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.1, marginBottom: 11 },
    leaderboardOperationRow: { flexDirection: 'row', gap: 8 },
    leaderboardOperationButton: { flex: 1, height: 49, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    leaderboardOperationText: { color: colors.primary, fontFamily: 'Inter_700Bold', fontSize: 22 },
    leaderboardLevelRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
    leaderboardLevelButton: { flex: 1, height: 38, borderRadius: 11, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    leaderboardLevelText: { color: colors.foreground, fontFamily: 'Inter_700Bold', fontSize: 12 },
    leaderboardFilterSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    leaderboardFilterTextSelected: { color: colors.primaryForeground },
    rankingSection: { marginTop: 23 },
    rankingHeadingRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    rankingCategory: { color: colors.primary, fontFamily: 'Inter_600SemiBold', fontSize: 11 },
    rankingRow: { minHeight: 65, borderRadius: 15, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    rankingRowBest: { backgroundColor: colors.accent, borderColor: colors.accent },
    rankBadge: { width: 32, height: 32, borderRadius: 11, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' },
    rankBadgeBest: { backgroundColor: colors.accentForeground },
    rankNumber: { color: colors.primary, fontFamily: 'Inter_700Bold', fontSize: 14 },
    rankNumberBest: { color: colors.accent },
    rankingDetails: { flex: 1, marginLeft: 11 },
    rankingScore: { color: colors.foreground, fontFamily: 'Inter_700Bold', fontSize: 14 },
    rankingMeta: { color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 4 },
    rankingEmpty: { minHeight: 150, borderRadius: 17, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
    rankingEmptyIcon: { width: 43, height: 43, borderRadius: 14, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' },
    rankingEmptyTitle: { color: colors.foreground, fontFamily: 'Inter_700Bold', fontSize: 14, marginTop: 12 },
    rankingEmptyText: { color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 5 },
    onlineNotice: { marginTop: 18, borderRadius: 16, backgroundColor: colors.secondary, padding: 14, flexDirection: 'row', alignItems: 'center' },
    onlineNoticeCopy: { flex: 1, marginLeft: 11, marginRight: 8 },
    onlineNoticeTitle: { color: colors.secondaryForeground, fontFamily: 'Inter_700Bold', fontSize: 12 },
    onlineNoticeText: { color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 15, marginTop: 3 },
  });
}