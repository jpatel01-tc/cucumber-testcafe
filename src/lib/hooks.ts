import { After, BeforeAll, AfterAll, setDefaultTimeout, Status } from '@cucumber/cucumber'
import { existsSync, unlinkSync, writeFileSync } from 'fs'
import { testControllerHolder } from './test-controller-holder'
import { browser } from './world'
import { ClientFunction } from 'testcafe'
import { RESOLUTIONS} from '../../../../shared/configs/resolutionsEnum.js'
// tslint:disable-next-line
const testCafe = require('testcafe')

let attachScreenshotToReport = null
let cafeRunner = null

const TIMEOUT = +process.env.CUCUMBER_TIMEOUT || 30000
const RUNNER_FILE = `${process.env.CUCUMBER_CWD}/test/${process.env.CUCUMBER_SLAVE_ID}_runner.js`

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

  return testCafe('localhost').then(function(tc: any) {
    cafeRunner = tc
    runner = cafeRunner.createRunner()

    return runner
      .src(RUNNER_FILE)
      .screenshots({
        path: `${process.env.CUCUMBER_REPORTS}/screenshots/`,
        takeOnFails: true
      })
      .browsers(browser || 'chrome')
      .run({
        skipJsErrors: true,
        selectorTimeout: TIMEOUT / 2,
        assertionTimeout: TIMEOUT * 0.9
      })
  })
}

setDefaultTimeout(60000)

BeforeAll(async function() {
  createTestFile()
  runTest(process.env.CUCUMBER_BROWSER || this.parameters.browser)
  const testController =  await testControllerHolder.get()
  if (process.env.RESOLUTION != 'undefined'){
    const {height,width} = JSON.parse(RESOLUTIONS[process.env.RESOLUTION])
    return testController.resizeWindow(height,width)
  }
  if (process.env.CUCUMBER_BROWSER.includes(':headless')) return testController
  return testController.maximizeWindow()
})

export function resetBrowser(t) {
  return ClientFunction(() => {
    localStorage.clear()
    sessionStorage.clear()
    return document.cookie.split(';').forEach(function(c) {
      document.cookie = c
        .replace(/^ +/, '')
        .replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/')
    })
  }).with({ boundTestRun: t })()
}

After(async function(testCase) {
  const world = this
  if (testCase.result.status === Status.FAILED) {
  attachScreenshotToReport = world.attachScreenshotToReport
    await addErrorToController(browser)
    await ifErrorTakeScreenshot(browser)
  }

  return testControllerHolder.get().then(resetBrowser)
})

AfterAll(async function() {
  if (existsSync(RUNNER_FILE)) unlinkSync(RUNNER_FILE)
  await testControllerHolder.free()
  return cafeRunner.close()
})

const getAttachScreenshotToReport = path => {
  return attachScreenshotToReport(path)
}

const addErrorToController = async resolvedTestController => {
  return resolvedTestController.executionChain.catch(result => {
    const errAdapter = new testCafe.embeddingUtils.TestRunErrorFormattableAdapter(
      result,
      {
        testRunPhase: resolvedTestController.testRun.phase,
        userAgent:
          resolvedTestController.testRun.browserConnection.browserInfo.userAgent
      }
    )
    return resolvedTestController.testRun.errs.push(errAdapter)
  })
}

const ifErrorTakeScreenshot = async resolvedTestController => {
  if (resolvedTestController.testRun.opts.screenshots.takeOnFails) {
    resolvedTestController.executionChain._state = 'fulfilled'
    return resolvedTestController.takeScreenshot().then(path => {
      return getAttachScreenshotToReport(path)
    })
  } else {
    return resolvedTestController.takeScreenshot()
  }
}
