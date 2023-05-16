import { base64Sync } from 'base64-img'
import { setWorldConstructor } from '@cucumber/cucumber'
import { testControllerHolder } from './test-controller-holder'
import { CucumberAllureWorld } from "allure-cucumberjs"
import fs from 'fs'
let { RPWorld } = require('@reportportal/agent-js-cucumber')
export interface TestControllerWithTestRun extends TestController {
  executionChain?: any
  testRun?: any
}
let browser: TestControllerWithTestRun = null
class CustomWorld extends CucumberAllureWorld {
  attach: any
  parameters: any
  currPage: any 
  sharedData: any
  constructor(attach, parameters) {
    super(attach)
    this.currPage = null 
    this.sharedData= {}
  }

  waitForTestController = testControllerHolder
    .get()
    .then((tc: TestController) => {
      browser = tc
      return tc
    })

  attachScreenshotToReport = (pathToScreenshot) => {
    const img = fs.readFileSync(pathToScreenshot)
    return this.attach(img, 'image/png')
  }
}

setWorldConstructor(CustomWorld)
export { browser }
