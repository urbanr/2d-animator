import Foundation

// Swift-only packer. Existing processed PNGs are copied byte-for-byte, never regenerated.
let fm = FileManager.default
let script = URL(fileURLWithPath: #filePath).standardizedFileURL
let prototype = script.deletingLastPathComponent().deletingLastPathComponent()
let plan = prototype.deletingLastPathComponent()
let destination = prototype.appendingPathComponent("GameData", isDirectory: true)
func readJSON(_ path: String) throws -> [String: Any] {
    guard let value = try JSONSerialization.jsonObject(with: Data(contentsOf: plan.appendingPathComponent(path))) as? [String: Any] else {
        throw NSError(domain: "Export", code: 1, userInfo: [NSLocalizedDescriptionKey: "Invalid JSON: \(path)"])
    }
    return value
}
func copyAsset(_ relative: String) throws -> String {
    let clean = relative.hasPrefix("../") ? String(relative.dropFirst(3)) : relative
    let source = plan.appendingPathComponent(clean).standardizedFileURL.resolvingSymlinksInPath()
    guard source.path.hasPrefix(plan.path + "/graphics/") else { throw CocoaError(.fileReadInvalidFileName) }
    let output = destination.appendingPathComponent(clean)
    try fm.createDirectory(at: output.deletingLastPathComponent(), withIntermediateDirectories: true)
    let data = try Data(contentsOf: source)
    try data.write(to: output, options: .atomic)
    return clean
}
do {
    let catalog = try readJSON("graphics/levely/levels.json")
    let levels = catalog["levels"] as! [String: [String: Any]]
    var maps: [[String: Any]] = []
    for slug in levels.keys.sorted() {
        let level = levels[slug]!
        let variants = level["variants"] as! [String: [String: Any]]
        for variantID in variants.keys.sorted() {
            let variant = variants[variantID]!
            let size = variant["master_size"] as! [Double]
            guard let line = variant["walk_line"] as? [String: Any], let y = line["y"] as? Double, (0...1).contains(y) else {
                throw NSError(domain: "Export", code: 2, userInfo: [NSLocalizedDescriptionKey: "Missing walking line: \(slug)/\(variantID)"])
            }
            maps.append(["id": "\(slug)/\(variantID)", "name": level["display_name"]!, "variant": variantID,
                "image": try copyAsset(variant["background_master"] as! String), "width": size[0], "height": size[1],
                "walkY": y, "reviewed": line["reviewed"] as? Bool ?? false])
        }
    }
    let gallery = try String(contentsOf: plan.appendingPathComponent("tool/sprite-variants.generated.js"), encoding: .utf8)
    let json = String(gallery.dropFirst("window.SPRITE_VARIANTS = ".count)).trimmingCharacters(in: .whitespacesAndNewlines).dropLast()
    let variants = try JSONSerialization.jsonObject(with: Data(json.utf8)) as! [[String: Any]]
    let alignment = try readJSON("graphics/bitmapove-sekvence/sprite-frame-offsets.json")["animations"] as! [String: [String: Any]]
    var enemies: [[String: Any]] = []
    for variant in variants where variant["group"] as? String != "rejected" {
        let key = variant["alignmentKey"] as! String
        let edit = alignment[key] ?? [:]
        let paths = variant["frames"] as! [String]
        let order = (edit["frame_order"] ?? variant["frameOrder"]) as! [Int]
        let offsets = (edit["frames"] ?? variant["frameOffsets"]) as! [[String: Double]]
        guard order.sorted() == Array(1...paths.count), offsets.count == paths.count else { throw CocoaError(.fileReadCorruptFile) }
        var frames: [[String: Any]] = []
        for (index, source) in order.enumerated() {
            frames.append(["image": try copyAsset(paths[source - 1]), "offsetX": offsets[index]["x"]!, "offsetY": offsets[index]["y"]!])
        }
        enemies.append(["id": key, "character": variant["character"]!, "name": variant["displayName"]!,
            "title": variant["title"]!, "variant": variant["variant"]!, "gameHeight": variant["gameHeight"]!, "frames": frames])
    }
    guard !maps.isEmpty, !enemies.isEmpty else { throw CocoaError(.fileReadCorruptFile) }
    let result: [String: Any] = ["maps": maps, "enemies": enemies]
    try JSONSerialization.data(withJSONObject: result, options: [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]).write(to: destination.appendingPathComponent("catalog.json"), options: .atomic)
    print("Exported \(maps.count) map variants and \(enemies.count) enemy animations to \(destination.path)")
} catch {
    fputs("Export failed: \(error)\n", stderr)
    exit(1)
}
