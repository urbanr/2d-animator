import XCTest

final class PrototypeUITests: XCTestCase {
    func testSelectionCountAndPlayback() {
        let app = XCUIApplication()
        app.launch()
        XCUIDevice.shared.orientation = .landscapeLeft
        XCTAssertTrue(app.buttons["settingsButton"].waitForExistence(timeout: 15))
        app.buttons["settingsButton"].tap()
        XCTAssertTrue(app.navigationBars["Zkušební běh"].waitForExistence(timeout: 5))
        let stepper = app.steppers["enemyCount"]
        XCTAssertTrue(stepper.exists)
        stepper.buttons.element(boundBy: 1).tap()
        let settings = XCTAttachment(screenshot: app.screenshot())
        settings.name = "Výběr mapy, nepřítele a počtu"; settings.lifetime = .keepAlways; add(settings)
        app.buttons["Hotovo"].tap()
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "× 9")).firstMatch.waitForExistence(timeout: 5))
        app.buttons["Pozastavit"].tap()
        XCTAssertTrue(app.buttons["Pokračovat"].exists)
        app.buttons["Pokračovat"].tap()
        app.buttons["Spustit znovu"].tap()
        let scene = XCTAttachment(screenshot: app.screenshot())
        scene.name = "Běh po uložené lince"; scene.lifetime = .keepAlways; add(scene)
    }
}
