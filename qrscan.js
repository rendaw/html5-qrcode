import { qrcode } from 'lib/QRCode'

const qrscan = {
	start: (mount, qrcodeSuccess, qrcodeError, videoError) => {
		let width = mount.width()
		let height = mount.height()

		if (width == null) {
			width = 300
		}

		if (height == null) {
			height = 250
		}

		const video = document.createElement('video')
		video.setAttribute('width', String(width) + 'px')
		video.setAttribute('height', String(height) + 'px')
		mount.appendChild(video)
		const canvas = document.createElement('canvas')
		canvas.setAttribute('width', String(width - 2) + 'px')
		canvas.setAttribute('height', String(height - 2) + 'px')
		canvas.setAttribute('autoplay', '')
		canvas.style.display = 'none'
		mount.appendChild(canvas)

		const context = canvas.getContext('2d')
		const data = {
			stream: null,
		}

		const scan = () => {
			if (data.stream !== null) {
				context.drawImage(video, 0, 0, width - 2, height - 2)
				try {
					qrcode.decode(canvas)
				} catch (e) {
					qrcodeError(e, data.stream)
				}
			}
			data.timeout = setTimeout(scan, 500)
		}

		navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia

		const successCallback = stream => {
			video.src = window.URL.createObjectURL(stream)
			data.stream = stream
			video.play()
			data.timeout = setTimeout(scan, 1000)
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
		clearTimeout(data.timeout)
	},
}

export default qrscan
