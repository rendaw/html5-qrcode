import globals from './globals.js'
import Detector from './detector.js'
import Decoder from './decoder.js'

let qrcode = {}
qrcode.qrCodeSymbol = null
qrcode.debug = false

qrcode.callback = null

qrcode.setWebcam = function (vidSuccess, vidError) {
	let options = true
	if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
		try {
			navigator.mediaDevices.enumerateDevices()
				.then(devices => {
					devices.forEach(device => {
						if (device.kind === 'videoinput') {
							if (device.label.toLowerCase().search('back') > -1)
								options = [{'sourceId': device.deviceId}]
						}
						//console.log(device.kind + ': ' + device.label + ' id = ' + device.deviceId)
					})
				})

		} catch (e) {
			console.error(e)
		}
	} else {
		console.error('no navigator.mediaDevices.enumerateDevices')
	}

	navigator.getUserMedia({video: options, audio: false}, vidSuccess, vidError)
}

qrcode.decode = function (canvas_qr) {
	let context = canvas_qr.getContext('2d')
	globals.width = canvas_qr.width
	globals.height = canvas_qr.height
	globals.imagedata = context.getImageData(0, 0, globals.width, globals.height)
	qrcode.result = qrcode.process(context)
	if (qrcode.callback != null)
		qrcode.callback(qrcode.result)
	return qrcode.result
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

qrcode.process = function (ctx) {
	let image = qrcode.grayScaleToBitmap(qrcode.grayscale())
	//let image = qrcode.binarize(128);

	if (qrcode.debug) {
		for (let y = 0; y < globals.height; y++) {
			for (let x = 0; x < globals.width; x++) {
				let point = (x * 4) + (y * globals.width * 4)
				globals.imagedata.data[point] = image[x + y * globals.width] ? 0 : 0
				globals.imagedata.data[point + 1] = image[x + y * globals.width] ? 0 : 0
				globals.imagedata.data[point + 2] = image[x + y * globals.width] ? 255 : 0
			}
		}
		ctx.putImageData(globals.imagedata, 0, 0)
	}

	//let finderPatternInfo = new FinderPatternFinder().findFinderPattern(image);

	let detector = new Detector(image)

	let qRCodeMatrix = detector.detect()

	if (qrcode.debug) {
		for (let y = 0; y < qRCodeMatrix.bits.Height; y++) {
			for (let x = 0; x < qRCodeMatrix.bits.Width; x++) {
				let point = (x * 4 * 2) + (y * 2 * globals.width * 4)
				globals.imagedata.data[point] = qRCodeMatrix.bits.get_Renamed(x, y) ? 0 : 0
				globals.imagedata.data[point + 1] = qRCodeMatrix.bits.get_Renamed(x, y) ? 0 : 0
				globals.imagedata.data[point + 2] = qRCodeMatrix.bits.get_Renamed(x, y) ? 255 : 0
			}
		}
		ctx.putImageData(globals.imagedata, 0, 0)
	}


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
		throw 'point error'
	}
	if (globals.height < y) {
		throw 'point error'
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

	//let bitmap = new Array(globals.height*globals.width);

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
