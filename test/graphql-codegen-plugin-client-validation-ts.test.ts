import { DummyClass } from '../src/graphql-codegen-plugin-client-validation-ts';

/**
 * Dummy test
 */

describe('Dummy test', (): void => {
  it('works if true is truthy', (): void => {
    expect(true).toBeTruthy();
  });

  it('DummyClass is instantiable', (): void => {
    expect(new DummyClass()).toBeInstanceOf(DummyClass);
  });
});
