# Tests

**There are no tests yet 😢**

To test the features of this library, we need to develop mock version of pcsclite library to simulate cards. Feel free to contribute.

---

We are going to use [AVA: Futuristic JavaScript test runner](https://github.com/avajs/ava).  

It is fully set up, so you can already run tests with:

```bash
npm run test
```

It is a shortcut for `cross-env NODE_ENV=test ava test --verbose` which runs all the tests in the test folder _(except for helpers, fixtures folders as well as files prefixed with `_`)_.
