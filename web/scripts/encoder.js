"use strict";
// define an artitrary nibble
const nibble = {
    "0": b0000, // 0
    "1": b0001, // 1
    "2": b0010, // 2
    "3": b0011, // 3
    "4": b0100, // 4
    "5": b0101, // 5
    "6": b0110, // 6
    "7": b0111, // 7
    "8": b1000, // 8
    "9": b1001, // 9
    "A": b1010, // 10
    "B": b1011, // 11
    "C": b1100, // 12
    "D": b1101, // 13
    "E": b1110, // 14
    "F": b1111, // 15
}
const nibbit = {
    " ": b00000, // 0
    "-": b00001, // 1
    "A": b00010, // 2
    "B": b00011, // 3
    "C": b00100, // 4
    "D": b00101, // 5
    "E": b00110, // 6
    "F": b00111, // 7
    "G": b01000, // 8
    "H": b01001, // 9
    "I": b01010, // 10
    "J": b01011, // 11
    "K": b01100, // 12
    "L": b01101, // 13
    "M": b01110, // 14
    "N": b01111, // 15
    "O": b10000, // 16
    "P": b10001, // 17
    "Q": b10010, // 18
    "R": b10011, // 19
    "S": b10100, // 20
    "T": b10101, // 21
    "U": b10110, // 22
    "V": b10111, // 23
    "W": b11000, // 24
    "X": b11001, // 25
    "Y": b11010, // 26
    "Z": b11011, // 27
    "@": b11100, // 28
    ".": b11101, // 29
    ":": b11110, // 30
    "/": b11111, // 31
}
const nibblit = {
    " ": b000000, // 0
    "1": b000001, // 1
    "2": b000010, // 2
    "3": b000011, // 3
    "4": b000100, // 4
    "5": b000101, // 5
    "6": b000110, // 6
    "7": b000111, // 7
    "8": b001000, // 8
    "9": b001001, // 9
    "A": b001010, // 10
    "B": b001011, // 11
    "C": b001100, // 12
    "D": b001101, // 13
    "E": b001110, // 14
    "F": b001111, // 15
    "G": b010000, // 16
    "H": b010001, // 17
    "I": b010010, // 18
    "J": b010011, // 19
    "K": b010100, // 20
    "L": b010101, // 21
    "M": b010110, // 22
    "N": b010111, // 23
    "O": b011000, // 24
    "P": b011001, // 25
    "Q": b011010, // 26
    "R": b011011, // 27
    "S": b011100, // 28
    "T": b011101, // 29
    "U": b011110, // 30
    "V": b011111, // 31
    "W": b100000, // 32
    "X": b100001, // 33
    "Y": b100010, // 34
    "Z": b100011, // 35
    ",": b100100, // 36
    ".": b100101, // 37
    "/": b100110, // 38
    "?": b100111, // 39
    "!": b101000, // 40
    "@": b101001, // 41
    "/": b101010, // 42
    "!": b101011, // 43
    "@": b101100, // 44
    "#": b101101, // 45
    "$": b101110, // 46
    "%": b101111, // 47
    "^": b110000, // 48
    "&": b110001, // 49
    "*": b110010, // 50
    "(": b110011, // 51
    ")": b110100, // 52
    "-": b110101, // 53
    "+": b110110, // 54
    "_": b110111, // 55
    "=": b111000, // 56
    "\'": b111001, // 57
    "\\": b111010, // 58
    "|": b111011, // 59
    "\'": b111100, // 60
    "~": b111101, // 61
    "`": b111110, // 62
    "°": b111111, // 63
}

class Encoder {
    constructor() {
        this.version = 0;
        this.versionBits = 0;
        this.gridsquare = "";
        this.name = "";
        this.time = 0;
    }
    encode() {
        // encode the version
        this.versionBits = nibble[this.version];
        // encode the gridsquare
        this.gridsquareBits = nibbit[this.gridsquare];
        const verifyLettersOnly = (str) => {
            return /^[A-Za-z]+$/.test(str);
        }
        if (!verifyLettersOnly(this.gridsquare)) {
            throw new Error("Gridsquare contains invalid characters");
        }
        const verifyNumbersOnly = (str) => {
            return /^[0-9]+$/.test(str);
        }
        if (!verifyNumbersOnly(this.gridsquare)) {
            throw new Error("Gridsquare contains invalid characters");
        }
        const verifyLength = (str, length) => {
            return str.length === length;
        }
        if (!verifyLength(this.gridsquare)) {
            throw new Error("Gridsquare must be 4 characters long");
        }
    }
}