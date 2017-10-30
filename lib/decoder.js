import GF256 from './gf256'
import BitMatrixParser from './bitmatrixparser'
import ReedSolomonDecoder from './reedsolomondecoder'
import DataBlock from './datablock'
import QRCodeDataBlockReader from './qrcodedatablockreader'

const Decoder = {}
Decoder.rsDecoder = new ReedSolomonDecoder(GF256.QR_CODE_FIELD)

Decoder.correctErrors = function (codewordBytes, numDataCodewords) {
	let numCodewords = codewordBytes.length
	// First read into an array of ints
	let codewordsInts = new Array(numCodewords)
	for (let i = 0; i < numCodewords; i++) {
		codewordsInts[i] = codewordBytes[i] & 0xFF
	}
	let numECCodewords = codewordBytes.length - numDataCodewords
	try {
		Decoder.rsDecoder.decode(codewordsInts, numECCodewords)
		//let corrector = new ReedSolomon(codewordsInts, numECCodewords);
		//corrector.correct();
	} catch (rse) {
		throw rse
	}
	// Copy back into array of bytes -- only need to worry about the bytes that were data
	// We don't care about errors in the error-correction codewords
	for (let i = 0; i < numDataCodewords; i++) {
		codewordBytes[i] = codewordsInts[i]
	}
}

Decoder.decode = function (bits) {
	let parser = new BitMatrixParser(bits)
	let version = parser.readVersion()
	let ecLevel = parser.readFormatInformation().ErrorCorrectionLevel

	// Read codewords
	let codewords = parser.readCodewords()

	// Separate into data blocks
	let dataBlocks = DataBlock.getDataBlocks(codewords, version, ecLevel)

	// Count total number of data bytes
	let totalBytes = 0
	for (let i = 0; i < dataBlocks.Length; i++) {
		totalBytes += dataBlocks[i].NumDataCodewords
	}
	let resultBytes = new Array(totalBytes)
	let resultOffset = 0

	// Error-correct and copy data blocks together into a stream of bytes
	for (let j = 0; j < dataBlocks.length; j++) {
		let dataBlock = dataBlocks[j]
		let codewordBytes = dataBlock.Codewords
		let numDataCodewords = dataBlock.NumDataCodewords
		Decoder.correctErrors(codewordBytes, numDataCodewords)
		for (let i = 0; i < numDataCodewords; i++) {
			resultBytes[resultOffset++] = codewordBytes[i]
		}
	}

	// Decode the contents of that stream of bytes
	let reader = new QRCodeDataBlockReader(resultBytes, version.VersionNumber, ecLevel.Bits)
	return reader
	//return DecodedBitStreamParser.decode(resultBytes, version, ecLevel);
}

export default Decoder
