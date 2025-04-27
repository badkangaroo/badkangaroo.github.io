"use strict";
import { nibble, nibbit, nibblit } from "./headerBitTypes.js";
// encoder class
export class HeaderEncoder {
    constructor() {
        console.log("Encoder constructor");
        this.version = 0;
        this.versionBits = 0;
        this.gridsquare = "";
        this.name = "";
        this.time = 0;
        // inputs
        this.versionInput = document.getElementById("version");
        this.versionBitResult = document.getElementById("version-bits");
        this.gridsquareInput = document.getElementById("gridsquare");
        this.gridsquareBitResult = document.getElementById("gridsquare-bits");
        this.nameInput = document.getElementById("name");
        this.nameBitResult = document.getElementById("name-bits");
        this.callsignInput = document.getElementById("callsign");
        this.callsignBitResult = document.getElementById("callsign-bits");
        this.timeInput = document.getElementById("time");
        this.timeBitResult = document.getElementById("time-bits");
        // buttons
        this.encodeButton = document.getElementById("encode");
        this.decodeButton = document.getElementById("decode");
        // output field
        this.outputField = document.getElementById("output");
        this.decodedVersionValue = document.getElementById("decoded-version-value");
        this.decodedGridsquareValue = document.getElementById("decoded-gridsquare-value");
        this.decodedNameValue = document.getElementById("decoded-name-value");
        this.decodedCallsignValue = document.getElementById("decoded-callsign-value");
        this.decodedTimeValue = document.getElementById("decoded-time-value");
        const verifyLettersOnly = (str) => {
            return /^[A-Za-z]+$/.test(str);
        }
        const verifyNumbersOnly = (str) => {
            return /^[0-9]+$/.test(str);
        }
        const verifyNibbits = (str) => {
            // allowed characters are A-Z " " and ":", "." and "/"
            return /^[A-Z\s:.\/]+$/.test(str);
        }
        const verifyLength = (str, length) => {
            return str.length === length;
        }
        const nibblesToString = (nibbles) => {
            return nibbles.map(nibble => nibble.toString(16)).join("");
        }
        const nibbitToString = (nibbit) => {
            return nibbit.map(nibble => nibbit[nibble]).join("");
        }
        const nibbleToString = (nibble) => {
            return nibble.toString(16);
        }
        const stringToNibble = (str) => {
            return str.split("").map(char => nibble[char]);
        }
        const stringToNibbit = (str) => {
            return str.split("").map(char => nibbit[char]);
        }
        const stringToNibblit = (str) => {
            return str.split("").map(char => nibblit[char]);
        }
        // event listeners
        this.versionInput.oninput = () => {
            // verify the version is a number
            // this value will roll after 15
            // by then we'll have a new app version
            // released to the public
            const version = this.versionInput.value;
            if (!verifyNumbersOnly(version)) {
                // change the field to red
                this.versionInput.style.backgroundColor = "red";
                // verify the number is less than 16
                this.versionBitResult.value = "numbers only.";
            } else if (version > 15) {
                this.versionInput.style.backgroundColor = "red";
                this.versionBitResult.value = "version must be less than 16.";
            } else {
                this.versionInput.style.backgroundColor = "white";
                this.version = version;
                // Convert decimal version string to hex character for nibble lookup
                const versionNum = Number(version);
                const hexChar = versionNum.toString(16).toUpperCase();
                // update the version bits using the nibble map
                this.versionBitResult.value = nibbit[hexChar].toString(2).padStart(4, "0");
                // console log the version bits
                console.log(this.versionBitResult.value);
            }
        }
        this.gridsquareInput.oninput = () => {
            // verify pattern of letter letter number number letter letter
            const gridsquare = this.gridsquareInput.value;
            if (!/^[A-Z]{2}[0-9]{2}[a-z]{2}$/.test(gridsquare)) {
                this.gridsquareInput.style.backgroundColor = "red";
                this.gridsquareBitResult.value = "invalid gridsquare.";
            } else {
                this.gridsquareInput.style.backgroundColor = "white";
                this.gridsquare = gridsquare;
                // convert the gridsquare to nibbles
                // update the gridsquare bits using the nibble map
                const field = gridsquare.slice(0, 2);
                const square = gridsquare.slice(2, 4);
                const locator = gridsquare.slice(4, 6);// convert both to uppercase for mapping
                const locatorUpper = locator.toUpperCase();
                const fieldBits = stringToNibbit(field).map(nibble => nibble.toString(2).padStart(5, "0")).join(", ");
                const squareBits = stringToNibble(square).map(nibble => nibble.toString(2).padStart(4, "0")).join(", ");
                const locatorBits = stringToNibbit(locatorUpper).map(nibble => nibble.toString(2).padStart(5, "0")).join(", ");
                this.gridsquareBitResult.value = fieldBits + ", " + squareBits + ", " + locatorBits;
            }
        }
        this.nameInput.oninput = () => {
            const name = this.nameInput.value;
            const nameUppercase = name.toUpperCase();
            if (!verifyNibbits(name)) {
                this.nameInput.style.backgroundColor = "red";
                this.nameBitResult.value = "valid characters only.";
            } else {
                this.nameInput.style.backgroundColor = "white";
                this.name = name;
                // convert the name to nibits 5 bits each
                // convert to uppercase for mapping
                const nameBits = stringToNibbit(nameUppercase).map(nibble => nibble.toString(2).padStart(5, "0")).join(", ");
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
    }

    encode() {
        this.versionInput.onchange = () => {
            this.version = this.versionInput.value;
        }
        const convertToNibble = (str) => {

        }
    }
}