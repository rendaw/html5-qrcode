const URShift = (number, bits) => {
	if (number >= 0)
		return number >> bits
	else
		return (number >> bits) + (2 << ~bits)
}
export default {URShift}
