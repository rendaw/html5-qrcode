import globals from './globals.js'
import BitMatrix from './bitmatrix.js'
import PerspectiveTransform from './perspectivetransform.js'

const GridSampler = {}

GridSampler.checkAndNudgePoints = function (image, points) {
	let width = globals.width
	let height = globals.height
	// Check and nudge points from start until we see some that are OK:
	let nudged = true
	for (let offset = 0; offset < points.length && nudged; offset += 2) {
		let x = Math.floor (points[offset])
		let y = Math.floor(points[offset + 1])
		if (x < - 1 || x > width || y < - 1 || y > height) {
			throw new Error('AssertionError')
		}
		nudged = false
		if (x == - 1) {
			points[offset] = 0.0
			nudged = true
		} else if (x == width) {
			points[offset] = width - 1
			nudged = true
		}
		if (y == - 1) {
			points[offset + 1] = 0.0
			nudged = true
		} else if (y == height) {
			points[offset + 1] = height - 1
			nudged = true
		}
	}
	// Check and nudge points from end:
	nudged = true
	for (let offset = points.length - 2; offset >= 0 && nudged; offset -= 2) {
		let x = Math.floor(points[offset])
		let y = Math.floor(points[offset + 1])
		if (x < - 1 || x > width || y < - 1 || y > height) {
			throw new Error('AssertionError')
		}
		nudged = false
		if (x == - 1) {
			points[offset] = 0.0
			nudged = true
		} else if (x == width) {
			points[offset] = width - 1
			nudged = true
		}
		if (y == - 1) {
			points[offset + 1] = 0.0
			nudged = true
		} else if (y == height) {
			points[offset + 1] = height - 1
			nudged = true
		}
	}
}


GridSampler.sampleGrid3 = function (image, dimension, transform) {
	let bits = new BitMatrix(dimension)
	let points = new Array(dimension << 1)
	for (let y = 0; y < dimension; y++) {
		let max = points.length
		let iValue = y + 0.5
		for (let x = 0; x < max; x += 2) {
			points[x] = (x >> 1) + 0.5
			points[x + 1] = iValue
		}
		transform.transformPoints1(points)
		// Quick check to see if points transformed to something inside the image;
		// sufficient to check the endpoints
		GridSampler.checkAndNudgePoints(image, points)
		try {
			for (let x = 0; x < max; x += 2) {
				let bit = image[Math.floor(points[x]) + globals.width * Math.floor(points[x + 1])]
				if (bit)
					bits.set_Renamed(x >> 1, y)
			}
		} catch (aioobe) {
			// This feels wrong, but, sometimes if the finder patterns are misidentified, the resulting
			// transform gets "twisted" such that it maps a straight line of points to a set of points
			// whose endpoints are in bounds, but others are not. There is probably some mathematical
			// way to detect this about the transformation that I don't know yet.
			// This results in an ugly runtime exception despite our clever checks above -- can't have
			// that. We could check each point's coordinates but that feels duplicative. We settle for
			// catching and wrapping ArrayIndexOutOfBoundsException.
			// FIXME does js even throw aioobe? This translation looks broken
			throw new Error('AssertionError')
		}
	}
	return bits
}

GridSampler.sampleGridx = function (image, dimension, p1ToX, p1ToY, p2ToX, p2ToY, p3ToX, p3ToY, p4ToX, p4ToY, p1FromX, p1FromY, p2FromX, p2FromY, p3FromX, p3FromY, p4FromX, p4FromY) {
	let transform = PerspectiveTransform.quadrilateralToQuadrilateral(p1ToX, p1ToY, p2ToX, p2ToY, p3ToX, p3ToY, p4ToX, p4ToY, p1FromX, p1FromY, p2FromX, p2FromY, p3FromX, p3FromY, p4FromX, p4FromY)

	return GridSampler.sampleGrid3(image, dimension, transform)
}

export default GridSampler