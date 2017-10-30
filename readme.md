# QR Code Scanner
This is derived from [https://github.com/dwa012/html5-qrcode](https://github.com/dwa012/html5-qrcode) and in turn from [https://github.com/LazarSoft/jsqrcode](https://github.com/LazarSoft/jsqrcode) which is in turn derived from [https://github.com/zxing/zxing](https://github.com/zxing/zxing), with numberious community contributions.

This is a port to es6 with various fixes applied from the above projects.

#Usage

Include ```html5_qrcode.min.js``` in the ```lib``` directory.

Create a basic ```<div>``` with a given width and height. 

Presently width and height attributes must be set. 
 
```
 <div id="reader" style="width:300px;height:250px">
 </div>
```

Then call the ```html5_qrcode``` function on the ```div```. 
 
```
 $('#reader').html5_qrcode(function(data){
 		 // do something when code is read
 	},
 	function(error){
		//show read errors 
	}, function(videoError){
		//the video stream could be opened
	}
);
```

It takes three callbacks: a ```readSuccess```, ```readError```, and ```videoLoadError```. The readError wil be called quite often, it is really only useful for debugging. 

```videoError``` is called if the HTML5 video stream cannot be opened.


When you're done using the camera, call `$('#reader').html5_qrcode_stop()` to stop scanning for QR codes, close the stream, and relinquish permissions granted by the user.   
(This will result in the "camera on" light on their device turning off)



Copyright &copy; 2013 Daniel Ward

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

