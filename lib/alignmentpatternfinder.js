import globals from './globals.js'

function AlignmentPattern (posX, posY,  estimatedModuleSize) {
	this.x = posX
	this.y = posY
	this.count = 1
	this.estimatedModuleSize = estimatedModuleSize

	this.__defineGetter__('EstimatedModuleSize', function () {
		return this.estimatedModuleSize
	})
	this.__defineGetter__('Count', function () {
		return this.count
	})
	this.__defineGetter__('X', function () {
		return Math.floor(this.x)
	})
	this.__defineGetter__('Y', function () {
		return Math.floor(this.y)
	})
	this.incrementCount = function () {
		this.count++
	}
	this.aboutEquals = function (moduleSize,  i,  j) {
		if (Math.abs(i - this.y) <= moduleSize && Math.abs(j - this.x) <= moduleSize) {
			let moduleSizeDiff = Math.abs(moduleSize - this.estimatedModuleSize)
			return moduleSizeDiff <= 1.0 || moduleSizeDiff / this.estimatedModuleSize <= 1.0
		}
		return false
	}

}

function AlignmentPatternFinder (image,  startX,  startY,  width,  height,  moduleSize,  resultPointCallback) {
	this.image = image
	this.possibleCenters = new Array()
	this.startX = startX
	this.startY = startY
	this.width = width
	this.height = height
	this.moduleSize = moduleSize
	this.crossCheckStateCount = new Array(0, 0, 0)
	this.resultPointCallback = resultPointCallback

	this.centerFromEnd = function (stateCount,  end) {
		return  (end - stateCount[2]) - stateCount[1] / 2.0
	}
	this.foundPatternCross = function (stateCount) {
		let moduleSize = this.moduleSize
		let maxVariance = moduleSize / 2.0
		for (let i = 0; i < 3; i++) {
			if (Math.abs(moduleSize - stateCount[i]) >= maxVariance) {
				return false
			}
		}
		return true
	}

	this.crossCheckVertical = function (startI,  centerJ,  maxCount,  originalStateCountTotal) {
		let image = this.image

		let maxI = globals.height
		let stateCount = this.crossCheckStateCount
		stateCount[0] = 0
		stateCount[1] = 0
		stateCount[2] = 0

		// Start counting up from center
		let i = startI
		while (i >= 0 && image[centerJ + i * globals.width] && stateCount[1] <= maxCount) {
			stateCount[1]++
			i--
		}
		// If already too many modules in this state or ran off the edge:
		if (i < 0 || stateCount[1] > maxCount) {
			return NaN
		}
		while (i >= 0 && !image[centerJ + i * globals.width] && stateCount[0] <= maxCount) {
			stateCount[0]++
			i--
		}
		if (stateCount[0] > maxCount) {
			return NaN
		}

		// Now also count down from center
		i = startI + 1
		while (i < maxI && image[centerJ + i * globals.width] && stateCount[1] <= maxCount) {
			stateCount[1]++
			i++
		}
		if (i == maxI || stateCount[1] > maxCount) {
			return NaN
		}
		while (i < maxI && !image[centerJ + i * globals.width] && stateCount[2] <= maxCount) {
			stateCount[2]++
			i++
		}
		if (stateCount[2] > maxCount) {
			return NaN
		}

		let stateCountTotal = stateCount[0] + stateCount[1] + stateCount[2]
		if (5 * Math.abs(stateCountTotal - originalStateCountTotal) >= 2 * originalStateCountTotal) {
			return NaN
		}

		return this.foundPatternCross(stateCount) ? this.centerFromEnd(stateCount, i) : NaN
	}

	this.handlePossibleCenter = function (stateCount,  i,  j) {
		let stateCountTotal = stateCount[0] + stateCount[1] + stateCount[2]
		let centerJ = this.centerFromEnd(stateCount, j)
		let centerI = this.crossCheckVertical(i, Math.floor (centerJ), 2 * stateCount[1], stateCountTotal)
		if (!isNaN(centerI)) {
			let estimatedModuleSize = (stateCount[0] + stateCount[1] + stateCount[2]) / 3.0
			let max = this.possibleCenters.length
			for (let index = 0; index < max; index++) {
				let center =  this.possibleCenters[index]
				// Look for about the same center and module size:
				if (center.aboutEquals(estimatedModuleSize, centerI, centerJ)) {
					return new AlignmentPattern(centerJ, centerI, estimatedModuleSize)
				}
			}
			// Hadn't found this before; save it
			let point = new AlignmentPattern(centerJ, centerI, estimatedModuleSize)
			this.possibleCenters.push(point)
			if (this.resultPointCallback != null) {
				this.resultPointCallback.foundPossibleResultPoint(point)
			}
		}
		return null
	}

	this.find = function () {
		let startX = this.startX
		let height = this.height
		let maxJ = startX + width
		let middleI = startY + (height >> 1)
		// We are looking for black/white/black modules in 1:1:1 ratio;
		// this tracks the number of black/white/black modules seen so far
		let stateCount = new Array(0, 0, 0)
		for (let iGen = 0; iGen < height; iGen++) {
			// Search from middle outwards
			let i = middleI + ((iGen & 0x01) == 0 ? ((iGen + 1) >> 1) : - ((iGen + 1) >> 1))
			stateCount[0] = 0
			stateCount[1] = 0
			stateCount[2] = 0
			let j = startX
			// Burn off leading white pixels before anything else; if we start in the middle of
			// a white run, it doesn't make sense to count its length, since we don't know if the
			// white run continued to the left of the start point
			while (j < maxJ && !image[j + globals.width * i]) {
				j++
			}
			let currentState = 0
			while (j < maxJ) {
				if (image[j + i * globals.width]) {
					// Black pixel
					if (currentState == 1) {
						// Counting black pixels
						stateCount[currentState]++
					} else {
						// Counting white pixels
						if (currentState == 2) {
							// A winner?
							if (this.foundPatternCross(stateCount)) {
								// Yes
								var confirmed = this.handlePossibleCenter(stateCount, i, j)
								if (confirmed != null) {
									return confirmed
								}
							}
							stateCount[0] = stateCount[2]
							stateCount[1] = 1
							stateCount[2] = 0
							currentState = 1
						} else {
							stateCount[++currentState]++
						}
					}
				} else {
					// White pixel
					if (currentState == 1) {
						// Counting black pixels
						currentState++
					}
					stateCount[currentState]++
				}
				j++
			}
			if (this.foundPatternCross(stateCount)) {
				var confirmed = this.handlePossibleCenter(stateCount, i, maxJ)
				if (confirmed != null) {
					return confirmed
				}
			}
		}

		// Hmm, nothing we saw was observed and confirmed twice. If we had
		// any guess at all, return it.
		if (!(this.possibleCenters.length == 0)) {
			return  this.possibleCenters[0]
		}

		throw 'Couldn\'t find enough alignment patterns'
	}

}

export default AlignmentPatternFinder