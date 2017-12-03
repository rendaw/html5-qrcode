import qrcode from './lib/qrcode.js'
const qrscan = {
	start: async ({
		mount,
		qrcodeSuccess,
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
				navigator.getUserMedia({video: {facingMode: 'environment'}}, resolve, reject)
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
				result = qrcode.decode(canvas, bwOut)
			} catch (e) {
				if (debugInfoCallback)
					debugInfoCallback(e, stream)
				return
			}
			if (result !== null) {
				qrcodeSuccess(result, stream)
			}
		}
		data.timeout = setInterval(scan, 500)

		return data
	},
	stop: data => {
		data.canceled = true
		// Null if initialization failed (ex: no camera)
		if (data.stream !== null)
			data.stream.getVideoTracks().forEach(track => track.stop())
		if (data.timeout !== null)
			clearInterval(data.timeout)
	},
}

export default qrscan
