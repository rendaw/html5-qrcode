import globals from './globals.js'
import Detector from './detector.js'
import Decoder from './decoder.js'

let qrcode = {}
qrcode.qrCodeSymbol = null

qrcode.decode = function ({canvas, bwOut}) {
	let context = canvas.getContext('2d')
	globals.width = canvas.width
	globals.height = canvas.height
	globals.imagedata = context.getImageData(0, 0, globals.width, globals.height)
	return qrcode.process({bwOut: bwOut})
}

qrcode.isUrl = function (s) {
	let regexp = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-/]))?/
	return regexp.test(s)
}

qrcode.decode_url = function (s) {
	let escaped = ''
	try {
		escaped = escape(s)
	} catch (e) {
		console.error(e)
		escaped = s
	}
	let ret = ''
	try {
		ret = decodeURIComponent(escaped)
	} catch (e) {
		console.error(e)
		ret = escaped
	}
	return ret
}

qrcode.decode_utf8 = function (s) {
	if (qrcode.isUrl(s))
		return qrcode.decode_url(s)
	else
		return s
}

qrcode.process = function ({bwOut}) {
	let image = qrcode.grayScaleToBitmap(qrcode.grayscale())

	if (bwOut) {
		const imgData = bwOut.createImageData(globals.width, globals.height)
		for (let i = 0; i < globals.width * globals.height; i++) {
			for (let n = 0; n < 3; ++n) {
				imgData.data[i * 4 + n] = image[i] ? 255 : 0
			}
			imgData.data[i * 4 + 3] = 255
		}
		bwOut.putImageData(imgData, 0, 0)
	}

	let detector = new Detector(image)

	let qRCodeMatrix = detector.detect()
	if (qRCodeMatrix === null)
		return null

	let reader = Decoder.decode(qRCodeMatrix.bits)
	let data = reader.DataByte
	let str = ''
	for (let i = 0; i < data.length; i++) {
		for (let j = 0; j < data[i].length; j++)
			str += String.fromCharCode(data[i][j])
	}

	return qrcode.decode_utf8(str)
}

qrcode.getPixel = function (x, y) {
	if (globals.width < x) {
		const e = new Error('AssertionError')
		e.message = 'x out of range'
		throw e
	}
	if (globals.height < y) {
		const e = new Error('AssertionError')
		e.message = 'y out of range'
		throw e
	}
	const point = (x * 4) + (y * globals.width * 4)
	const p = (globals.imagedata.data[point] * 33 + globals.imagedata.data[point + 1] * 34 + globals.imagedata.data[point + 2] * 33) / 100
	return p
}

qrcode.binarize = function (th) {
	const ret = new Array(globals.width * globals.height)
	for (let y = 0; y < globals.height; y++) {
		for (let x = 0; x < globals.width; x++) {
			let gray = qrcode.getPixel(x, y)

			ret[x + y * globals.width] = gray <= th ? true : false
		}
	}
	return ret
}

qrcode.getMiddleBrightnessPerArea = function (image) {
	let numSqrtArea = 4
	//obtain middle brightness((min + max) / 2) per area
	let areaWidth = Math.floor(globals.width / numSqrtArea)
	let areaHeight = Math.floor(globals.height / numSqrtArea)
	let minmax = new Array(numSqrtArea)
	for (let i = 0; i < numSqrtArea; i++) {
		minmax[i] = new Array(numSqrtArea)
		for (let i2 = 0; i2 < numSqrtArea; i2++) {
			minmax[i][i2] = new Array(0, 0)
		}
	}
	for (let ay = 0; ay < numSqrtArea; ay++) {
		for (let ax = 0; ax < numSqrtArea; ax++) {
			minmax[ax][ay][0] = 0xFF
			for (let dy = 0; dy < areaHeight; dy++) {
				for (let dx = 0; dx < areaWidth; dx++) {
					let target = image[areaWidth * ax + dx + (areaHeight * ay + dy) * globals.width]
					if (target < minmax[ax][ay][0])
						minmax[ax][ay][0] = target
					if (target > minmax[ax][ay][1])
						minmax[ax][ay][1] = target
				}
			}
		}
	}
	let middle = new Array(numSqrtArea)
	for (let i3 = 0; i3 < numSqrtArea; i3++) {
		middle[i3] = new Array(numSqrtArea)
	}
	for (let ay = 0; ay < numSqrtArea; ay++) {
		for (let ax = 0; ax < numSqrtArea; ax++) {
			middle[ax][ay] = Math.floor((minmax[ax][ay][0] + minmax[ax][ay][1]) / 2)
		}
	}

	return middle
}

qrcode.grayScaleToBitmap = function (grayScale) {
	let middle = qrcode.getMiddleBrightnessPerArea(grayScale)
	let sqrtNumArea = middle.length
	let areaWidth = Math.floor(globals.width / sqrtNumArea)
	let areaHeight = Math.floor(globals.height / sqrtNumArea)

	let buff = new ArrayBuffer(globals.width * globals.height)
	let bitmap = new Uint8Array(buff)

	for (let ay = 0; ay < sqrtNumArea; ay++) {
		for (let ax = 0; ax < sqrtNumArea; ax++) {
			for (let dy = 0; dy < areaHeight; dy++) {
				for (let dx = 0; dx < areaWidth; dx++) {
					bitmap[areaWidth * ax + dx + (areaHeight * ay + dy) * globals.width] = (
						grayScale[areaWidth * ax + dx + (areaHeight * ay + dy) * globals.width] < middle[ax][ay]
					)
				}
			}
		}
	}
	return bitmap
}

qrcode.grayscale = function () {
	let buff = new ArrayBuffer(globals.width * globals.height)
	let ret = new Uint8Array(buff)

	for (let y = 0; y < globals.height; y++) {
		for (let x = 0; x < globals.width; x++) {
			let gray = qrcode.getPixel(x, y)
			ret[x + y * globals.width] = gray
		}
	}
	return ret
}

export default qrcode
