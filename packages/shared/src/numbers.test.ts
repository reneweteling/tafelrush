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
})

describe('dutchNumberWord', () => {
  it('gives the written form', () => {
    expect(dutchNumberWord(56)).toBe('zesenvijftig')
    expect(dutchNumberWord(1)).toBe('een')
    expect(dutchNumberWord(100)).toBe('honderd')
    expect(dutchNumberWord(52)).toBe('tweeënvijftig')
    expect(dutchNumberWord(43)).toBe('drieënveertig')
  })
})
