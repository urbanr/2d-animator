import SpriteKit
import UIKit

@MainActor
final class RunScene: SKScene {
    private let background = SKSpriteNode()
    private let baseline = SKShapeNode()
    private var actors: [SKSpriteNode] = []
    private var textures: [SKTexture] = []
    private var frameSizes: [CGSize] = []
    private var map: MapAsset?
    private var enemy: EnemyAsset?
    private var mapRect = CGRect.zero
    private var elapsed = 0.0
    private var previousTime: TimeInterval?
    private var travel = 0.0
    private var runSpeed = 80.0
    private var zoom = 1.0
    private var mirror = true
    private var showLine = true
    private let root: URL

    init(root: URL) {
        self.root = root
        super.init(size: CGSize(width: 844, height: 390))
        scaleMode = .resizeFill
        backgroundColor = .black
        background.zPosition = -10
        addChild(background)
        baseline.strokeColor = .yellow
        baseline.lineWidth = 1
        baseline.zPosition = 20
        addChild(baseline)
    }
    required init?(coder: NSCoder) { fatalError("init(coder:) not used") }

    private func loadImage(_ path: String) -> CGImage? {
        UIImage(contentsOfFile: root.appendingPathComponent(path).path)?.cgImage
    }
    func configure(map: MapAsset, enemy: EnemyAsset, count: Int, speed: Double, zoom: Double, mirror: Bool, showLine: Bool) {
        self.map = map; self.enemy = enemy; self.runSpeed = speed
        self.zoom = zoom; self.mirror = mirror; self.showLine = showLine
        elapsed = 0; travel = 0; previousTime = nil
        actors.forEach { $0.removeFromParent() }; actors.removeAll()
        textures.removeAll(); frameSizes.removeAll()
        if let image = loadImage(map.image) { background.texture = SKTexture(cgImage: image) }
        for frame in enemy.frames {
            guard let image = loadImage(frame.image) else { continue }
            let texture = SKTexture(cgImage: image)
            texture.filteringMode = .nearest
            textures.append(texture)
            frameSizes.append(CGSize(width: image.width, height: image.height))
        }
        guard textures.count == enemy.frames.count else { return }
        for _ in 0..<min(100, max(1, count)) {
            let node = SKSpriteNode(texture: textures.first)
            node.anchorPoint = CGPoint(x: 0.5, y: 0)
            node.zPosition = 1
            addChild(node); actors.append(node)
        }
        layoutMap()
        positionActors()
    }
    override func didChangeSize(_ oldSize: CGSize) { layoutMap(); positionActors() }
    private func layoutMap() {
        guard let map else { return }
        let scale = min(size.width / map.width, size.height / map.height)
        let width = map.width * scale, height = map.height * scale
        mapRect = CGRect(x: (size.width - width) / 2, y: (size.height - height) / 2, width: width, height: height)
        background.size = mapRect.size
        background.position = CGPoint(x: mapRect.midX, y: mapRect.midY)
        let y = PrototypeGeometry.groundY(bottom: mapRect.minY, height: height, normalizedTop: map.walkY)
        let path = CGMutablePath()
        path.move(to: CGPoint(x: mapRect.minX, y: y)); path.addLine(to: CGPoint(x: mapRect.maxX, y: y))
        baseline.path = path
        baseline.isHidden = !showLine
    }
    override func update(_ currentTime: TimeInterval) {
        let delta = min(0.1, max(0, currentTime - (previousTime ?? currentTime)))
        previousTime = currentTime
        elapsed += delta
        travel += delta * runSpeed
        positionActors()
    }
    private func positionActors() {
        guard let map, let enemy, !actors.isEmpty, !textures.isEmpty else { return }
        let ground = PrototypeGeometry.groundY(bottom: mapRect.minY, height: mapRect.height, normalizedTop: map.walkY)
        let widths: [Double] = frameSizes.map { enemy.gameHeight * zoom * Double($0.width) / Double($0.height) }
        let maxWidth: Double = widths.max() ?? 120.0
        let margin = maxWidth + 24
        let length = mapRect.width + 2 * margin
        for (index, actor) in actors.enumerated() {
            let phase = Double(index) / Double(actors.count)
            let frameIndex = (Int(elapsed * 12) + index) % textures.count
            let frame = enemy.frames[frameIndex]
            let pixels = frameSizes[frameIndex]
            let scale = enemy.gameHeight * zoom / pixels.height
            actor.texture = textures[frameIndex]
            actor.size = CGSize(width: pixels.width * scale, height: pixels.height * scale)
            actor.xScale = mirror ? -1 : 1
            let x = PrototypeGeometry.wrap(travel + phase * length, length: length) + mapRect.minX - margin
            // Gallery Y grows downward. Mirror X offsets with the left-facing source artwork.
            actor.position = CGPoint(x: x + frame.offsetX * scale * (mirror ? -1 : 1), y: ground - frame.offsetY * scale)
        }
    }
}
