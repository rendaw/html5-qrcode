import GF256 from './gf256.js'
import GF256Poly from './gf256poly.js'

function ReedSolomonDecoder (field) {
	this.field = field
	this.decode = function (received, twoS) {
		let poly = new GF256Poly(this.field, received)
		let syndromeCoefficients = new Array(twoS)
		for (let i = 0; i < syndromeCoefficients.length; i++)syndromeCoefficients[i] = 0
		let dataMatrix = false//this.field.Equals(GF256.DATA_MATRIX_FIELD);
		let noError = true
		for (let i = 0; i < twoS; i++) {
			// Thanks to sanfordsquires for this fix:
			let evalu = poly.evaluateAt(this.field.exp(dataMatrix ? i + 1 : i))
			syndromeCoefficients[syndromeCoefficients.length - 1 - i] = evalu
			if (evalu != 0) {
				noError = false
			}
		}
		if (noError) {
			return
		}
		let syndrome = new GF256Poly(this.field, syndromeCoefficients)
		let sigmaOmega = this.runEuclideanAlgorithm(this.field.buildMonomial(twoS, 1), syndrome, twoS)
		let sigma = sigmaOmega[0]
		let omega = sigmaOmega[1]
		let errorLocations = this.findErrorLocations(sigma)
		let errorMagnitudes = this.findErrorMagnitudes(omega, errorLocations, dataMatrix)
		for (let i = 0; i < errorLocations.length; i++) {
			let position = received.length - 1 - this.field.log(errorLocations[i])
			if (position < 0) {
				const e = new Error('AssertionError')
				e.message = 'ReedSolomonException Bad error location'
				throw e
			}
			received[position] = GF256.addOrSubtract(received[position], errorMagnitudes[i])
		}
	}

	this.runEuclideanAlgorithm = function (a, b, R) {
		// Assume a's degree is >= b's
		if (a.Degree < b.Degree) {
			let temp = a
			a = b
			b = temp
		}

		let rLast = a
		let r = b
		let sLast = this.field.One
		let s = this.field.Zero
		let tLast = this.field.Zero
		let t = this.field.One

		// Run Euclidean algorithm until r's degree is less than R/2
		while (r.Degree >= Math.floor(R / 2)) {
			let rLastLast = rLast
			let sLastLast = sLast
			let tLastLast = tLast
			rLast = r
			sLast = s
			tLast = t

			// Divide rLastLast by rLast, with quotient in q and remainder in r
			if (rLast.Zero) {
				// Oops, Euclidean algorithm already terminated?
				const e = new Error('AssertionError')
				e.message = 'r_{i-1} was zero'
				throw e
			}
			r = rLastLast
			let q = this.field.Zero
			let denominatorLeadingTerm = rLast.getCoefficient(rLast.Degree)
			let dltInverse = this.field.inverse(denominatorLeadingTerm)
			while (r.Degree >= rLast.Degree && !r.Zero) {
				let degreeDiff = r.Degree - rLast.Degree
				let scale = this.field.multiply(r.getCoefficient(r.Degree), dltInverse)
				q = q.addOrSubtract(this.field.buildMonomial(degreeDiff, scale))
				r = r.addOrSubtract(rLast.multiplyByMonomial(degreeDiff, scale))
				//r.EXE();
			}

			s = q.multiply1(sLast).addOrSubtract(sLastLast)
			t = q.multiply1(tLast).addOrSubtract(tLastLast)
		}

		let sigmaTildeAtZero = t.getCoefficient(0)
		if (sigmaTildeAtZero == 0) {
			const e = new Error('AssertionError')
			e.message = 'ReedSolomonException sigmaTilde(0) was zero'
			throw e
		}

		let inverse = this.field.inverse(sigmaTildeAtZero)
		let sigma = t.multiply2(inverse)
		let omega = r.multiply2(inverse)
		return new Array(sigma, omega)
	}
	this.findErrorLocations = function (errorLocator) {
		// This is a direct application of Chien's search
		let numErrors = errorLocator.Degree
		if (numErrors == 1) {
			// shortcut
			return [errorLocator.getCoefficient(1)]
		}
		let result = new Array(numErrors)
		let e = 0
		for (let i = 1; i < 256 && e < numErrors; i++) {
			if (errorLocator.evaluateAt(i) == 0) {
				result[e] = this.field.inverse(i)
				e++
			}
		}
		if (e != numErrors) {
			const e = new Error('AssertionError')
			e.message = 'Error locator degree does not match number of roots'
			throw e
		}
		return result
	}
	this.findErrorMagnitudes = function (errorEvaluator, errorLocations, dataMatrix) {
		// This is directly applying Forney's Formula
		let s = errorLocations.length
		let result = new Array(s)
		for (let i = 0; i < s; i++) {
			let xiInverse = this.field.inverse(errorLocations[i])
			let denominator = 1
			for (let j = 0; j < s; j++) {
				if (i != j) {
					denominator = this.field.multiply(denominator, GF256.addOrSubtract(1, this.field.multiply(errorLocations[j], xiInverse)))
				}
			}
			result[i] = this.field.multiply(errorEvaluator.evaluateAt(xiInverse), this.field.inverse(denominator))
			// Thanks to sanfordsquires for this fix:
			if (dataMatrix) {
				result[i] = this.field.multiply(result[i], xiInverse)
			}
		}
		return result
	}
}

export default ReedSolomonDecoder