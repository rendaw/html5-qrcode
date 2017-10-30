import globals from './globals'
import GridSampler from './gridsampler'
import PerspectiveTransform from './perspectivetransform'
import Version from './version'
import AlignmentPatternFinder from './alignmentpatternfinder'
import FinderPatternFinder from './finderpatternfinder'

function DetectorResult (bits,  points) {
	this.bits = bits
	this.points = points
}

function Detector (image) {
	this.image = image
	this.resultPointCallback = null

	this.sizeOfBlackWhiteBlackRun = function (fromX,  fromY,  toX,  toY) {
		// Mild variant of Bresenham's algorithm;
		// see http://en.wikipedia.org/wiki/Bresenham's_line_algorithm
		let steep = Math.abs(toY - fromY) > Math.abs(toX - fromX)
		if (steep) {
			let temp = fromX
			fromX = fromY
			fromY = temp
			temp = toX
			toX = toY
			toY = temp
		}

		let dx = Math.abs(toX - fromX)
		let dy = Math.abs(toY - fromY)
		let error = - dx >> 1
		let ystep = fromY < toY ? 1 : - 1
		let xstep = fromX < toX ? 1 : - 1
		let state = 0 // In black pixels, looking for white, first or second time
		for (let x = fromX, y = fromY; x != toX; x += xstep) {

			let realX = steep ? y : x
			let realY = steep ? x : y
			if (state == 1) {
				// In white pixels, looking for black
				if (this.image[realX + realY * globals.width]) {
					state++
				}
			} else {
				if (!this.image[realX + realY * globals.width]) {
					state++
				}
			}

			if (state == 3) {
				// Found black, white, black, and stumbled back onto white; done
				let diffX = x - fromX
				let diffY = y - fromY
				return  Math.sqrt((diffX * diffX + diffY * diffY))
			}
			error += dy
			if (error > 0) {
				if (y == toY) {
					break
				}
				y += ystep
				error -= dx
			}
		}
		let diffX2 = toX - fromX
		let diffY2 = toY - fromY
		return  Math.sqrt((diffX2 * diffX2 + diffY2 * diffY2))
	}


	this.sizeOfBlackWhiteBlackRunBothWays = function (fromX,  fromY,  toX,  toY) {

		let result = this.sizeOfBlackWhiteBlackRun(fromX, fromY, toX, toY)

		// Now count other way -- don't run off image though of course
		let scale = 1.0
		let otherToX = fromX - (toX - fromX)
		if (otherToX < 0) {
			scale =  fromX /  (fromX - otherToX)
			otherToX = 0
		} else if (otherToX >= globals.width) {
			scale =  (globals.width - 1 - fromX) /  (otherToX - fromX)
			otherToX = globals.width - 1
		}
		let otherToY = Math.floor (fromY - (toY - fromY) * scale)

		scale = 1.0
		if (otherToY < 0) {
			scale =  fromY /  (fromY - otherToY)
			otherToY = 0
		} else if (otherToY >= globals.height) {
			scale =  (globals.height - 1 - fromY) /  (otherToY - fromY)
			otherToY = globals.height - 1
		}
		otherToX = Math.floor (fromX + (otherToX - fromX) * scale)

		result += this.sizeOfBlackWhiteBlackRun(fromX, fromY, otherToX, otherToY)
		return result - 1.0 // -1 because we counted the middle pixel twice
	}


	this.calculateModuleSizeOneWay = function (pattern,  otherPattern) {
		let moduleSizeEst1 = this.sizeOfBlackWhiteBlackRunBothWays(Math.floor(pattern.X), Math.floor(pattern.Y), Math.floor(otherPattern.X), Math.floor(otherPattern.Y))
		let moduleSizeEst2 = this.sizeOfBlackWhiteBlackRunBothWays(Math.floor(otherPattern.X), Math.floor(otherPattern.Y), Math.floor(pattern.X), Math.floor(pattern.Y))
		if (isNaN(moduleSizeEst1)) {
			return moduleSizeEst2 / 7.0
		}
		if (isNaN(moduleSizeEst2)) {
			return moduleSizeEst1 / 7.0
		}
		// Average them, and divide by 7 since we've counted the width of 3 black modules,
		// and 1 white and 1 black module on either side. Ergo, divide sum by 14.
		return (moduleSizeEst1 + moduleSizeEst2) / 14.0
	}


	this.calculateModuleSize = function (topLeft,  topRight,  bottomLeft) {
		// Take the average
		return (this.calculateModuleSizeOneWay(topLeft, topRight) + this.calculateModuleSizeOneWay(topLeft, bottomLeft)) / 2.0
	}

	this.distance = function (pattern1,  pattern2) {
		const xDiff = pattern1.X - pattern2.X
		const yDiff = pattern1.Y - pattern2.Y
		return  Math.sqrt((xDiff * xDiff + yDiff * yDiff))
	}
	this.computeDimension = function (topLeft,  topRight,  bottomLeft,  moduleSize) {

		let tltrCentersDimension = Math.round(this.distance(topLeft, topRight) / moduleSize)
		let tlblCentersDimension = Math.round(this.distance(topLeft, bottomLeft) / moduleSize)
		let dimension = ((tltrCentersDimension + tlblCentersDimension) >> 1) + 7
		switch (dimension & 0x03) {

		// mod 4
		case 0:
			dimension++
			break
			// 1? do nothing

		case 2:
			dimension--
			break

		case 3:
			throw 'Error'
		}
		return dimension
	}

	this.findAlignmentInRegion = function (overallEstModuleSize,  estAlignmentX,  estAlignmentY,  allowanceFactor) {
		// Look for an alignment pattern (3 modules in size) around where it
		// should be
		let allowance = Math.floor (allowanceFactor * overallEstModuleSize)
		let alignmentAreaLeftX = Math.max(0, estAlignmentX - allowance)
		let alignmentAreaRightX = Math.min(globals.width - 1, estAlignmentX + allowance)
		if (alignmentAreaRightX - alignmentAreaLeftX < overallEstModuleSize * 3) {
			throw 'Error'
		}

		let alignmentAreaTopY = Math.max(0, estAlignmentY - allowance)
		let alignmentAreaBottomY = Math.min(globals.height - 1, estAlignmentY + allowance)

		let alignmentFinder = new AlignmentPatternFinder(this.image, alignmentAreaLeftX, alignmentAreaTopY, alignmentAreaRightX - alignmentAreaLeftX, alignmentAreaBottomY - alignmentAreaTopY, overallEstModuleSize, this.resultPointCallback)
		return alignmentFinder.find()
	}

	this.createTransform = function (topLeft,  topRight,  bottomLeft, alignmentPattern, dimension) {
		let dimMinusThree =  dimension - 3.5
		let bottomRightX
		let bottomRightY
		let sourceBottomRightX
		let sourceBottomRightY
		if (alignmentPattern != null) {
			bottomRightX = alignmentPattern.X
			bottomRightY = alignmentPattern.Y
			sourceBottomRightX = sourceBottomRightY = dimMinusThree - 3.0
		} else {
			// Don't have an alignment pattern, just make up the bottom-right point
			bottomRightX = (topRight.X - topLeft.X) + bottomLeft.X
			bottomRightY = (topRight.Y - topLeft.Y) + bottomLeft.Y
			sourceBottomRightX = sourceBottomRightY = dimMinusThree
		}

		let transform = PerspectiveTransform.quadrilateralToQuadrilateral(3.5, 3.5, dimMinusThree, 3.5, sourceBottomRightX, sourceBottomRightY, 3.5, dimMinusThree, topLeft.X, topLeft.Y, topRight.X, topRight.Y, bottomRightX, bottomRightY, bottomLeft.X, bottomLeft.Y)

		return transform
	}

	this.sampleGrid = function (image,  transform,  dimension) {

		let sampler = GridSampler
		return sampler.sampleGrid3(image, dimension, transform)
	}

	this.processFinderPatternInfo = function (info) {

		let topLeft = info.TopLeft
		let topRight = info.TopRight
		let bottomLeft = info.BottomLeft

		let moduleSize = this.calculateModuleSize(topLeft, topRight, bottomLeft)
		if (moduleSize < 1.0) {
			throw 'Error'
		}
		let dimension = this.computeDimension(topLeft, topRight, bottomLeft, moduleSize)
		let provisionalVersion = Version.getProvisionalVersionForDimension(dimension)
		let modulesBetweenFPCenters = provisionalVersion.DimensionForVersion - 7

		let alignmentPattern = null
		// Anything above version 1 has an alignment pattern
		if (provisionalVersion.AlignmentPatternCenters.length > 0) {

			// Guess where a "bottom right" finder pattern would have been
			let bottomRightX = topRight.X - topLeft.X + bottomLeft.X
			let bottomRightY = topRight.Y - topLeft.Y + bottomLeft.Y

			// Estimate that alignment pattern is closer by 3 modules
			// from "bottom right" to known top left location
			let correctionToTopLeft = 1.0 - 3.0 /  modulesBetweenFPCenters
			let estAlignmentX = Math.floor (topLeft.X + correctionToTopLeft * (bottomRightX - topLeft.X))
			let estAlignmentY = Math.floor (topLeft.Y + correctionToTopLeft * (bottomRightY - topLeft.Y))

			// Kind of arbitrary -- expand search radius before giving up
			for (let i = 4; i <= 16; i <<= 1) {
				//try
				//{
				alignmentPattern = this.findAlignmentInRegion(moduleSize, estAlignmentX, estAlignmentY,  i)
				break
				//}
				//catch (re)
				//{
				// try next round
				//}
			}
			// If we didn't find alignment pattern... well try anyway without it
		}

		let transform = this.createTransform(topLeft, topRight, bottomLeft, alignmentPattern, dimension)

		let bits = this.sampleGrid(this.image, transform, dimension)

		let points
		if (alignmentPattern == null) {
			points = new Array(bottomLeft, topLeft, topRight)
		} else {
			points = new Array(bottomLeft, topLeft, topRight, alignmentPattern)
		}
		return new DetectorResult(bits, points)
	}


	this.detect = function () {
		let info =  new FinderPatternFinder().findFinderPattern(this.image)

		return this.processFinderPatternInfo(info)
	}
}

export default Detector