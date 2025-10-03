"use strict";
import { nibble, alphabit, alphanumbit, verifyNibble, verifyNibbit, verifyNibblit } from "./headerBitTypes.js";
// encoder class
export class HeaderEncoder {
    constructor() {
        console.log("Encoder constructor");
        this.version = 0;
        this.versionBits = 0;
        this.month = 0;
        this.monthBits = 0;
        this.seconds = 0;
        this.secondsBits = 0;
        this.gridsquare = "";
        this.gridsquareBits = 0;
        this.callsign = "";
        this.callsignBits = 0;
        this.name = "";
        this.nameBits = 0;
        // inputs
        this.versionInput = document.getElementById("version");
        this.versionBitResult = document.getElementById("version-bits");
        this.monthInput = document.getElementById("month");
        this.monthBitResult = document.getElementById("month-bits");
        this.secondsInput = document.getElementById("seconds");
        this.secondsBitResult = document.getElementById("seconds-bits");
        this.timeBitResult = document.getElementById("time-bits");
        this.gridsquareInput = document.getElementById("gridsquare");
        this.gridsquareBitResult = document.getElementById("gridsquare-bits");
        this.callsignInput = document.getElementById("callsign");
        this.callsignBitResult = document.getElementById("callsign-bits");
        this.nameInput = document.getElementById("name");
        this.nameBitResult = document.getElementById("name-bits");
        // output field
        this.outputField = document.getElementById("output");
        this.decodedVersionValue = document.getElementById("decoded-version-value");
        this.decodedGridsquareValue = document.getElementById("decoded-gridsquare-value");
        this.decodedNameValue = document.getElementById("decoded-name-value");
        this.decodedCallsignValue = document.getElementById("decoded-callsign-value");
        this.decodedTimeValue = document.getElementById("decoded-time-value");
        // event listeners
        // version user input
        this.versionInput.oninput = () => {
            // verify the version is a number
            // this value will roll after 15
            // by then we'll have a new app version
            // released to the public
            this.version = this.versionInput.value;
            const versionNumber = parseInt(this.version, 10);
            // check for NaN
            if (isNaN(versionNumber)) {
                this.versionInput.style.backgroundColor = "red";
                this.versionBitResult.value = "not a number.";
            } else if (versionNumber > 15) {
                this.versionInput.style.backgroundColor = "red";
                this.versionBitResult.value = "version must be less than 16.";
            } else {
                this.versionInput.style.backgroundColor = "white";
                // Convert decimal version string to hex character for nibble lookup
                const hexChar = versionNumber.toString(16).toUpperCase();
                // update the version bits using the nibble map
                const nibbleValue = nibble[hexChar];
                const versionBits = `0b${nibbleValue.toString(2).padStart(4, "0")}`;
                this.versionBitResult.value = versionBits;
                this.versionBits = versionBits;
            }
        }
        // time automatic update
        setInterval(()=>{
            const time = new Date();
            // encode month into one nibble 4 bit value with a range of 0 to 11
            // note: january is 0
            const month = time.getMonth();
            const monthBits = `0b${month.toString(2).padStart(4, "0")}`;
            this.month = month;
            this.monthBits = monthBits;
            // encode the number of seconds since the start of the month
            const seconds = time.getSeconds(); // (0 to 59) / 2
            // pad value with 1 0 if one digit.
            document.getElementById("time-second").innerHTML = seconds.toString().padStart(2, "0");
            // calculate seconds since start of month
            const startOfMonth = new Date(time.getFullYear(), time.getMonth(), 1);
            const result = Math.floor((time - startOfMonth) / 2000);
            // format with commas to show the result in human readable format
            const resultString = result.toLocaleString();
            document.getElementById("time-result").innerHTML = resultString;
            // every other second is a 21 bit value to save bits
            const second = Math.floor(result); // 0 to 29
            const secondBits = `0b${second.toString(2).padStart(21, "0")}`;
            this.seconds = second;
            this.secondsBits = secondBits;
            this.secondsInput.value = secondBits;
            this.monthInput.value = monthBits;
            this.timeBitResult.value = `${this.monthBits}, ${this.secondsBits}`;
        }, 1000);
        // gridsquare user input
        this.gridsquareInput.oninput = () => {
            // verify pattern of letter letter number number letter letter
            const gridsquare = this.gridsquareInput.value.toUpperCase();
            if (!/^[A-Z]{2}[0-9]{2}[A-Z]{2}$/.test(gridsquare)) {
                this.gridsquareInput.style.backgroundColor = "red";
                this.gridsquareBitResult.value = "invalid gridsquare.";
            } else {
                this.gridsquareInput.style.backgroundColor = "white";
                this.gridsquare = gridsquare;
                // convert the gridsquare to nibbles
                // update the gridsquare bits using the nibble map
                const field = gridsquare.slice(0, 2);
                const square = gridsquare.slice(2, 4);
                const locator = gridsquare.slice(4, 6);
                const fieldBits = field.split('').map(char => alphabit[char]).map(nibble => nibble.toString(2).padStart(5, "0")).join(", ");
                const squareBits = square.split('').map(char => nibble[char]).map(nibble => nibble.toString(2).padStart(4, "0")).join(", ");
                const locatorBits = locator.toUpperCase().split('').map(char => alphabit[char]).map(nibble => nibble.toString(2).padStart(5, "0")).join(", ");
                this.gridsquareBitResult.value = fieldBits + ", " + squareBits + ", " + locatorBits;
            }
        }
        // callsign user input
        this.callsignInput.oninput = () => {
            const callsign = this.callsignInput.value;
            if (!/^[A-Za-z0-9]{1,8}$/.test(callsign)) {
                this.callsignInput.style.backgroundColor = "red";
                this.callsignBitResult.value = "valid characters only. A-Z, 0-9, 1-8 characters.";
            } else {
                this.callsignInput.style.backgroundColor = "white";
                this.callsign = callsign;
                const uppserCase = callsign.toUpperCase();
                const uppserCaseArray = uppserCase.split('');
                const callsignNibbits = uppserCaseArray.map(char => alphanumbit[char]);
                const callsignBits = callsignNibbits.map(n => n.toString(2).padStart(6, "0")).join(", ");
                const callsignBitsArray = callsignBits.split(", ");
                for(let i = callsignBitsArray.length; i < 8; i++) {
                    callsignBitsArray.push("000000");
                }
                // convert the array back to a string of 6 bit values separated by commas
                const callsignBitsString = callsignBitsArray.join(", ");
                this.callsignBitResult.value = callsignBitsString;
            }
        }
        // name user input
        this.nameInput.oninput = () => {
            const name = this.nameInput.value.toUpperCase();
            if(name.length < 1) {
                this.nameInput.style.backgroundColor = "red";
                this.nameBitResult.value = "name must be at least 1 character.";
            } else if(name.length > 32) {
                this.nameInput.style.backgroundColor = "red";
                this.nameBitResult.value = "name must be less than 32 characters.";
            } else if (!/^[A-Z\s@.:/-]+$/.test(name)) {
                this.nameInput.style.backgroundColor = "red";
                this.nameBitResult.value = "valid characters only. A-Z,@,:,/.-, and space.";
            } else {
                this.nameInput.style.backgroundColor = "white";
                this.name = name;
                const nameBits = name.toUpperCase().split('').map(char => alphabit[char]).map(nibble => nibble.toString(2).padStart(5, "0")).join(", ");
                // replace the values in the nameBitResult with the nameValues
                // nameBits is a string of 5 bit values separated by commas
                // we need to convert this to an array of 5 bit values
                // fill in the rest with 0
                const nameBitsArray = nameBits.split(", ");
                // fill in the rest with 0
                for (let i = nameBitsArray.length; i < 32; i++) {
                    nameBitsArray.push("00000");
                }
                // convert the array back to a string of 5 bit values separated by commas
                const nameBitsString = nameBitsArray.join(", ");
                this.nameBitResult.value = nameBitsString;
            }
        }
        // output bit results
        setInterval(()=>{
            const v = this.versionBitResult.value;
            const t = this.timeBitResult.value;
            const g = this.gridsquareBitResult.value;
            const c = this.callsignBitResult.value;
            const n = this.nameBitResult.value;
            this.outputField.innerHTML = v + ", " + t + ", " + g + ", " + c + ", " + n;
        }, 1000);
    }
}