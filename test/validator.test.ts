import { describe, expect, it } from 'vitest'
import { validate } from '../src/validator'

describe('Validator', () => {
  it('should validate simple types', async () => {
    // @ts-expect-error
    expect(validate('')).toBe(false)
    expect(validate(1, 'number')).toBe(true)
    expect(validate(1, 'string')).toBe(false)
    expect(validate('a', 'string')).toBe(true)
    expect(validate('a', {})).toBe(false)
    expect(validate(undefined, 'string')).toBe(false)
    expect(validate(undefined, 'string?')).toBe(true)
    expect(validate(true, 'boolean')).toBe(true)
    expect(validate(false, 'boolean')).toBe(true)
  })
  it('should validate special types', async () => {
    expect(validate(null, 'null')).toBe(true)
    expect(validate(undefined, 'null')).toBe(false)
    expect(validate(undefined, 'null?')).toBe(true)
    expect(validate([], 'array')).toBe(true)
    expect(validate(undefined, 'array')).toBe(false)
    expect(validate(undefined, 'array?')).toBe(true)
  })
  it('should validate object type', async () => {
    // @ts-expect-error
    expect(validate({ a: 1 })).toBe(false)
    expect(validate({ a: 1 }, 'string')).toBe(false)
    expect(validate({}, {})).toBe(true)
    expect(validate({ a: 1 }, { a: 'number' })).toBe(true)
    expect(validate({ a: undefined }, { a: 'number?' })).toBe(true)
    expect(validate({ a: undefined }, { a: { __optional: true } })).toBe(true)
    expect(validate({ a: 1 }, { a: 'string' })).toBe(false)
    expect(validate({}, { a: 'string?' })).toBe(true)
    expect(validate({ a: 1, b: 'b' }, { a: 'number', b: 'string' })).toBe(true)
    expect(validate({ a: 1, b: 'b', c: { d: true, e: [], f: null } }, { a: 'number', b: 'string', c: { d: 'boolean', e: 'array', f: 'null' } })).toBe(true)
    expect(validate({ a: 1, b: 'b', c: { d: 4, e: [], f: null } }, { a: 'number', b: 'string', c: { d: 'boolean', e: 'array', f: 'null' } })).toBe(false)
    expect(validate({ c: { d: undefined, e: [], f: undefined } }, { c: { d: 'boolean?', e: 'array', f: 'null?' } })).toBe(true)
    expect(validate({ c: undefined }, { c: { d: 'boolean', e: 'array', f: 'null', __optional: true } })).toBe(true)
    expect(validate({ c: null }, { c: { d: 'boolean', e: 'array', f: 'null' } })).toBe(false)
    expect(validate(null, { c: { d: 'boolean', e: 'array', f: 'null', __optional: true } })).toBe(false)
  })
  it('should set a custom optional key for objects', async () => {
    expect(validate(undefined, { optional: true }, 'optional')).toBe(true)
    expect(validate({}, { optional: true }, 'optional')).toBe(true)
    expect(validate({ a: undefined }, { a: { optional: true } }, 'optional')).toBe(true)
    // @ts-expect-error
    expect(validate({ a: undefined }, { a: { __optional: true } }, 1)).toBe(true)
  })
})
