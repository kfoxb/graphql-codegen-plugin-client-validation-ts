### Usecase
This plugin is used where graphql data needs to have more fine grained validation than what Typescript can provide. E.g. it needs to be a string that matches a regex, or be of a certain length. It can also be used to make working with optional return values easier by converting types from something like string | null to just string after validation.

### Current state
Currently I'm in the initial design phase for figuring out how this will work, there's not much here currently and what is here won't have a stable api until I update this readme to say otherwise.

### The idea
My thinking is that a directive could be used to specify some arguments on how the data should be validated, largely the hardest parts of validation would be handled by a schema property that would essentially be a JSON schema then we can use ajv to run validation on this schema. Ideally, we should be able to run validation on nested properties easily, so we can, for example, filter out all invalid items in an array.

Potential example:
```graphql
query getBlog @validate(schema: { not: { type: "null" } }) {
  blog @validate(schema: { not: { type: "null" } }) {
    title @validate(schema: { maxLength: 20 }),
  }
}
```

```javascript
const validateGetBlog = {
  validate: () => {} // validate whole schema with ajv here
  blog: {
    validate: () => {} // validate blog and it's nested fields
    title: {
      validate: () => {} // validate title
    }
  },
}
```

