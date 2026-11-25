// One round of 10 sums. Three ways to answer, picked before the round:
// - praten: hands-free, the app reads the sum, the mic opens by itself, she answers out loud;
// - typen: no voice at all, the sum shows and the keyboard is ready at once;
// - kiezen: no voice, six buttons, tap the right one as fast as possible.
// The clock starts only when the app is ready for her answer (see lib/clock.ts).

import {
  answer,
  applyOutcome,
  decodeChallenge,
  BASE_TABLES,
  choicesFor,
  dutchNumberWord,
  FAST_MS,
  isBoss,
  key,
  planRound,
  poolFor,
  rankOf,
  RANKS,
  RANK_COLORS,
  reinsert,
  smartTables,
  statsOf,
  xpFor,
  type Outcome,
  type Sum,
} from '@tafelrush/shared'
import { router, useLocalSearchParams } from 'expo-router'
import { ArrowRight, Mic, Pause, Play, Square, Volume2, X } from 'lucide-react-native'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Keyboard, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated'

import { Bubble, Button, Chip, IconButton, Screen, styles as ui, Txt } from '@/components/ui'
import { track } from '@/lib/analytics'
import { useScreenAwake } from '@/lib/awake'
import { buzz } from '@/lib/buzz'
import { hasKeyboard, useKeys } from '@/lib/keys'
import { handoffMark } from '@/lib/devlog'
import {
  canListen,
  currentEngine,
  holdAudioSession,
  listenForNumber,
  ListenError,
  releaseAudioSession,
  stopListening,
} from '@/lib/listen'
import { choiceForKey } from '@/lib/webspeech'
import { fill, pickPhrase, type PhraseKind, type PhraseVars } from '@/lib/phrases'
import { play } from '@/lib/sfx'
import { clockStartsOn, elapsedMs, fractionLeft, freezeClock, newClock, secondsLeft, startClock, timeUp } from '@/lib/clock'
import { getState, setState, today, updateSettings, type InputMethod, type RoundResult } from '@/lib/store'
import { colors, fonts, radius, space } from '@/lib/theme'
import { say, sayWithCue, stopVoice } from '@/lib/voice'

type Phase = 'start' | 'spreken' | 'luisteren' | 'goed' | 'fout' | 'nazeggen' | 'telaat' | 'pauze'
type Line = { id: number; from: 'app' | 'me'; text: string; live?: boolean }
type Token = { cancelled: boolean }

type View_ = {
  phase: Phase
  index: number
  sum: Sum | null
  boss: boolean
  lines: Line[]
  heard: string
  /** She is talking: the clock is stopped while the phone works out the number. */
  talking: boolean
  combo: number
  results: (Outcome | null)[]
  /** 1 = full time left, 0 = time up. */
  timeLeft: number
  secondsLeft: number
  input: InputMethod
  /** The six buttons when input is 'kiezen'. */
  choices: number[]
  given: number | null
  xpGained: number
  rank: [number, number] | null
  ms: number | null
  headline: string
  sixSeven: boolean
  notice: string | null
}

const ROUND = 10
const WEB = Platform.OS === 'web'
/** Show 1 to 9 on the multiple-choice buttons (browser with a physical keyboard). */
const KEY_HINTS = hasKeyboard()
const NO_TIMER_MS = 30_000
const REPEAT_MS = 8_000
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export default function Ronde() {
  useScreenAwake()
  const { code } = useLocalSearchParams<{ code?: string }>()

  const [view, setView] = useState<View_>(() => ({
    phase: 'start',
    index: 0,
    sum: null,
    boss: false,
    lines: [],
    heard: '',
    talking: false,
    combo: 0,
    results: Array(ROUND).fill(null),
    timeLeft: 1,
    secondsLeft: getState().settings.seconds,
    input: getState().settings.input,
    choices: [],
    given: null,
    xpGained: 0,
    rank: null,
    ms: null,
    headline: '',
    sixSeven: false,
    notice: null,
  }))
  const patch = useCallback((p: Partial<View_> | ((v: View_) => Partial<View_>)) => {
    setView((v) => ({ ...v, ...(typeof p === 'function' ? p(v) : p) }))
  }, [])

  // Engine state lives in a ref: the async loop must not wait for renders.
  const eng = useRef({
    token: { cancelled: false } as Token,
    plan: [] as Sum[],
    index: 0,
    combo: 0,
    bestCombo: 0,
    xp: 0,
    thinkMs: 0,
    results: Array<Outcome | null>(ROUND).fill(null),
    played: [] as Sum[],
    phraseIds: [] as string[],
    rankChanges: {} as Record<string, [number, number]>,
    lastIds: {} as Partial<Record<PhraseKind, string>>,
    lineId: 0,
    challenge: null as ReturnType<typeof decodeChallenge>,
    /** Set while a typed or tapped answer is welcome. */
    typedResolve: null as ((n: number) => void) | null,
    /** Input method for this round; falls back to typing when the mic fails. */
    input: getState().settings.input as InputMethod,
  })

  // Typing: lift the screen above the keyboard, or the input and OK sit underneath it.
  const [keyboard, setKeyboard] = useState(0)
  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', (e) => setKeyboard(e.endCoordinates.height))
    const hide = Keyboard.addListener('keyboardWillHide', () => setKeyboard(0))
    return () => {
      show.remove()
      hide.remove()
    }
  }, [])

  const shake = useSharedValue(0)
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }))

  const addLine = useCallback(
    (from: Line['from'], text: string, live = false) => {
      const id = ++eng.current.lineId
      patch((v) => ({ lines: [...v.lines.filter((l) => !l.live), { id, from, text, live }].slice(-4) }))
    },
    [patch],
  )

  const phrase = useCallback((kind: PhraseKind, vars: PhraseVars) => {
    const { settings, banned } = getState()
    const p = pickPhrase(kind, { slang: settings.slang, banned, lastId: eng.current.lastIds[kind] })
    if (!p) return null
    eng.current.lastIds[kind] = p.id
    eng.current.phraseIds.push(p.id)
    return fill(p.text, vars)
  }, [])

  /** Reads aloud when talking. Without voice the screen just stays up for `quietMs`. */
  const speak = useCallback(async (text: string, quietMs = 0) => {
    if (eng.current.input === 'praten') await say(text)
    else if (quietMs > 0) await wait(quietMs)
  }, [])

  // ---------- getting an answer ----------

  const getAnswer = useCallback(
    async (
      timeoutMs: number,
      token: Token,
      withTimer: boolean,
      sum: Sum,
      /** The question still being read aloud; listening starts before it ends. */
      spoken?: Promise<void>,
    ): Promise<{ value: number | null; ms: number | null; input: 'voice' | 'typed' | 'choice' }> => {
      const e = eng.current
      const input = e.input
      const shown = withTimer && getState().settings.seconds > 0
      let clock = newClock(timeoutMs)
      if (clockStartsOn(input) === 'shown') clock = startClock(clock, Date.now())
      patch({ phase: withTimer ? 'luisteren' : 'nazeggen', heard: '', timeLeft: 1, secondsLeft: Math.ceil(timeoutMs / 1000), talking: false })

      let nudged = false
      const show = () => {
        if (!shown) return
        const now = Date.now()
        const left = fractionLeft(clock, now)
        patch({ timeLeft: left, secondsLeft: secondsLeft(clock, now) })
        if (!nudged && left < 0.5) {
          nudged = true
          const p = phrase('porren', {})
          if (p) addLine('app', p.shown)
        }
      }

      // Typing and tapping: the answer is welcome from the moment the sum shows.
      const typedOrTapped = (method: InputMethod) =>
        new Promise<{ value: number | null; ms: number | null; input: 'typed' | 'choice' }>((resolve) => {
          const tick = setInterval(() => {
            if (token.cancelled || timeUp(clock, Date.now())) return done(null)
            show()
          }, 100)
          function done(n: number | null) {
            clearInterval(tick)
            e.typedResolve = null
            resolve({ value: n, ms: n === null ? null : elapsedMs(clock, Date.now()), input: method === 'kiezen' ? 'choice' : 'typed' })
          }
          e.typedResolve = done
        })
      if (input !== 'praten') return typedOrTapped(input)

      // Talking: the clock waits until the question is read and the mic is open, and stops once she talks.
      const tick = setInterval(show, 100)
      try {
        const heard = await listenForNumber({
          timeoutMs,
          sum,
          spoken,
          signal: token,
          onPartial: (t) => patch({ heard: t }),
          onListening: () => {
            play('tick')
            clock = startClock(clock, Date.now())
          },
          onSpeech: () => {
            clock = freezeClock(clock, Date.now())
            patch({ talking: true })
          },
        })
        return { value: heard.value, ms: heard.ms, input: 'voice' }
      } catch (err) {
        if (!(err instanceof ListenError)) return { value: null, ms: null, input: 'voice' }
        // The mic cannot work at all here: type from now on.
        track('switch_to_typing', { reason: 'error' })
        updateSettings({ input: 'typen' })
        e.input = 'typen'
        const notice =
          err.code === 'language-not-supported'
            ? WEB
              ? 'Deze browser verstaat geen Nederlands. Typ je antwoord maar.'
              : 'Je telefoon verstaat nog geen Nederlands. Typ je antwoord maar; in de instellingen van Google kun je Nederlands toevoegen.'
            : 'De microfoon mag niet luisteren. Typ je antwoord maar.'
        patch({ input: 'typen', notice, talking: false, timeLeft: 1 })
        clearInterval(tick)
        clock = startClock(newClock(timeoutMs), Date.now())
        return typedOrTapped('typen')
      } finally {
        clearInterval(tick)
      }
    },
    [addLine, patch, phrase],
  )

  // ---------- one sum ----------

  const runSum = useCallback(
    async (i: number, token: Token) => {
      const e = eng.current
      const s = e.plan[i]
      const { settings } = getState()
      const statsBefore = statsOf(getState().progress, s)
      const boss = isBoss(statsBefore)
      const ans = answer(s)
      const talking = e.input === 'praten'

      patch({
        phase: talking ? 'spreken' : 'luisteren',
        index: i,
        sum: s,
        boss,
        heard: '',
        given: null,
        sixSeven: false,
        timeLeft: 1,
        secondsLeft: settings.seconds,
        choices: e.input === 'kiezen' ? choicesFor(s, Math.random) : [],
      })
      // Talking: the mic starts just before the question ends (see lib/handoff.ts).
      let spoken: Promise<void> | undefined
      if (talking) {
        addLine('app', `${cap(dutchNumberWord(s.a))} keer ${dutchNumberWord(s.b)}?`)
        handoffMark(`q${i + 1} ${s.a}x${s.b}`)
        const q = sayWithCue(`${s.a} keer ${s.b}?`)
        await q.micCue
        if (token.cancelled) return false
        spoken = q.done
      }

      const timeoutMs = settings.seconds > 0 ? settings.seconds * 1000 : NO_TIMER_MS
      const { value, ms, input } = await getAnswer(timeoutMs, token, true, s, spoken)
      if (token.cancelled) return false

      e.thinkMs += value === null ? timeoutMs : (ms ?? timeoutMs)
      const outcome: Outcome =
        value === null ? 'telaat' : value !== ans ? 'fout' : (ms ?? timeoutMs) <= FAST_MS ? 'snel' : 'traag'
      addLine('me', value === null ? '...' : talking ? dutchNumberWord(value) : String(value))
      track('answer', { a: s.a, b: s.b, outcome, input, ms: ms ?? timeoutMs, engine: currentEngine() })

      // Progress, rank and XP.
      const rankBefore = rankOf(statsBefore.level)
      const progress = applyOutcome(getState().progress, s, outcome, Date.now())
      setState({ progress })
      const rankAfter = rankOf(statsOf(progress, s).level)
      const k = key(s)
      if (rankAfter !== rankBefore) {
        const first = e.rankChanges[k]?.[0] ?? rankBefore
        e.rankChanges[k] = [first, rankAfter]
      }
      const goed = outcome === 'snel' || outcome === 'traag'
      e.combo = goed ? e.combo + 1 : 0
      e.bestCombo = Math.max(e.bestCombo, e.combo)
      const xp = xpFor(outcome, e.combo, boss)
      e.xp += xp
      e.results[i] = outcome
      e.played[i] = s
      patch({ results: e.results.slice(), combo: e.combo, xpGained: xp, ms, given: value, rank: [rankBefore, rankAfter] })

      const vars: PhraseVars = { a: s.a, b: s.b, antwoord: ans, combo: e.combo }

      if (goed) {
        const sixSeven = settings.slang && ((s.a === 6 && s.b === 7) || (s.a === 7 && s.b === 6))
        const kind: PhraseKind = sixSeven ? 'sixseven' : boss ? 'boss' : e.combo >= 3 && e.combo % 2 === 1 ? 'combo' : 'goed'
        play(sixSeven ? 'sixseven' : boss || e.combo === 5 || e.combo === 10 ? 'airhorn' : e.combo >= 3 ? 'combo' : 'goed')
        buzz('goed')
        const p = phrase(kind, vars)
        patch({ phase: 'goed', sixSeven, headline: '' })
        if (p) addLine('app', p.shown)
        await speak(p?.spoken ?? '', 900)
        await wait(350)
        return true
      }

      if (outcome === 'fout') {
        play('boom')
        buzz('fout')
        if (settings.shake) {
          shake.set(
            withSequence(
              withTiming(-14, { duration: 50 }),
              withTiming(14, { duration: 60 }),
              withTiming(-10, { duration: 60 }),
              withTiming(8, { duration: 60 }),
              withTiming(0, { duration: 50 }),
            ),
          )
        }
        const p = phrase('fout', vars)
        const slangHead = settings.slang && p?.shown.startsWith('Bruh')
        patch({ phase: 'fout', headline: slangHead ? 'BRUH.' : settings.slang && p?.shown.startsWith('Wat de helly') ? 'WAT DE\nHELLY.' : 'MIS.' })
        if (p) addLine('app', p.shown)
        await speak(p?.spoken ?? '', 1800)
      } else {
        play('buffering')
        const p = phrase('telaat', vars)
        patch({ phase: 'telaat', headline: 'Buffering...' })
        if (p) addLine('app', p.shown)
        await speak(p?.spoken ?? '', 1800)
      }
      if (token.cancelled) return false

      // Say (or type) it once correctly, then it comes back later in the round.
      // Not with buttons: the answer is still on screen, tapping it teaches nothing.
      if (settings.repeatAfterWrong && e.input !== 'kiezen') {
        let repeatSpoken: Promise<void> | undefined
        if (e.input === 'praten') {
          addLine('app', `Zeg maar na: ${dutchNumberWord(s.a)} keer ${dutchNumberWord(s.b)} is...`)
          handoffMark(`repeat ${s.a}x${s.b}`)
          const q = sayWithCue(`Zeg maar na: ${s.a} keer ${s.b} is`)
          await q.micCue
          repeatSpoken = q.done
        } else {
          addLine('app', `Typ hem nog een keer: ${s.a} × ${s.b} is...`)
        }
        if (token.cancelled) return false
        const again = await getAnswer(REPEAT_MS, token, false, s, repeatSpoken)
        if (token.cancelled) return false
        if (again.value !== null) addLine('me', again.input === 'voice' ? dutchNumberWord(again.value) : String(again.value))
        track('repeat_after_wrong', { ok: again.value === ans })
        const p = phrase(again.value === ans ? 'onthouden' : 'nogniet', vars)
        if (again.value === ans) play('goed')
        if (p) addLine('app', p.shown)
        await speak(p?.spoken ?? '', 900)
      }
      e.plan = reinsert(e.plan, i, s, Math.random)
      await wait(300)
      return true
    },
    [addLine, getAnswer, patch, phrase, shake, speak],
  )

  // ---------- the round ----------

  const finish = useCallback(() => {
    const e = eng.current
    const outcomes = e.results.map((r) => (r === 'snel' || r === 'traag' ? 'goed' : (r ?? 'telaat'))) as RoundResult['outcomes']
    const score = outcomes.filter((o) => o === 'goed').length
    const seconds = Math.round(e.thinkMs / 1000)
    const result: RoundResult = {
      score,
      total: ROUND,
      seconds,
      bestCombo: e.bestCombo,
      xp: e.xp,
      outcomes,
      rankChanges: e.rankChanges,
      phraseIds: [...new Set(e.phraseIds)],
      played: e.played,
      challengeCode: typeof code === 'string' ? code : null,
    }
    releaseAudioSession()
    track('round_end', { score, seconds, best_combo: e.bestCombo, xp: e.xp })
    setState((st) => {
      const challenges = result.challengeCode
        ? st.challenges.map((c) => (c.code === result.challengeCode ? { ...c, mine: { score, seconds } } : c))
        : st.challenges
      return {
        lastRound: result,
        xp: st.xp + e.xp,
        rounds: [...st.rounds, { at: Date.now(), score, total: ROUND, seconds, bestCombo: e.bestCombo, xp: e.xp }].slice(-300),
        days: st.days.includes(today()) ? st.days : [...st.days, today()].slice(-400),
        challenges,
      }
    })
    router.replace('/einde')
  }, [code])

  const runFrom = useCallback(
    async (start: number) => {
      const token: Token = { cancelled: false }
      eng.current.token = token
      for (let i = start; i < ROUND; i++) {
        eng.current.index = i
        const ok = await runSum(i, token)
        if (!ok || token.cancelled) return
      }
      finish()
    },
    [finish, runSum],
  )

  useEffect(() => {
    const e = eng.current
    const { settings, progress } = getState()
    const challenge = typeof code === 'string' ? decodeChallenge(code) : null
    e.challenge = challenge
    if (challenge) {
      e.plan = challenge.sums.slice(0, ROUND)
      while (e.plan.length < ROUND) e.plan.push(challenge.sums[e.plan.length % challenge.sums.length])
    } else {
      const tables =
        settings.mode === 'slim' ? smartTables(progress) : settings.mode === 'alles' ? BASE_TABLES : settings.tables
      e.plan = planRound(poolFor(tables), progress, Math.random, ROUND)
    }

    e.input = settings.input
    let alive = true
    ;(async () => {
      if (e.input === 'praten') {
        const mic = await canListen()
        track('mic', { result: mic })
        if (mic !== 'ok') {
          updateSettings({ input: 'typen' })
          e.input = 'typen'
          patch({
            input: 'typen',
            notice:
              mic === 'denied'
                ? `Geen toegang tot de microfoon. Je typt nu je antwoorden; aanzetten kan in de instellingen van je ${WEB ? 'browser' : 'telefoon'}.`
                : `Spraakherkenning werkt niet ${WEB ? 'in deze browser' : 'op dit toestel'}. Je typt nu je antwoorden.`,
          })
        }
      }
      if (!alive) return
      // One audio session for the whole round, so the mic can open without clipping the voice.
      if (e.input === 'praten') holdAudioSession()
      track('round_start', {
        mode: challenge ? 'challenge' : settings.mode,
        input: e.input === 'praten' ? 'voice' : e.input === 'kiezen' ? 'choice' : 'typed',
        timer: settings.seconds,
      })
      const intro = challenge ? `${challenge.name || 'Iemand'} daagt je uit. Daar gaan we.` : 'Daar gaan we.'
      addLine('app', intro)
      await speak(intro, 700)
      if (alive) void runFrom(0)
    })()

    return () => {
      alive = false
      e.token.cancelled = true
      stopVoice()
      stopListening()
      releaseAudioSession()
    }
    // Runs once per round.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function pause() {
    eng.current.token.cancelled = true
    stopVoice()
    stopListening()
    releaseAudioSession()
    patch({ phase: 'pauze' })
  }

  function resume() {
    patch({ phase: 'spreken', lines: [] })
    if (eng.current.input === 'praten') holdAudioSession()
    void runFrom(eng.current.index)
  }

  function quit() {
    track('round_quit', { at_sum: eng.current.index + 1 })
    eng.current.token.cancelled = true
    stopVoice()
    stopListening()
    releaseAudioSession()
    router.back()
  }

  // ---------- drawing ----------

  const { phase, sum } = view
  const accent = view.timeLeft > 0.5 ? colors.lime : view.timeLeft > 0.2 ? colors.orange : colors.pink
  const timerBg = view.timeLeft > 0.5 ? colors.timerFull : view.timeLeft > 0.2 ? colors.timerHalf : colors.timerLow
  const background =
    phase === 'goed' ? colors.lime : phase === 'fout' ? colors.pink : phase === 'luisteren' && getState().settings.seconds > 0 ? timerBg : colors.bg
  const onColor = phase === 'goed' || phase === 'fout'
  const fg = onColor ? colors.ink : colors.text

  // With the keyboard up there is room for two lines, or for the (long) notice alone.
  const shownLines = keyboard > 0 ? (view.notice ? [] : view.lines.slice(-2)) : view.lines
  const choiceNow = view.input === 'kiezen' && phase === 'luisteren'
  const bottom = (
    <Bottom key={`${view.index}-${view.phase}`} view={view} accent={accent} fg={fg} onAnswer={(n) => eng.current.typedResolve?.(n)} />
  )

  return (
    <Animated.View style={[{ flex: 1 }, shakeStyle]}>
      <Screen background={background} style={[
          phase === 'luisteren' && getState().settings.seconds > 0 ? { borderWidth: 5, borderColor: accent } : null,
          keyboard > 0 ? { paddingBottom: keyboard + space.s } : null,
        ]}>
        <TopBar view={view} onPause={pause} fg={fg} accent={accent} />

        {view.boss && phase !== 'goed' && phase !== 'fout' ? (
          <View style={{ alignItems: 'center' }}>
            <Chip label="BOSS · dubbel XP" background={colors.pink} />
          </View>
        ) : null}

        <View style={{ alignItems: 'center', gap: space.s }}>
          {sum ? <Center view={view} sum={sum} fg={fg} /> : <Txt variant="title">Klaar?</Txt>}
        </View>

        {/* Multiple choice: the buttons sit right under the sum, the chat lines fill the space below. */}
        {choiceNow ? bottom : null}

        <View style={s.lines}>
          {view.notice ? <Bubble from="app" text={view.notice} /> : null}
          {shownLines.map((l, i, shown) => (
            <Bubble key={l.id} from={l.from} text={l.text} strong={i === shown.length - 1} />
          ))}
          {(phase === 'luisteren' || phase === 'nazeggen') && view.input === 'praten' ? (
            <Bubble from="me" text={view.heard || '...'} dashed color={accent} />
          ) : null}
        </View>

        {/* Keyed per sum and phase: digits left over from a sum that ran out of time must not carry into the next field. */}
        {choiceNow ? null : bottom}
      </Screen>

      {phase === 'pauze' ? (
        <View style={s.overlay}>
          <Txt variant="title">Pauze</Txt>
          <Txt color={colors.muted}>De som begint opnieuw als je verder gaat.</Txt>
          <Button big label="VERDER" icon={Play} onPress={resume} style={{ alignSelf: 'stretch' }} />
          <Button label="Stoppen" kind="secondary" icon={Square} onPress={quit} style={{ alignSelf: 'stretch' }} />
        </View>
      ) : null}
    </Animated.View>
  )
}

function TopBar({ view, onPause, fg, accent }: { view: View_; onPause: () => void; fg: string; accent: string }) {
  const timed = view.phase === 'luisteren' && getState().settings.seconds > 0
  if (timed) {
    return (
      <View style={ui.row}>
        <IconButton icon={Pause} label="Pauze" onPress={onPause} keyboardFocus={false} />
        <View style={s.timerTrack}>
          <View style={[s.timerFill, { width: `${Math.round(view.timeLeft * 100)}%`, backgroundColor: accent }]} />
        </View>
        <Txt style={{ fontFamily: fonts.display, fontSize: 26, minWidth: 36, textAlign: 'right' }} color={accent}>
          {view.secondsLeft}
        </Txt>
      </View>
    )
  }
  return (
    <View style={ui.row}>
      <IconButton icon={view.phase === 'pauze' ? X : Pause} label="Pauze" onPress={onPause} keyboardFocus={false} />
      <View style={s.segments}>
        {view.results.map((r, i) => (
          <View
            key={i}
            style={[
              s.segment,
              {
                backgroundColor:
                  r === 'snel' || r === 'traag'
                    ? fg === colors.ink ? colors.ink : colors.lime
                    : r === 'fout'
                      ? fg === colors.ink ? colors.text : colors.pink
                      : r === 'telaat'
                        ? colors.cyan
                        : i === view.index
                          ? fg
                          : fg === colors.ink ? 'rgba(16,16,24,0.2)' : colors.line,
              },
            ]}
          />
        ))}
      </View>
      {view.combo >= 2 ? (
        <Chip label={`COMBO ×${view.combo}`} background={fg === colors.ink ? colors.ink : colors.surface} color={colors.lime} />
      ) : (
        <Txt style={{ fontFamily: fonts.displayBold, fontSize: 14 }} color={fg === colors.ink ? colors.ink : colors.muted}>
          {view.index + 1}/{ROUND}
        </Txt>
      )}
    </View>
  )
}

/** Big tables make long numbers: shrink the font so `text` keeps fitting where `chars` characters did. */
function fit(size: number, text: string, chars: number): number {
  return text.length <= chars ? size : Math.round((size * chars) / text.length)
}

function Center({ view, sum, fg }: { view: View_; sum: Sum; fg: string }) {
  const ans = sum.a * sum.b
  const label = `${sum.a}×${sum.b}`
  if (view.phase === 'goed') {
    const [before, after] = view.rank ?? [0, 0]
    return (
      <>
        {view.sixSeven ? (
          <Txt style={{ fontFamily: fonts.display, fontSize: 44, letterSpacing: -1 }} color={colors.ink}>
            SIX SEVEN
          </Txt>
        ) : null}
        <Txt style={{ fontFamily: fonts.display, fontSize: 34 }} color={colors.ink}>
          {sum.a}×{sum.b} =
        </Txt>
        <Txt
          style={{ fontFamily: fonts.display, fontSize: fit(140, String(ans), 3), lineHeight: fit(150, String(ans), 3), letterSpacing: -5 }}
          color={colors.ink}>
          {ans}
        </Txt>
        <View style={{ flexDirection: 'row', gap: space.s, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Chip label={`+${view.xpGained} XP`} background={colors.ink} color={colors.text} />
          {view.boss ? <Chip label="Boss verslagen" background={colors.pink} /> : null}
          {view.ms !== null ? <Chip label={`${(view.ms / 1000).toFixed(1).replace('.', ',')} sec`} background="transparent" /> : null}
        </View>
        {after > before ? (
          <View style={[ui.row, { justifyContent: 'center', marginTop: space.s }]}>
            <Chip label={RANKS[before]} background={RANK_COLORS[before]} color={before === 0 ? colors.text : colors.ink} />
            <ArrowRight size={22} color={colors.ink} />
            <Chip label={RANKS[after]} background={RANK_COLORS[after]} />
          </View>
        ) : null}
      </>
    )
  }
  if (view.phase === 'fout') {
    return (
      <>
        <View style={{ transform: [{ rotate: '-4deg' }], marginTop: space.l }}>
          <Txt
            style={{ position: 'absolute', left: 5, top: 3, fontFamily: fonts.display, fontSize: 60, lineHeight: 62, textAlign: 'center' }}
            color={colors.cyan}>
            {view.headline}
          </Txt>
          <Txt style={{ fontFamily: fonts.display, fontSize: 60, lineHeight: 62, textAlign: 'center' }} color={colors.ink}>
            {view.headline}
          </Txt>
        </View>
        <View style={[ui.row, s.wrap, { alignItems: 'baseline', gap: space.l, marginTop: space.m }]}>
          <Txt style={{ fontFamily: fonts.display, fontSize: 30 }} color={colors.ink}>
            {sum.a}×{sum.b} =
          </Txt>
          {view.given !== null ? (
            <Txt style={{ fontFamily: fonts.display, fontSize: 40, textDecorationLine: 'line-through', opacity: 0.55 }} color={colors.ink}>
              {view.given}
            </Txt>
          ) : null}
          <Txt style={{ fontFamily: fonts.display, fontSize: fit(76, String(ans), 3), letterSpacing: -3 }} color={colors.ink}>
            {ans}
          </Txt>
        </View>
      </>
    )
  }
  if (view.phase === 'telaat') {
    return (
      <>
        <Txt style={{ fontFamily: fonts.display, fontSize: 42, marginTop: space.xl }}>{view.headline}</Txt>
        <View style={[ui.row, s.wrap, { alignItems: 'baseline', gap: space.m }]}>
          <Txt style={{ fontFamily: fonts.display, fontSize: 30 }} color={colors.muted}>
            {sum.a}×{sum.b} =
          </Txt>
          <Txt style={{ fontFamily: fonts.display, fontSize: fit(72, String(ans), 3), letterSpacing: -2 }} color={colors.cyan}>
            {ans}
          </Txt>
        </View>
      </>
    )
  }
  const asking = view.phase === 'luisteren'
  return (
    <View style={[ui.row, { gap: space.m }]}>
      <Txt style={{ fontFamily: fonts.display, fontSize: asking ? fit(72, `${label} =`, 5) : fit(96, label, 6), letterSpacing: -3 }} color={fg}>
        {label}
        {asking ? ' =' : ''}
      </Txt>
      {asking ? (
        <View style={s.questionBox}>
          <Txt style={{ fontFamily: fonts.display, fontSize: 48 }} color={colors.muted}>
            ?
          </Txt>
        </View>
      ) : null}
    </View>
  )
}

function Bottom({
  view,
  accent,
  fg,
  onAnswer,
}: {
  view: View_
  accent: string
  fg: string
  onAnswer: (n: number) => void
}) {
  const [typed, setTyped] = useState('')
  const asking = view.phase === 'luisteren' || view.phase === 'nazeggen'
  const choosing = view.input === 'kiezen' && view.phase === 'luisteren'

  // Physical keyboard: 1 to 9 pick a button (only does something in the browser).
  useKeys(
    choosing
      ? (key) => {
          const n = choiceForKey(key, view.choices)
          if (n === null) return false
          onAnswer(n)
          return true
        }
      : null,
  )

  if (choosing) {
    return (
      <View style={s.choices}>
        {view.choices.map((n, i) => (
          <Pressable
            key={n}
            accessibilityRole="button"
            accessibilityLabel={String(n)}
            onPress={() => onAnswer(n)}
            style={({ pressed }) => [s.choice, pressed && { backgroundColor: colors.lime, borderColor: colors.lime }]}>
            {({ pressed }) => (
              <>
                {KEY_HINTS ? (
                  <Txt variant="small" color={pressed ? colors.ink : colors.muted} style={s.choiceKey}>
                    {i + 1}
                  </Txt>
                ) : null}
                <Txt style={{ fontFamily: fonts.display, fontSize: fit(28, String(n), 4) }} color={pressed ? colors.ink : colors.text}>
                  {n}
                </Txt>
              </>
            )}
          </Pressable>
        ))}
      </View>
    )
  }

  if (view.input === 'typen' && asking) {
    const submit = () => {
      const n = parseInt(typed, 10)
      // An empty field is not an answer; keep waiting.
      if (Number.isNaN(n)) return
      setTyped('')
      onAnswer(n)
    }
    return (
      <View style={[ui.row, { gap: space.s }]}>
        <TextInput
          autoFocus
          value={typed}
          onChangeText={(t) => setTyped(t.replace(/[^0-9]/g, '').slice(0, 5))}
          onSubmitEditing={submit}
          keyboardType="number-pad"
          returnKeyType="done"
          submitBehavior="submit"
          accessibilityLabel="Jouw antwoord"
          placeholder="Antwoord"
          placeholderTextColor={colors.muted}
          style={s.input}
        />
        <Button label="OK" onPress={submit} style={{ minWidth: 80 }} />
      </View>
    )
  }

  if (view.input === 'praten' && asking) {
    return (
      <View style={{ alignItems: 'center', gap: space.s }}>
        <View style={ui.row}>
          <View style={[s.mic, { backgroundColor: accent }]}>
            <Mic size={30} color={colors.ink} />
          </View>
          <Txt variant="bodyBold">
            {view.talking ? 'Ik hoor je...' : view.phase === 'nazeggen' ? 'Zeg het na...' : 'Luistert...'}
          </Txt>
        </View>
      </View>
    )
  }

  if (view.input === 'praten' && (view.phase === 'spreken' || view.phase === 'start')) {
    return (
      <View style={{ alignItems: 'center', gap: space.s }}>
        <Volume2 size={36} color={fg} />
        <Txt variant="label" color={colors.muted}>
          Voorlezen... mic nog uit
        </Txt>
      </View>
    )
  }

  return <View style={{ height: 60 }} />
}

const s = StyleSheet.create({
  wrap: { flexWrap: 'wrap', justifyContent: 'center' },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s },
  choice: {
    width: '31%',
    flexGrow: 1,
    minHeight: 58,
    borderRadius: radius.m,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** The keyboard shortcut, small in the corner (browser only). */
  choiceKey: { position: 'absolute', top: 6, left: 10, fontSize: 12, lineHeight: 14 },
  lines: { flex: 1, justifyContent: 'flex-end', gap: 10, overflow: 'hidden' },
  segments: { flex: 1, flexDirection: 'row', gap: 4 },
  segment: { flex: 1, height: 8, borderRadius: 4 },
  timerTrack: { flex: 1, height: 14, borderRadius: radius.pill, backgroundColor: colors.line, overflow: 'hidden' },
  timerFill: { height: '100%', borderRadius: radius.pill },
  questionBox: {
    width: 84,
    height: 84,
    borderRadius: 20,
    borderWidth: 3,
    borderStyle: 'dashed',
    borderColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mic: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  input: {
    flex: 1,
    // Without this a browser keeps the field at its default width and pushes OK off screen.
    minWidth: 0,
    minHeight: 56,
    borderRadius: radius.m,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: 24,
    paddingHorizontal: space.l,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(16,16,24,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.l,
    padding: 32,
  },
})
