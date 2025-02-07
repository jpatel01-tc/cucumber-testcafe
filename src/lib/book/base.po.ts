/* global window */
/* eslint-disable class-methods-use-this */
// TODO: remove xpath-to-css selector
import { xPathToCss } from '../xpath-to-css'
import { testControllerHolder } from '../test-controller-holder'
import { browser } from '../world'
import { Selector, ClientFunction } from '../testcafe-helpers'
import { resetBrowser } from '../hooks'

const querystring = require('querystring')

interface NavigateParams {
  baseURL?: string
  path?: string
  qParams?: {
    [key: string]: string
  }
}
export default class BasePO {
  navigate(
    params: NavigateParams = {
      baseURL: testControllerHolder.baseURL,
      path: '/',
      qParams: {}
    }
  ) {
    const url = `${
      params.baseURL === undefined
        ? testControllerHolder.baseURL
        : params.baseURL
    }${params.path}?${querystring.stringify(params.qParams)}`

    return browser.navigateTo(url)
  }

  goBack() {
    // TODO: ClientFunction as factory with browser binded
    return ClientFunction(() => window.history.back())()
  }

  select(selector, options = null) {
    return Selector(selector, options)
  }

  // TODO: remove this function
  selectByXpath(xpath) {
    return Selector(xPathToCss(xpath))
  }

  selectByDataHook(selector) {
    return Selector(`[data-hook="${selector}"]`)
  }

  selectByDataHooks(selectors) {
    return Selector(
      selectors.map(selector => `[data-hook="${selector}"]`).join(' ')
    )
  }

  selectByStartWithDataHook(selector) {
    return Selector(`[data-hook^="${selector}"]`)
  }

  scroll(x, y) {
    return ClientFunction((xnum, ynum) => window.scrollBy(xnum, ynum))(x, y)
  }

  getUrl() {
    return ClientFunction(() => window.location.href)() as Promise<string>
  }

  async setResolutionSize(val1, val2) {
    return browser.resizeWindow(val1, val2)
  }

  async refreshPage() {
    const url = await this.getUrl()
    return browser.navigateTo(url)
  }

  isPresentText(text, dataHookContext?) {
    const properties = ['a', 'p', 'div', 'li', 'span', 'h1', 'h2', 'h3', 'h4']

    return dataHookContext
      ? browser
          .expect(
            this.selectByDataHook(dataHookContext)
              .find(properties.join(','))
              .withText(text).exists
          )
          .ok()
      : browser
          .expect(this.select(properties.join(',')).withText(text).exists)
          .ok()
  }

  isPresentByDataHook(dataHook) {
    return browser.expect(this.selectByDataHook(dataHook).exists).ok()
  }

  isNotPresentByDataHook(dataHook) {
    return browser.expect(this.selectByDataHook(dataHook).exists).notOk()
  }

  isPresentBySelector(selector) {
    return browser.expect(this.select(selector).exists).ok()
  }

  isNotPresentBySelector(selector) {
    return browser.expect(this.select(selector).exists).notOk()
  }

  clickByDataHook(dataHook) {
    return browser.click(this.selectByDataHook(dataHook))
  }

  clickBySelector(selector, index = 0) {
    return browser.click(this.select(selector).nth(index))
  }

  clickByText(text) {
    return browser.click(
      this.select('a, p, li, span, button, em').withText(text)
    )
  }

  clickByNameValue(type, name, value) {
    return browser.click(
      this.select(`[type=${type}][name=${name}][value="${value}"]`)
    )
  }

  clickByNameIndex(type, name, index) {
    return browser.click(
      this.select(`[type=${type}][name=${name}]`).nth(index)
    )
  }

  async isFieldWithValue(fieldName, value) {
    return browser
      .expect(await this.select(`input[name*="${fieldName}"]`).value)
      .eql(value)
  }

  setFieldValueByName(fieldName, text) {
    return browser.typeText(
      this.select(`input[name*="${fieldName}"]`),
      text,
      {
        replace: true
      }
    )
  }

  setFieldValueBySelector(selector, text) {
    return browser.typeText(this.select(selector), text, {
      replace: true
    })
  }

  isDisabledHook(hook) {
    return browser
      .expect(this.selectByDataHook(hook).hasAttribute('disabled'))
      .ok()
  }

  isEnabledHook(hook) {
    return browser
      .expect(this.selectByDataHook(hook).hasAttribute('disabled'))
      .notOk()
  }

  pressTab() {
    return browser.pressKey('tab')
  }

  resetBrowser() {
    return resetBrowser(browser)
  }

  wait(time = 500) {
    return browser.wait(time)
  }

  debug() {
    return browser.debug()
  }
}
