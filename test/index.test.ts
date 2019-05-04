import gql from 'graphql-tag'
import { createSchema, plugin } from '../src'
import { DocumentNode } from 'graphql';

const fs = require('fs')
const path = require('path')

const tmpDir = path.resolve(__dirname, "../tmp/")

describe('plugin', () => {
  beforeAll(() => {
    try {
      fs.mkdirSync(tmpDir)
    } catch(e) {}
  })
  describe('createSchema', () => {
    it('creates a schema with a basic query', () => {
      const input: DocumentNode = gql`
        query getBlog @validate(not: { type: "null" }) {
          blog @validate(not: { type: "null" }) {
            title @validate(maxLength: 20),
          }
        }
      `
      const definitionNode = input.definitions[0]
      const expected = {
        not: {
          type: 'null'
        },
        properties: {
          blog: {
            not: {
              type: 'null'
            },
            properties: {
              title: {
                maxLength: 20
              }
            }
          }
        }
      }
      const actual = createSchema(definitionNode, [])
      expect(actual).toEqual(expected)
    })
  })

  it("creates a validation function for a basic query", () => {
    const input: DocumentNode = gql`
      query getBlog @validate(not: { type: "null" }) {
        blog @validate(not: { type: "null" }) {
          title @validate(maxLength: 20),
        }
      }
    `
    const validResult = {
      blog: {
        title: "example title"
      }
    }
    const generatedCode = plugin(null, [{ filePath: "", content: input }])
    fs.writeFileSync(tmpDir + "/generated.js", generatedCode)
    const {validateGetBlog} = require("../tmp/generated.js")
    const [actual] = validateGetBlog(validResult)
    expect(!!actual).toEqual(true)
  })
})
