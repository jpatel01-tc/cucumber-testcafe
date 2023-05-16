"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.browser = void 0;
const tslib_1 = require("tslib");
const cucumber_1 = require("@cucumber/cucumber");
const test_controller_holder_1 = require("./test-controller-holder");
const allure_cucumberjs_1 = require("allure-cucumberjs");
const fs_1 = tslib_1.__importDefault(require("fs"));
let { RPWorld } = require('@reportportal/agent-js-cucumber');
let browser = null;
exports.browser = browser;
class CustomWorld extends allure_cucumberjs_1.CucumberAllureWorld {
    constructor(attach, parameters) {
        super(attach);
        this.waitForTestController = test_controller_holder_1.testControllerHolder
            .get()
            .then((tc) => {
            exports.browser = browser = tc;
            return tc;
        });
        this.attachScreenshotToReport = (pathToScreenshot) => {
            const img = fs_1.default.readFileSync(pathToScreenshot);
            return this.attach(img, 'image/png');
        };
        this.currPage = null;
        this.sharedData = {};
    }
}
(0, cucumber_1.setWorldConstructor)(CustomWorld);
//# sourceMappingURL=world.js.map