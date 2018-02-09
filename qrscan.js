/**
 * ### QR Code Scanner
 * This is derived from [html5-qrcode](https://github.com/dwa012/html5-qrcode) and in turn from [jsqrcode](https://github.com/LazarSoft/jsqrcode) which is in turn derived from [zxing](https://github.com/zxing/zxing), with numberious community contributions.
 *
 * This is a port to es6 with various fixes applied from the above projects, some of my own fixes, documentation, etc.
 *
 * See `example.html` for very rough usage.
 *
 * ### Installing
 *
 * Run `npm install --save qrscan-es6`
 *
 * ### Importing
 *
 * Add this to your code: `import qrscan from 'qrscan`'
 *
 * @module qrscan-es6
 */

import qrcode from './lib/qrcode.js'

/**
 * Starts scanning with the camera and create a video element to show.  This is asynchronous, so do `await qrcode.start` to capture errors.
 * what's being captured.
 * @param {Object} args
 * @param {Element} args.mount The DOM element to place the video in.
 * @param {function} args.scannedCallback When a QR code is scanned this callback is called with the string.
 * @param {function} args.debugInfoCallback Called with various debug info.
 * @param {boolean} args.debugBW If true, add a canvas below the video that shows the captured data after being converted to black and white.
 * @returns {Object} A token you should store.  The token is used to stop capture.
 */
const start = async ({
	mount,
	scannedCallback,
	debugInfoCallback,
	debugBW,
}) => {
	const data = {
		canceled: false,
		stream: null,
		timeout: null,
	}

	// 1. Open the camera
	navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia
	const stream = await new Promise((resolve, reject) => {
		try {
			navigator.getUserMedia({video: {facingMode: 'environment'}, audio: false}, resolve, reject)
		} catch (e) {
			reject(e)
		}
	})

	// 2. Create the video output element and route the camera to it
	const video = document.createElement('video')
	video.setAttribute('autoplay', '')
	video.setAttribute('playsinline', '') // disables fullscreen, enables autoplay ios 11
	video.setAttribute('width', '100%')
	video.srcObject = stream
	mount.appendChild(video)

	// 3. Wait for layout to finish
	await new Promise(r => setTimeout(r, 0))

	// 4. Start video playback
	await video.play()

	// 5. Start processing
	const width = mount.clientWidth
	const ar = stream.getVideoTracks()[0].getSettings().aspectRatio
	const height = Math.trunc(width / ar)

	const createCanvas = () => {
		const canvas = document.createElement('canvas')
		canvas.setAttribute('width', String(width) + 'px')
		canvas.setAttribute('height', String(height) + 'px')
		return canvas
	}
	const canvas = createCanvas()
	canvas.style.display = 'none'
	mount.appendChild(canvas)
	const gcontext = canvas.getContext('2d')
	let bwOut
	if (debugBW) {
		const bwCanvas = createCanvas()
		bwOut = bwCanvas.getContext('2d')
		mount.appendChild(bwCanvas)
	}
	const scan = () => {
		if (data.canceled)
			return
		gcontext.drawImage(video, 0, 0, width, height)
		let result
		try {
			result = qrcode.decode({canvas, bwOut})
		} catch (e) {
			if (debugInfoCallback)
				debugInfoCallback(e, stream)
			return
		}
		if (result !== null) {
			scannedCallback(result, stream)
		}
	}
	data.timeout = setInterval(scan, 500)

	return data
}

/**
 * Stop capture.  This doesn't delete any generated DOM elements.
 * @param {Object} token The token returned by `start`.
 */
const stop = token => {
	token.canceled = true
	// Null if initialization failed (ex: no camera)
	if (token.stream !== null)
		token.stream.getVideoTracks().forEach(track => track.stop())
	if (token.timeout !== null)
		clearInterval(token.timeout)
}

export default {start: start, stop: stop}
