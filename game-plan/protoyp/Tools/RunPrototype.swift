import Foundation

// Run from any directory. Explicit target/team avoids installing to the wrong device.
let args = Array(CommandLine.arguments.dropFirst())
let root = URL(fileURLWithPath: #filePath).standardizedFileURL.deletingLastPathComponent().deletingLastPathComponent()
func option(_ key: String) -> String? {
    guard let index = args.firstIndex(of: key), index + 1 < args.count else { return nil }
    return args[index + 1]
}
func run(_ executable: String, _ arguments: [String]) throws {
    let process = Process()
    process.executableURL = URL(fileURLWithPath: executable)
    process.arguments = arguments
    process.currentDirectoryURL = root
    try process.run(); process.waitUntilExit()
    if process.terminationStatus != 0 { exit(process.terminationStatus) }
}
do {
    let simulator = option("--simulator")
    let device = option("--device")
    guard (simulator != nil) != (device != nil) else {
        fputs("Usage: swift Tools/RunPrototype.swift --simulator UUID\n   or: swift Tools/RunPrototype.swift --device UUID --team TEAM_ID\n", stderr); exit(1)
    }
    if device != nil && option("--team") == nil {
        fputs("Physical iPhone installation requires an explicit --team TEAM_ID from Xcode.\n", stderr); exit(1)
    }
    try run("/usr/bin/xcrun", ["swift", root.appendingPathComponent("Tools/ExportAssets.swift").path])
    var build = ["xcodebuild", "-quiet", "-project", "PrdelPrototype.xcodeproj", "-scheme", "PrdelPrototype", "-configuration", "Debug",
                 "-derivedDataPath", simulator != nil ? ".build" : ".build-device"]
    if let simulator {
        build += ["-sdk", "iphonesimulator", "-destination", "platform=iOS Simulator,id=\(simulator)", "CODE_SIGNING_ALLOWED=NO", "build"]
        try run("/usr/bin/xcrun", build)
        try run("/usr/bin/xcrun", ["simctl", "install", simulator, ".build/Build/Products/Debug-iphonesimulator/PrdelPrototype.app"])
        try run("/usr/bin/xcrun", ["simctl", "launch", simulator, "cz.urbanradovan.prdelsveta.prototype"])
    } else if let device, let team = option("--team") {
        build += ["-sdk", "iphoneos", "-destination", "generic/platform=iOS", "DEVELOPMENT_TEAM=\(team)", "-allowProvisioningUpdates", "build"]
        try run("/usr/bin/xcrun", build)
        try run("/usr/bin/xcrun", ["devicectl", "device", "install", "app", "--device", device, ".build-device/Build/Products/Debug-iphoneos/PrdelPrototype.app"])
        try run("/usr/bin/xcrun", ["devicectl", "device", "process", "launch", "--device", device, "cz.urbanradovan.prdelsveta.prototype"])
    }
} catch { fputs("\(error)\n", stderr); exit(1) }
