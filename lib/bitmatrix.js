import URShift from './urshift.js'

function BitMatrix (width, height) {
	if (!height)
		height = width
	if (width < 1 || height < 1) {
		const e = new Error('AssertionError')
		e.message = 'Both dimensions must be greater than 0'
		throw e
	}
	this.width = width
	this.height = height
	let rowSize = width >> 5
	if ((width & 0x1f) != 0) {
		rowSize++
	}
	this.rowSize = rowSize
	this.bits = new Array(rowSize * height)
	for (let i = 0; i < this.bits.length; i++)
		this.bits[i] = 0

	this.__defineGetter__('Width', function () {
		return this.width
	})
	this.__defineGetter__('Height', function () {
		return this.height
	})
	this.__defineGetter__('Dimension', function () {
		if (this.width != this.height) {
			const e = new Error('AssertionError')
			e.message = 'Can\'t call getDimension() on a non-square matrix'
			throw e
		}
		return this.width
	})

	this.get_Renamed = function (x, y) {
		let offset = y * this.rowSize + (x >> 5)
		return ((URShift(this.bits[offset], (x & 0x1f))) & 1) != 0
	}
	this.set_Renamed = function (x, y) {
		let offset = y * this.rowSize + (x >> 5)
		this.bits[offset] |= 1 << (x & 0x1f)
	}
	this.flip = function (x, y) {
		let offset = y * this.rowSize + (x >> 5)
		this.bits[offset] ^= 1 << (x & 0x1f)
	}
	this.clear = function () {
		let max = this.bits.length
		for (let i = 0; i < max; i++) {
			this.bits[i] = 0
		}
	}
	this.setRegion = function (left, top, width, height) {
		if (top < 0 || left < 0) {
			const e = new Error('AssertionError')
			e.message = 'Left and top must be nonnegative'
			throw e
		}
		if (height < 1 || width < 1) {
			const e = new Error('AssertionError')
			e.message = 'Height and width must be at least 1'
			throw e
		}
		let right = left + width
		let bottom = top + height
		if (bottom > this.height || right > this.width) {
			const e = new Error('AssertionError')
			e.message = 'The region must fit inside the matrix'
			throw e
		}
		for (let y = top; y < bottom; y++) {
			let offset = y * this.rowSize
			for (let x = left; x < right; x++) {
				this.bits[offset + (x >> 5)] |= 1 << (x & 0x1f)
			}
		}
	}
}

export default BitMatrix
