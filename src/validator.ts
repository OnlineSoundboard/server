type SchemaType = 'number' | 'string' | 'boolean' | 'null' | 'function' | 'array'
type OptionalSchemaType = `${SchemaType}?`

const DefaultOptionalKey = '__optional'

type SchemaResolvable = SchemaType | OptionalSchemaType | ({ [K: string]: boolean | SchemaResolvable } & { [DefaultOptionalKey]?: boolean })

function validate (value: any, schema: SchemaResolvable, optionalKey: string = DefaultOptionalKey): boolean {
  if (typeof optionalKey !== 'string' || optionalKey === '') optionalKey = DefaultOptionalKey
  if (schema == null) return false
  if (typeof schema === 'object') {
    if (value === undefined) return schema[optionalKey] === true
    if (value == null) return false
    if (typeof value !== 'object') return false
    return Object.entries(schema as Record<string, SchemaResolvable>).every(([k, v]) => k === optionalKey || validate(value[k], v, optionalKey))
  }
  if (schema.includes('?') && value == null) return true
  if (schema === 'null' && value === null) return true
  if (schema === 'array' && Array.isArray(value)) return true
  if (String(typeof value) !== schema.trim().replace(/\?/g, '')) return false
  return true
}

export { validate }
export default validate
