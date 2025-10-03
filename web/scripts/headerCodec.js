"use strict";
import { nibble, alphabit, alphanumbit, verifyNibble, verifyNibbit, verifyNibblit } from "./headerBitTypes.js";
// header codec class
export class HeaderCodec {
    constructor() {
        console.log("Codec constructor");
        this.encodeYearAndMonth = this.encodeYearAndMonth.bind(this);
    }
    // encode year and month
    // inputs: year (number), month (number)
    // outputs: bits (string)
    // example: encodeYearAndMonth(2025, 0) => "0000000000"
    // example: encodeYearAndMonth(2025, 10) => "0000000001"
    encodeYearAndMonth(year, month) {
        // expect year to be between 2025 and 2111
        // example year could be 2027
        // month could be April which is 3
        if(typeof(month) !== "number") {
            throw new Error("Month must be a number");
        }
        if(typeof(year) !== "number") {
            throw new Error("Year must be a number");
        }
        if (year < 2025 || year > 2111) {
            throw new Error("Year must be between 2025 and 2111");
        }
        // expect month to be between 0 and 11
        if (month < 0 || month > 11) {
            throw new Error("Month must be between 0 and 11");
        }
        // once all the checks are done then we can add the month
        // to the year convert it to bits and return the bits.

        // normalize to year 2025
        const years = year - 2025;
        // if year is 2027, the years should be 2
        // add months to years to get total months
        // from 2025 so if it's April 2027, the months should be 25
        const months = (12 * years) + month;
        const monthBits = months.toString(2).padStart(10, "0");
        // month bits should be 0000011001
        // month in 10 bits
        // TODO: Add a special calculation for leap year months.
        console.log(`Year and Month bits: 0b${monthBits}`);
        return monthBits;
    }
    // encode gridsquare
    // inputs: gridsquare (string)
    // outputs: bits (string)
    // example: gridsquareEncode("FN42kl") => "00110, 01110, 0100, 0010, 01011, 01100"
    gridsquareEncode(gridsquare) {
        // verify pattern of letter letter number number letter letter
        gridsquare = gridsquare.toUpperCase();
        // verify the gridsquare is 6 characters
        if (gridsquare.length !== 6) {
            throw new Error("Gridsquare must be 6 characters");
        }
        if (!/^[A-Z]{2}[0-9]{2}[A-Z]{2}$/.test(gridsquare)) {
            throw new Error("Invalid gridsquare");
        } else {
            // convert the gridsquare to nibbles
            // update the gridsquare bits using the nibble map
            const field = gridsquare.slice(0, 2);
            const square = gridsquare.slice(2, 4);
            const subsquare = gridsquare.slice(4, 6);
            const fieldBits = field.split('').map(char => alphabit[char]).map(nibble => nibble.toString(2).padStart(5, "0")).join(", ");
            const squareBits = square.split('').map(char => nibble[char]).map(nibble => nibble.toString(2).padStart(4, "0")).join(", ");
            const subsquareBits = subsquare.toUpperCase().split('').map(char => alphabit[char]).map(nibble => nibble.toString(2).padStart(5, "0")).join(", ");
            this.gridsquareBitResult.value = fieldBits + ", " + squareBits + ", " + locatorBits;
        }
    }
}