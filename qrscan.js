import qrcode from './lib/qrcode.js'

const qrscan = {
	start: (mount, qrcodeSuccess, qrcodeError, videoError) => {
		let width = mount.clientWidth
		let height = mount.clientHeight

		if (width == null) {
			width = 300
		}

		if (height == null) {
			height = 250
		}

		const video = document.createElement('video')
		video.setAttribute('width', String(width) + 'px')
		video.setAttribute('height', String(height) + 'px')
		video.setAttribute('autoplay', '')
		mount.appendChild(video)
		const canvas = document.createElement('canvas')
		canvas.setAttribute('width', String(width) + 'px')
		canvas.setAttribute('height', String(height) + 'px')
		canvas.style.display = 'none'
		mount.appendChild(canvas)

		const context = canvas.getContext('2d')
		const data = {
			stream: null,
		}

		const scan = () => {
			if (data.stream === null) return
			context.drawImage(video, 0, 0, width, height)
			try {
				qrcode.decode(canvas)
			} catch (e) {
				qrcodeError(e, data.stream)
			}
		}

		navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia

		const successCallback = stream => {
			video.src = window.URL.createObjectURL(stream)
			data.stream = stream
			video.play()
			data.timeout = setInterval(scan, 500)
		}

		navigator.getUserMedia({video: true}, successCallback, error => {
			videoError(error, data.stream)
		})

		qrcode.callback = result => {
			qrcodeSuccess(result, data.stream)
		}

		return data
	},
	stop: data => {
		data.stream.getVideoTracks().forEach(track => track.stop())
		clearInterval(data.timeout)
	},
}

export default qrscan
