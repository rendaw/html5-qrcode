const sizeOfDataLengthInfo = [[10, 9, 8, 8], [12, 11, 16, 10], [14, 13, 16, 12]]

function QRCodeDataBlockReader (blocks, version, numErrorCorrectionCode) {
	this.blockPointer = 0
	this.bitPointer = 7
	this.dataLength = 0
	this.blocks = blocks
	this.numErrorCorrectionCode = numErrorCorrectionCode
	if (version <= 9)
		this.dataLengthMode = 0
	else if (version >= 10 && version <= 26)
		this.dataLengthMode = 1
	else if (version >= 27 && version <= 40)
		this.dataLengthMode = 2

	this.getNextBits = function (numBits) {
		let bits = 0
		if (numBits < this.bitPointer + 1) {
			// next word fits into current data block
			let mask = 0
			for (let i = 0; i < numBits; i++) {
				mask += (1 << i)
			}
			mask <<= (this.bitPointer - numBits + 1)

			bits = (this.blocks[this.blockPointer] & mask) >> (this.bitPointer - numBits + 1)
			this.bitPointer -= numBits
			return bits
		} else if (numBits < this.bitPointer + 1 + 8) {
			// next word crosses 2 data blocks
			let mask1 = 0
			for (let i = 0; i < this.bitPointer + 1; i++) {
				mask1 += (1 << i)
			}
			bits = (this.blocks[this.blockPointer] & mask1) << (numBits - (this.bitPointer + 1))
			this.blockPointer++
			bits += ((this.blocks[this.blockPointer]) >> (8 - (numBits - (this.bitPointer + 1))))

			this.bitPointer = this.bitPointer - numBits % 8
			if (this.bitPointer < 0) {
				this.bitPointer = 8 + this.bitPointer
			}
			return bits
		} else if (numBits < this.bitPointer + 1 + 16) {
			// next word crosses 3 data blocks
			let mask1 = 0 // mask of first block
			let mask3 = 0 // mask of 3rd block
			//bitPointer + 1 : number of bits of the 1st block
			//8 : number of the 2nd block (note that use already 8bits because next word uses 3 data blocks)
			//numBits - (bitPointer + 1 + 8) : number of bits of the 3rd block 
			for (let i = 0; i < this.bitPointer + 1; i++) {
				mask1 += (1 << i)
			}
			let bitsFirstBlock = (this.blocks[this.blockPointer] & mask1) << (numBits - (this.bitPointer + 1))
			this.blockPointer++

			let bitsSecondBlock = this.blocks[this.blockPointer] << (numBits - (this.bitPointer + 1 + 8))
			this.blockPointer++

			for (let i = 0; i < numBits - (this.bitPointer + 1 + 8); i++) {
				mask3 += (1 << i)
			}
			mask3 <<= 8 - (numBits - (this.bitPointer + 1 + 8))
			let bitsThirdBlock = (this.blocks[this.blockPointer] & mask3) >> (8 - (numBits - (this.bitPointer + 1 + 8)))

			bits = bitsFirstBlock + bitsSecondBlock + bitsThirdBlock
			this.bitPointer = this.bitPointer - (numBits - 8) % 8
			if (this.bitPointer < 0) {
				this.bitPointer = 8 + this.bitPointer
			}
			return bits
		} else {
			return 0
		}
	}
	this.NextMode = function () {
		if ((this.blockPointer > this.blocks.length - this.numErrorCorrectionCode - 2))
			return 0
		else
			return this.getNextBits(4)
	}
	this.getDataLength = function (modeIndicator) {
		let index = 0
		while (true) {
			if ((modeIndicator >> index) == 1)
				break
			index++
		}

		return this.getNextBits(sizeOfDataLengthInfo[this.dataLengthMode][index])
	}
	this.getRomanAndFigureString = function (dataLength) {
		let length = dataLength
		let intData = 0
		let strData = ''
		let tableRomanAndFigure = new Array('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', ' ', '$', '%', '*', '+', '-', '.', '/', ':')
		do {
			if (length > 1) {
				intData = this.getNextBits(11)
				let firstLetter = Math.floor(intData / 45)
				let secondLetter = intData % 45
				strData += tableRomanAndFigure[firstLetter]
				strData += tableRomanAndFigure[secondLetter]
				length -= 2
			} else if (length == 1) {
				intData = this.getNextBits(6)
				strData += tableRomanAndFigure[intData]
				length -= 1
			}
		}
		while (length > 0)

		return strData
	}
	this.getFigureString = function (dataLength) {
		let length = dataLength
		let intData = 0
		let strData = ''
		do {
			if (length >= 3) {
				intData = this.getNextBits(10)
				if (intData < 100)
					strData += '0'
				if (intData < 10)
					strData += '0'
				length -= 3
			} else if (length == 2) {
				intData = this.getNextBits(7)
				if (intData < 10)
					strData += '0'
				length -= 2
			} else if (length == 1) {
				intData = this.getNextBits(4)
				length -= 1
			}
			strData += intData
		}
		while (length > 0)

		return strData
	}
	this.get8bitByteArray = function (dataLength) {
		let length = dataLength
		let intData = 0
		let output = new Array()

		do {
			intData = this.getNextBits(8)
			output.push(intData)
			length--
		}
		while (length > 0)
		return output
	}
	this.getKanjiString = function (dataLength) {
		let length = dataLength
		let intData = 0
		let unicodeString = ''
		do {
			intData = this.getNextBits(13)
			let lowerByte = intData % 0xC0
			let higherByte = intData / 0xC0

			let tempWord = (higherByte << 8) + lowerByte
			let shiftjisWord = 0
			if (tempWord + 0x8140 <= 0x9FFC) {
				// between 8140 - 9FFC on Shift_JIS character set
				shiftjisWord = tempWord + 0x8140
			} else {
				// between E040 - EBBF on Shift_JIS character set
				shiftjisWord = tempWord + 0xC140
			}

			//let tempByte = new Array(0,0);
			//tempByte[0] = (sbyte) (shiftjisWord >> 8);
			//tempByte[1] = (sbyte) (shiftjisWord & 0xFF);
			//unicodeString += new String(SystemUtils.ToCharArray(SystemUtils.ToByteArray(tempByte)));
			unicodeString += String.fromCharCode(shiftjisWord)
			length--
		}
		while (length > 0)


		return unicodeString
	}
	this.parseECIValue = function () {
		let intData = 0
		let firstByte = this.getNextBits(8)
		if ((firstByte & 0x80) == 0) {
			intData = firstByte & 0x7F
		}
		if ((firstByte & 0xC0) == 0x80) {
			// two bytes
			let secondByte = this.getNextBits(8)
			intData = ((firstByte & 0x3F) << 8) | secondByte
		}
		if ((firstByte & 0xE0) == 0xC0) {
			// three bytes
			let secondThirdBytes = this.getNextBits(8)
			intData = ((firstByte & 0x1F) << 16) | secondThirdBytes
		}
		return intData
	}


	this.__defineGetter__('DataByte', function () {
		let output = new Array()
		let MODE_NUMBER = 1
		let MODE_ROMAN_AND_NUMBER = 2
		let MODE_8BIT_BYTE = 4
		let MODE_ECI = 7
		let MODE_KANJI = 8
		do {
			let mode = this.NextMode()
			if (mode == 0) {
				if (output.length > 0)
					break
				else
					throw 'Empty data block'
			}
			if (mode != MODE_NUMBER && mode != MODE_ROMAN_AND_NUMBER && mode != MODE_8BIT_BYTE && mode != MODE_KANJI && mode != MODE_ECI) {
				throw 'Invalid mode: ' + mode + ' in (block:' + this.blockPointer + ' bit:' + this.bitPointer + ')'
			}
			if (mode == MODE_ECI) {
				let temp_sbyteArray3 = this.parseECIValue()
			} else {
				const dataLength = this.getDataLength(mode)
				if (dataLength < 1)
					throw 'Invalid data length: ' + dataLength
				switch (mode) {
				case MODE_NUMBER: {
					let temp_str = this.getFigureString(dataLength)
					let ta = new Array(temp_str.length)
					for (let j = 0; j < temp_str.length; j++)
						ta[j] = temp_str.charCodeAt(j)
					output.push(ta)
					break
				}
				case MODE_ROMAN_AND_NUMBER: {
					let temp_str = this.getRomanAndFigureString(dataLength)
					let ta = new Array(temp_str.length)
					for (let j = 0; j < temp_str.length; j++)
						ta[j] = temp_str.charCodeAt(j)
					output.push(ta)
					break
				}
				case MODE_8BIT_BYTE: {
					let temp_sbyteArray3 = this.get8bitByteArray(dataLength)
					output.push(temp_sbyteArray3)
					break
				}
				case MODE_KANJI: {
					let temp_str = this.getKanjiString(dataLength)
					output.push(temp_str)
					break
				}
				}
			}
			//			
			//canvas.println("DataLength: " + dataLength);
			//Console.out.println(dataString);
		} while (true)
		return output
	})
}

export default QRCodeDataBlockReader