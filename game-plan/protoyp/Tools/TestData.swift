import Foundation
import ImageIO

@main
struct VerifyPrototype {
    static func main() throws {
        let root = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().appendingPathComponent("GameData")
        let data = try JSONDecoder().decode(PrototypeData.self, from: Data(contentsOf: root.appendingPathComponent("catalog.json")))
        precondition(!data.maps.isEmpty && !data.enemies.isEmpty)
        precondition(Set(data.maps.map(\.id)).count == data.maps.count)
        precondition(Set(data.enemies.map(\.id)).count == data.enemies.count)
        func imageSize(_ path: String) -> (Int, Int) {
            let source = CGImageSourceCreateWithURL(root.appendingPathComponent(path) as CFURL, nil)!
            let image = CGImageSourceCreateImageAtIndex(source, 0, nil)!
            return (image.width, image.height)
        }
        for map in data.maps {
            precondition((0...1).contains(map.walkY))
            let size = imageSize(map.image)
            precondition(Double(size.0) == map.width && Double(size.1) == map.height)
        }
        for enemy in data.enemies {
            precondition(enemy.frames.count == 8 && enemy.gameHeight > 0)
            precondition(Set(enemy.frames.map(\.image)).count == 8)
            for frame in enemy.frames { _ = imageSize(frame.image) }
        }
        precondition(PrototypeGeometry.groundY(bottom: 10, height: 200, normalizedTop: 0.75) == 60)
        precondition(PrototypeGeometry.wrap(110, length: 100) == 10)
        precondition(PrototypeGeometry.wrap(-10, length: 100) == 90)
        print("PASS: \(data.maps.count) maps, \(data.enemies.count) eight-frame animations, all PNGs, baselines and looping geometry.")
    }
}
