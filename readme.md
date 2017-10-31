# QR Code Scanner
This is derived from [https://github.com/dwa012/html5-qrcode](https://github.com/dwa012/html5-qrcode) and in turn from [https://github.com/LazarSoft/jsqrcode](https://github.com/LazarSoft/jsqrcode) which is in turn derived from [https://github.com/zxing/zxing](https://github.com/zxing/zxing), with numberious community contributions.

This is a port to es6 with various fixes applied from the above projects.

See `example.html` for usage.  `start` returns a value that must be passed to `stop` to stop the scanning.  You will need to dispose of created child elements (video, canvas) yourself when done.

# Including

Run `npm install qrscan-es6`
