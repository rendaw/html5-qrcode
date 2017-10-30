function ErrorCorrectionLevel (ordinal, bits, name) {
	this.ordinal_Renamed_Field = ordinal
	this.bits = bits
	this.name = name
	this.__defineGetter__('Bits', function () {
		return this.bits
	})
	this.__defineGetter__('Name', function () {
		return this.name
	})
	this.ordinal = function () {
		return this.ordinal_Renamed_Field
	}
}

ErrorCorrectionLevel.forBits = function (bits) {
	if (bits < 0 || bits >= FOR_BITS.Length) {
		throw 'ArgumentException'
	}
	return FOR_BITS[bits]
}

const L = new ErrorCorrectionLevel(0, 0x01, 'L')
const M = new ErrorCorrectionLevel(1, 0x00, 'M')
const Q = new ErrorCorrectionLevel(2, 0x03, 'Q')
const H = new ErrorCorrectionLevel(3, 0x02, 'H')
const FOR_BITS = new Array(M, L, H, Q)

export default ErrorCorrectionLevel