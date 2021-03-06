function GF256Poly (field, coefficients) {
	if (coefficients == null || coefficients.length == 0) {
		throw new Error('AssertionError')
	}
	this.field = field
	let coefficientsLength = coefficients.length
	if (coefficientsLength > 1 && coefficients[0] == 0) {
		// Leading term must be non-zero for anything except the constant polynomial "0"
		let firstNonZero = 1
		while (firstNonZero < coefficientsLength && coefficients[firstNonZero] == 0) {
			firstNonZero++
		}
		if (firstNonZero == coefficientsLength) {
			this.coefficients = field.Zero.coefficients
		} else {
			this.coefficients = new Array(coefficientsLength - firstNonZero)
			for (let i = 0; i < this.coefficients.length; i++) this.coefficients[i] = 0
			//Array.Copy(coefficients, firstNonZero, this.coefficients, 0, this.coefficients.length);
			for (let ci = 0; ci < this.coefficients.length; ci++) this.coefficients[ci] = coefficients[firstNonZero + ci]
		}
	} else {
		this.coefficients = coefficients
	}

	this.__defineGetter__('Zero', function () {
		return this.coefficients[0] == 0
	})
	this.__defineGetter__('Degree', function () {
		return this.coefficients.length - 1
	})
	this.__defineGetter__('Coefficients', function () {
		return this.coefficients
	})

	this.getCoefficient = function (degree) {
		return this.coefficients[this.coefficients.length - 1 - degree]
	}

	this.evaluateAt = function (a) {
		if (a == 0) {
			// Just return the x^0 coefficient
			return this.getCoefficient(0)
		}
		let size = this.coefficients.length
		if (a == 1) {
			// Just the sum of the coefficients
			let result = 0
			for (let i = 0; i < size; i++) {
				result = result ^ this.coefficients[i]
			}
			return result
		}
		let result2 = this.coefficients[0]
		for (let i = 1; i < size; i++) {
			result2 = this.field.multiply(a, result2) ^ this.coefficients[i]
		}
		return result2
	}

	this.addOrSubtract = function (other) {
		if (this.field != other.field) {
			const e = new Error('AssertionError')
			e.message = 'GF256Polys do not have same GF256 field'
			throw e
		}
		if (this.Zero) {
			return other
		}
		if (other.Zero) {
			return this
		}

		let smallerCoefficients = this.coefficients
		let largerCoefficients = other.coefficients
		if (smallerCoefficients.length > largerCoefficients.length) {
			let temp = smallerCoefficients
			smallerCoefficients = largerCoefficients
			largerCoefficients = temp
		}
		let sumDiff = new Array(largerCoefficients.length)
		let lengthDiff = largerCoefficients.length - smallerCoefficients.length
		// Copy high-order terms only found in higher-degree polynomial's coefficients
		//Array.Copy(largerCoefficients, 0, sumDiff, 0, lengthDiff);
		for (let ci = 0; ci < lengthDiff; ci++)sumDiff[ci] = largerCoefficients[ci]

		for (let i = lengthDiff; i < largerCoefficients.length; i++) {
			sumDiff[i] = smallerCoefficients[i - lengthDiff] ^ largerCoefficients[i]
		}

		return new GF256Poly(field, sumDiff)
	}
	this.multiply1 = function (other) {
		if (this.field != other.field) {
			const e = new Error('AssertionError')
			e.message = 'GF256Polys do not have same GF256 field'
			throw e
		}
		if (this.Zero || other.Zero) {
			return this.field.Zero
		}
		let aCoefficients = this.coefficients
		let aLength = aCoefficients.length
		let bCoefficients = other.coefficients
		let bLength = bCoefficients.length
		let product = new Array(aLength + bLength - 1)
		for (let i = 0; i < aLength; i++) {
			let aCoeff = aCoefficients[i]
			for (let j = 0; j < bLength; j++) {
				product[i + j] = product[i + j] ^ this.field.multiply(aCoeff, bCoefficients[j])
			}
		}
		return new GF256Poly(this.field, product)
	}
	this.multiply2 = function (scalar) {
		if (scalar == 0) {
			return this.field.Zero
		}
		if (scalar == 1) {
			return this
		}
		let size = this.coefficients.length
		let product = new Array(size)
		for (let i = 0; i < size; i++) {
			product[i] = this.field.multiply(this.coefficients[i], scalar)
		}
		return new GF256Poly(this.field, product)
	}
	this.multiplyByMonomial = function (degree, coefficient) {
		if (degree < 0) {
			throw new Error('AssertionError')
		}
		if (coefficient == 0) {
			return this.field.Zero
		}
		let size = this.coefficients.length
		let product = new Array(size + degree)
		for (let i = 0; i < product.length; i++)product[i] = 0
		for (let i = 0; i < size; i++) {
			product[i] = this.field.multiply(this.coefficients[i], coefficient)
		}
		return new GF256Poly(this.field, product)
	}
	this.divide = function (other) {
		if (this.field != other.field) {
			const e = new Error('AssertionError')
			e.message = 'GF256Polys do not have same GF256 field'
			throw e
		}
		if (other.Zero) {
			const e = new Error('AssertionError')
			e.message = 'Divide by 0'
			throw e
		}

		let quotient = this.field.Zero
		let remainder = this

		let denominatorLeadingTerm = other.getCoefficient(other.Degree)
		let inverseDenominatorLeadingTerm = this.field.inverse(denominatorLeadingTerm)

		while (remainder.Degree >= other.Degree && !remainder.Zero) {
			let degreeDifference = remainder.Degree - other.Degree
			let scale = this.field.multiply(remainder.getCoefficient(remainder.Degree), inverseDenominatorLeadingTerm)
			let term = other.multiplyByMonomial(degreeDifference, scale)
			let iterationQuotient = this.field.buildMonomial(degreeDifference, scale)
			quotient = quotient.addOrSubtract(iterationQuotient)
			remainder = remainder.addOrSubtract(term)
		}

		return new Array(quotient, remainder)
	}
}

export default GF256Poly
