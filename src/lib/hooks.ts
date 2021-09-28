import { After, BeforeAll, AfterAll, setDefaultTimeout, Status } from 'cucumber'
import { existsSync, unlinkSync, writeFileSync } from 'fs'
import { testControllerHolder } from './test-controller-holder'
import { browser } from './world'
import { ClientFunction } from 'testcafe'

// tslint:disable-next-line
const testCafe = require('testcafe')

let attachScreenshotToReport = null
let cafeRunner = null

const TIMEOUT = +process.env.CUCUMBER_TIMEOUT || 10000
const RUNNER_FILE = `${process.env.CUCUMBER_CWD}/test/runner.js`

function createTestFile() {
  writeFileSync(
    RUNNER_FILE,
    `import { testControllerHolder } from "cucumber-testcafe";\n` +
      `fixture("Cucumber acceptance test")\n` +
      `test("Test suite", testControllerHolder.capture)`
  )
}

function runTest(browser) {
  let runner

  return testCafe('localhost').then(function (tc: any) {
    cafeRunner = tc
    runner = tc.createRunner()

    return runner
      .src(RUNNER_FILE)
      .screenshots({
        path: `${process.env.CUCUMBER_REPORTS}/screenshots/`,
        takeOnFails: true,
      })
      .browsers(browser || 'chrome')
      .run({
        skipJsErrors: true,
        selectorTimeout: TIMEOUT / 2,
        assertionTimeout: TIMEOUT * 0.9,
      })
  })
}

setDefaultTimeout(TIMEOUT)

async function setVaultToken() {
  const Vault = require('hashi-vault-js')
  const vaultConfig = require('../../../../configs/vaultConfig').default
  const vault = new Vault(vaultConfig)
  // Only request new vault token if not already retrieved or older than 4 hours
  if (
    !process.env.VAULT_TOKEN ||
    (process.env.VAULT_TOKEN &&
      new Date().getTime() / 1000 -
        parseInt(process.env.TOKEN_LAST_RETRIEVED) >=
        14400)
  ) {
    let attempts = 0
    //Give user 3 attempts to successfully get Vault Token
    while (attempts < 3) {
      try {
        const readlineSync = require('readline-sync')
        const userName = readlineSync.question('Enter LDAP username: ')
        const passwd = readlineSync.question('Enter LDAP password: ')
        const token = await vault.loginWithLdap(userName, passwd)
        process.env.VAULT_TOKEN = token.client_token
        process.env.TOKEN_LAST_RETRIEVED = `${new Date().getTime() / 1000}`
        break
      } catch (e) {
        console.log('Invalid credentials')
        attempts++
      }
    }
  }
}

BeforeAll(async function () {
  createTestFile()
  await setVaultToken()
  runTest(process.env.CUCUMBER_BROWSER || this.parameters.browser)
  return testControllerHolder.get().then((t) => t.maximizeWindow())
})

export function resetBrowser(t) {
  return ClientFunction(() => {
    localStorage.clear()
    sessionStorage.clear()
    return document.cookie.split(';').forEach(function (c) {
      document.cookie = c
        .replace(/^ +/, '')
        .replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/')
    })
  }).with({ boundTestRun: t })()
}

After(async function (testCase) {
  const world = this
  if (testCase.result.status === Status.FAILED) {
    attachScreenshotToReport = world.attachScreenshotToReport
    await addErrorToController(browser)
    await ifErrorTakeScreenshot(browser)
  }

  return testControllerHolder.get().then(resetBrowser)
})

AfterAll(async function () {
  if (existsSync(RUNNER_FILE)) unlinkSync(RUNNER_FILE)
  await testControllerHolder.free()
  return cafeRunner.close()
})

const getAttachScreenshotToReport = (path) => {
  return attachScreenshotToReport(path)
}

const addErrorToController = async (resolvedTestController) => {
  return resolvedTestController.executionChain.catch((result) => {
    const errAdapter =
      new testCafe.embeddingUtils.TestRunErrorFormattableAdapter(result, {
        testRunPhase: resolvedTestController.testRun.phase,
        userAgent:
          resolvedTestController.testRun.browserConnection.browserInfo
            .userAgent,
      })
    return resolvedTestController.testRun.errs.push(errAdapter)
  })
}

const ifErrorTakeScreenshot = async (resolvedTestController) => {
  if (resolvedTestController.testRun.opts.screenshots.takeOnFails) {
    resolvedTestController.executionChain._state = 'fulfilled'
    return resolvedTestController.takeScreenshot().then((path) => {
      return getAttachScreenshotToReport(path)
    })
  } else {
    return resolvedTestController.takeScreenshot()
  }
}
