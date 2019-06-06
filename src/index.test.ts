import gql from 'graphql-tag';
import { DocumentNode } from 'graphql';
import * as fs from 'fs';
import * as path from 'path';
import { createSchema, plugin } from '.';

const tmpDir = path.resolve(__dirname, '../tmp/');

describe('plugin', (): void => {
  beforeAll((): void => {
    try {
      fs.mkdirSync(tmpDir);
      // eslint-disable-next-line no-empty
    } catch (e) {}
  });

  describe('createSchema', (): void => {
    it('creates a schema with a basic query', (): void => {
      const input: DocumentNode = gql`
        query getBlog @validate(not: { type: "null" }) {
          blog @validate(not: { type: "null" }) {
            title @validate(maxLength: 20),
          }
        }
      `;
      const definitionNode = input.definitions[0];
      const expected = {
        not: {
          type: 'null',
        },
        properties: {
          blog: {
            not: {
              type: 'null',
            },
            properties: {
              title: {
                maxLength: 20,
              },
            },
          },
        },
      };
      const actual = createSchema(definitionNode, []);
      expect(actual).toEqual(expected);
    });
  });

  it('creates a validation function for a basic query', (): void => {
    const input: DocumentNode = gql`
      query items @validate(not: { type: "null" }) {
        blog @validate(not: { type: "null" }) {
          title @validate(maxLength: 20),
        }
      }
    `;
    const validResult = {
      blog: {
        title: 'example title',
      },
    };
    const generatedCode = plugin(null, [{ filePath: '', content: input }]);
    fs.writeFileSync(`${tmpDir}/generated.ts`, generatedCode);
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
    const { validator } = require('../tmp/generated.ts');
    const [actual] = validator.items.validate(validResult);
    expect(!!actual).toEqual(true);
  });
});
