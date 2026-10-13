import { describe, expect, it } from 'vitest'

import { dutchNumberWord, numberIsComplete, parseDutchNumber } from './numbers'

describe('parseDutchNumber', () => {
  it.each([
    ['56', 56],
    ['56.', 56],
    ['zesenvijftig', 56],
    ['Zes en vijftig', 56],
    ['tweeënvijftig', 52],
    ['drieënveertig', 43],
    ['eh is het zesenvijftig', 56],
    ['zeven keer acht is zesenvijftig', 56],
    ['één', 1],
    ['tien', 10],
    ['elf', 11],
    ['achttien', 18],
    ['honderd', 100],
    ['negentig', 90],
    ['nul', 0],
    ['het is 42', 42],
  ])('%s -> %i', (text, expected) => {
    expect(parseDutchNumber(text)).toBe(expected)
  })

  it('returns null without a number', () => {
    expect(parseDutchNumber('weet ik niet')).toBeNull()
    expect(parseDutchNumber('')).toBeNull()
  })

  it('does not split a compound number into its unit', () => {
    expect(parseDutchNumber('vierenvijftig')).toBe(54)
  })

  it('reads digits mixed with words as one number', () => {
    expect(parseDutchNumber('6 en 50')).toBe(56)
    expect(parseDutchNumber('zes en 50')).toBe(56)
  })
})

describe('parseDutchNumber, big tables', () => {
  it.each([
    ['honderdvijfentwintig', 125],
    ['honderd vijfentwintig', 125],
    ['honderd en een', 101],
    ['honderdeen', 101],
    ['eenhonderd', 100],
    ['vierhonderdzevenenzestig', 467],
    ['vier honderd zeven en zestig', 467],
    ['duizend', 1000],
    ['duizend tweehonderd', 1200],
    ['tweeduizend', 2000],
    ['drieduizend vierhonderdzevenenzestig', 3467],
    ['drie duizend vier honderd zeven en zestig', 3467],
    ['tienduizend', 10000],
    ['twaalfduizend vijfhonderd', 12500],
    ['het is 3450', 3450],
    ['3.450', 3450],
    ['10 000', 10000],
  ])('%s -> %i', (text, expected) => {
    expect(parseDutchNumber(text)).toBe(expected)
  })

  it('does not glue two separate digit numbers', () => {
    expect(parseDutchNumber('7 x 8 = 56')).toBe(56)
    expect(parseDutchNumber('8 56')).toBe(56)
  })
})

describe('numberIsComplete', () => {
  it.each([
    ['zesenvijftig', true],
    ['56', true],
    ['zestien', true],
    ['tien', true],
    ['zes', false],
    ['6', false],
    ['zes en', false],
    ['zes en vijftig', true],
    ['', false],
    ['weet ik niet', false],
  ])('%s -> %s', (text, expected) => {
    expect(numberIsComplete(text)).toBe(expected)
  })

  it('takes a big right answer at once, but waits on a part of it', () => {
    expect(numberIsComplete('vierhonderdzevenenzestig', 467)).toBe(true)
    expect(numberIsComplete('vierhonderd', 467)).toBe(false)
    expect(numberIsComplete('zesenvijftig', 56)).toBe(true)
    expect(numberIsComplete('zes', 6)).toBe(true)
  })
})

describe('dutchNumberWord', () => {
  it('gives the written form', () => {
    expect(dutchNumberWord(56)).toBe('zesenvijftig')
    expect(dutchNumberWord(1)).toBe('een')
    expect(dutchNumberWord(100)).toBe('honderd')
    expect(dutchNumberWord(52)).toBe('tweeënvijftig')
    expect(dutchNumberWord(43)).toBe('drieënveertig')
  })

  it('writes big numbers the way they are said', () => {
    expect(dutchNumberWord(125)).toBe('honderdvijfentwintig')
    expect(dutchNumberWord(467)).toBe('vierhonderdzevenenzestig')
    expect(dutchNumberWord(252)).toBe('tweehonderdtweeënvijftig')
    expect(dutchNumberWord(1000)).toBe('duizend')
    expect(dutchNumberWord(3467)).toBe('drieduizend vierhonderdzevenenzestig')
    expect(dutchNumberWord(10000)).toBe('tienduizend')
  })

  it('reads back what it writes', () => {
    for (const n of [0, 7, 56, 100, 101, 125, 999, 1000, 1001, 2500, 7350, 9990, 10000, 12500]) {
      expect(parseDutchNumber(dutchNumberWord(n))).toBe(n)
    }
  })
})
