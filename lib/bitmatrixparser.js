import FormatInformation from './formatinformation.js'
import Version from './version.js'
import DataMask from './datamask.js'

function BitMatrixParser (bitMatrix) {
	let dimension = bitMatrix.Dimension
	if (dimension < 21 || (dimension & 0x03) != 1) {
		throw 'Error BitMatrixParser'
	}
	this.bitMatrix = bitMatrix
	this.parsedVersion = null
	this.parsedFormatInfo = null

	this.copyBit = function (i, j, versionBits) {
		return this.bitMatrix.get_Renamed(i, j) ? (versionBits << 1) | 0x1 : versionBits << 1
	}

	this.readFormatInformation = function () {
		if (this.parsedFormatInfo != null) {
			return this.parsedFormatInfo
		}

		// Read top-left format info bits
		let formatInfoBits = 0
		for (let i = 0; i < 6; i++) {
			formatInfoBits = this.copyBit(i, 8, formatInfoBits)
		}
		// .. and skip a bit in the timing pattern ...
		formatInfoBits = this.copyBit(7, 8, formatInfoBits)
		formatInfoBits = this.copyBit(8, 8, formatInfoBits)
		formatInfoBits = this.copyBit(8, 7, formatInfoBits)
		// .. and skip a bit in the timing pattern ...
		for (let j = 5; j >= 0; j--) {
			formatInfoBits = this.copyBit(8, j, formatInfoBits)
		}

		this.parsedFormatInfo = FormatInformation.decodeFormatInformation(formatInfoBits)
		if (this.parsedFormatInfo != null) {
			return this.parsedFormatInfo
		}

		// Hmm, failed. Try the top-right/bottom-left pattern
		let dimension = this.bitMatrix.Dimension
		formatInfoBits = 0
		let iMin = dimension - 8
		for (let i = dimension - 1; i >= iMin; i--) {
			formatInfoBits = this.copyBit(i, 8, formatInfoBits)
		}
		for (let j = dimension - 7; j < dimension; j++) {
			formatInfoBits = this.copyBit(8, j, formatInfoBits)
		}

		this.parsedFormatInfo = FormatInformation.decodeFormatInformation(formatInfoBits)
		if (this.parsedFormatInfo != null) {
			return this.parsedFormatInfo
		}
		throw 'Error readFormatInformation'
	}
	this.readVersion = function () {

		if (this.parsedVersion != null) {
			return this.parsedVersion
		}

		let dimension = this.bitMatrix.Dimension

		let provisionalVersion = (dimension - 17) >> 2
		if (provisionalVersion <= 6) {
			return Version.getVersionForNumber(provisionalVersion)
		}

		// Read top-right version info: 3 wide by 6 tall
		let versionBits = 0
		let ijMin = dimension - 11
		for (let j = 5; j >= 0; j--) {
			for (let i = dimension - 9; i >= ijMin; i--) {
				versionBits = this.copyBit(i, j, versionBits)
			}
		}

		this.parsedVersion = Version.decodeVersionInformation(versionBits)
		if (this.parsedVersion != null && this.parsedVersion.DimensionForVersion == dimension) {
			return this.parsedVersion
		}

		// Hmm, failed. Try bottom left: 6 wide by 3 tall
		versionBits = 0
		for (let i = 5; i >= 0; i--) {
			for (let j = dimension - 9; j >= ijMin; j--) {
				versionBits = this.copyBit(i, j, versionBits)
			}
		}

		this.parsedVersion = Version.decodeVersionInformation(versionBits)
		if (this.parsedVersion != null && this.parsedVersion.DimensionForVersion == dimension) {
			return this.parsedVersion
		}
		throw 'Error readVersion'
	}
	this.readCodewords = function () {

		let formatInfo = this.readFormatInformation()
		let version = this.readVersion()

		// Get the data mask for the format used in this QR Code. This will exclude
		// some bits from reading as we wind through the bit matrix.
		let dataMask = DataMask.forReference(formatInfo.DataMask)
		let dimension = this.bitMatrix.Dimension
		dataMask.unmaskBitMatrix(this.bitMatrix, dimension)

		let functionPattern = version.buildFunctionPattern()

		let readingUp = true
		let result = new Array(version.TotalCodewords)
		let resultOffset = 0
		let currentByte = 0
		let bitsRead = 0
		// Read columns in pairs, from right to left
		for (let j = dimension - 1; j > 0; j -= 2) {
			if (j == 6) {
				// Skip whole column with vertical alignment pattern;
				// saves time and makes the other code proceed more cleanly
				j--
			}
			// Read alternatingly from bottom to top then top to bottom
			for (let count = 0; count < dimension; count++) {
				let i = readingUp ? dimension - 1 - count : count
				for (let col = 0; col < 2; col++) {
					// Ignore bits covered by the function pattern
					if (!functionPattern.get_Renamed(j - col, i)) {
						// Read a bit
						bitsRead++
						currentByte <<= 1
						if (this.bitMatrix.get_Renamed(j - col, i)) {
							currentByte |= 1
						}
						// If we've made a whole byte, save it off
						if (bitsRead == 8) {
							result[resultOffset++] = currentByte
							bitsRead = 0
							currentByte = 0
						}
					}
				}
			}
			readingUp ^= true // readingUp = !readingUp; // switch directions
		}
		if (resultOffset != version.TotalCodewords) {
			throw 'Error readCodewords'
		}
		return result
	}
}

export default BitMatrixParser
