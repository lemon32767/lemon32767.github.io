'use strict';

const $ = x => document.getElementById(x);
const nullish = x => x === null || x === undefined || Number.isNaN(x);

const registerNames = [
  'zero', 'at', 'v0', 'v1', 'a0', 'a1', 'a2', 'a3',
    't0', 't1', 't2', 't3', 't4', 't5', 't6', 't7',
    's0', 's1', 's2', 's3', 's4', 's5', 's6', 's7',
    't8', 't9', 'k0', 'k1', 'gp', 'sp', 's8', 'ra'
];
const regIdx2Name = i => registerNames[i];
function regName2Idx(name) {
  const asIdx = name.substring(0,1) == '$' ? parseInt(name.substring(1), 10) : null;
  if (!nullish(asIdx) && asIdx >= 0 && asIdx < 32) return asIdx;
  const asName = registerNames.indexOf(name.replace(/^\$/, "").replace(/^fp$/, "s8"));
  if (asName >= 0) return asName;
};

function leftpad(s, count, pad=' ') {
  return s.length >= count ? s : s + pad.repeat(count - s.length);
}
function rightpad(s, count, pad=' ') {
  return s.length >= count ? s : pad.repeat(count - s.length) + s;
}

// int -> 4-byte hex str (8 characters)
function int2hex(n) {
  return rightpad(((n >> 16) & 0xFFFF).toString(16), 4, '0') + rightpad((n & 0xFFFF).toString(16), 4, '0');
}

function bswap32(n) {
  return ((n >> 24) & 0xFF) <<  0
       | ((n >> 16) & 0xFF) <<  8
       | ((n >>  8) & 0xFF) << 16
       | ((n >>  0) & 0xFF) << 24;
}

 ///////////////////////////////////
////                             ////
////   INSTRUCTION DEFINITIONS   ////
////                             ////
 ///////////////////////////////////

// some of the most common syntaxes are given a name here to facilitate reading comprehension
const syntax = { 'regArith' : ['rd', 'rs', 'rt'],
                 'shiftImm' : ['rd', 'rt', 'sa'],
                 'shiftReg' : ['rd', 'rt', 'rs'],
                 'arithImm' : ['rt', 'rs', 'imm16'],
                 'arithImmU': ['rt', 'rs', 'imm16.u'],
                 'memory'   : ['rt', ['imm16', 'rs']]
               }; 
const instructionTable = {
  'add'    : { 'op': 0x00, 'funct': 32, 'syntax': syntax.regArith },
  'addu'   : { 'op': 0x00, 'funct': 33, 'syntax': syntax.regArith },
  'sub'    : { 'op': 0x00, 'funct': 34, 'syntax': syntax.regArith },
  'subu'   : { 'op': 0x00, 'funct': 35, 'syntax': syntax.regArith },
  'and'    : { 'op': 0x00, 'funct': 36, 'syntax': syntax.regArith },
  'or'     : { 'op': 0x00, 'funct': 37, 'syntax': syntax.regArith },
  'xor'    : { 'op': 0x00, 'funct': 38, 'syntax': syntax.regArith },
  'nor'    : { 'op': 0x00, 'funct': 39, 'syntax': syntax.regArith },
  'sll'    : { 'op': 0x00, 'funct':  0, 'syntax': syntax.shiftImm },
  'srl'    : { 'op': 0x00, 'funct':  2, 'syntax': syntax.shiftImm },
  'sra'    : { 'op': 0x00, 'funct':  3, 'syntax': syntax.shiftImm },
  'sllv'   : { 'op': 0x00, 'funct':  4, 'syntax': syntax.shiftReg },
  'srlv'   : { 'op': 0x00, 'funct':  6, 'syntax': syntax.shiftReg },
  'srav'   : { 'op': 0x00, 'funct':  7, 'syntax': syntax.shiftReg },
  'mfhi'   : { 'op': 0x00, 'funct': 16, 'syntax': ['rd']          },
  'mflo'   : { 'op': 0x00, 'funct': 18, 'syntax': ['rd']          },
  'mthi'   : { 'op': 0x00, 'funct': 17, 'syntax': ['rs']          },
  'mtlo'   : { 'op': 0x00, 'funct': 19, 'syntax': ['rs']          },
  'mult'   : { 'op': 0x00, 'funct': 24, 'syntax': ['rs', 'rt']    },
  'multu'  : { 'op': 0x00, 'funct': 25, 'syntax': ['rs', 'rt']    },
  'div'    : { 'op': 0x00, 'funct': 26, 'syntax': ['rs', 'rt']    },
  'divu'   : { 'op': 0x00, 'funct': 27, 'syntax': ['rs', 'rt']    },
  'slt'    : { 'op': 0x00, 'funct': 42, 'syntax': syntax.regArith },
  'sltu'   : { 'op': 0x00, 'funct': 43, 'syntax': syntax.regArith },
  'jr'     : { 'op': 0x00, 'funct':  8, 'syntax': ['rs']       },
  'jalr'   : { 'op': 0x00, 'funct':  9, 'syntax': ['rs']       },
  'j'      : { 'op': 0x02, 'syntax': ['imm26.j']               },
  'jal'    : { 'op': 0x03, 'syntax': ['imm26.j']               },
  'beq'    : { 'op': 0x04, 'syntax': ['rs', 'rt', 'imm16.rel'] },
  'bne'    : { 'op': 0x05, 'syntax': ['rs', 'rt', 'imm16.rel'] },
  'blez'   : { 'op': 0x06, 'syntax': ['rs', 'imm16.rel']       },
  'bgtz'   : { 'op': 0x07, 'syntax': ['rs', 'imm16.rel']       },
  'beql'   : { 'op': 0x14, 'syntax': ['rs', 'rt', 'imm16.rel'] },
  'bnel'   : { 'op': 0x15, 'syntax': ['rs', 'rt', 'imm16.rel'] },
  'blezl'  : { 'op': 0x16, 'syntax': ['rs', 'imm16.rel']       },
  'bgtzl'  : { 'op': 0x17, 'syntax': ['rs', 'imm16.rel']       },
  'addi'   : { 'op': 0x08, 'syntax': syntax.arithImm   },
  'addiu'  : { 'op': 0x09, 'syntax': syntax.arithImm   },
  'slti'   : { 'op': 0x0A, 'syntax': syntax.arithImm   },
  'sltiu'  : { 'op': 0x0B, 'syntax': syntax.arithImm   },
  'andi'   : { 'op': 0x0C, 'syntax': syntax.arithImmU  },
  'ori'    : { 'op': 0x0D, 'syntax': syntax.arithImmU  },
  'xori'   : { 'op': 0x0E, 'syntax': syntax.arithImmU  },
  'lui'    : { 'op': 0x0F, 'syntax': ['rt', 'imm16.u'] },
  'lb'     : { 'op': 0x20, 'syntax': syntax.memory },
  'lbu'    : { 'op': 0x24, 'syntax': syntax.memory },
  'lh'     : { 'op': 0x21, 'syntax': syntax.memory },
  'lhu'    : { 'op': 0x25, 'syntax': syntax.memory },
  'lw'     : { 'op': 0x23, 'syntax': syntax.memory },
  'sb'     : { 'op': 0x28, 'syntax': syntax.memory },
  'sh'     : { 'op': 0x29, 'syntax': syntax.memory },
  'sw'     : { 'op': 0x2B, 'syntax': syntax.memory },
  'mfc0'   : { 'op': 0x10, 'rs': 0, 'syntax': ['rt', 'rd'] },
  'mfc1'   : { 'op': 0x11, 'rs': 0, 'syntax': ['rt', 'fs'] },
  'mtc0'   : { 'op': 0x10, 'rs': 4, 'syntax': ['rt', 'rd'] },
  'mtc1'   : { 'op': 0x11, 'rs': 4, 'syntax': ['rt', 'fs'] },
  'syscall': { 'op': 0x00, 'funct': 12, 'optsyntax': ['syscode'] },
  'break'  : { 'op': 0x00, 'funct': 13, 'optsyntax': ['brkcode'] },
  'nop'    : { 'op': 0x00, 'rs': 0, 'rt': 0, 'rd': 0, 'sa': 0, 'funct': 0 }
}; Object.freeze(instructionTable);

function _decodeEncode(f) {
  // f: (field,offset,size) -> { ... }
  f('op',      26, 6)
  f('rs',      21, 5)
  f('rt',      16, 5)
  f('rd',      11, 5)
  f('sa',      6,  5)
  f('funct',   0,  6)
  f('imm16',   0, 16)
  f('imm26',   0, 26)
  f('fs',      11, 5)
  f('brkcode', 16,10)
  f('syscode',  6,20)
};

// bit masks containing the bits that each instruction makes use of,
// to detect if an instruction is setting unused bits to a non-zero value
let instrUsedBits = {};
for (const i in instructionTable) {
  instrUsedBits[i] = 0;

  // gather used fields
  let usedFields = [];
  for (const k in instructionTable[i])
    usedFields.push(k)
  const visit = x => Array.isArray(x) ? x.forEach(visit) : usedFields.push(x.replace(/\..*$/,""));
  if (instructionTable[i].syntax) visit(instructionTable[i].syntax);
  if (instructionTable[i].optsyntax) visit(instructionTable[i].optsyntax);

  // build bitmask from fields
  _decodeEncode((name, offst, siz) => {
    if (usedFields.includes(name))
      instrUsedBits[i] |= ((1 << siz) - 1) << offst;
  });
};


 /////////////////////////////////////////
////                                   ////
////   INSTRUCTION ENCODING/DECODING   ////
////                                   ////
 /////////////////////////////////////////

function encode(ins) {
  let word = 0;
  let setbits = 0;
  _decodeEncode((field, offset, siz) => {
    const mask = (1 << siz) - 1;
    if (!nullish(ins[field])) {
      if ((setbits & (mask << offset)) != 0)
        throw "! Internal error: overwriting instruction fields during encoding! " + field + " instr " + ins;
      word = (word & ~(mask << offset)) | ((ins[field] & mask) << offset);
      setbits |= mask << offset;
    }
  });
  //console.log(int2hex(setbits), ins);
  //if (setbits != (0xFFFFFFFF|0)) throw "! Not all bits set during encoding!"; // hmm....
  return word;
};

function decode(word) {
  let ins = {};
  _decodeEncode((field, offset, siz) => {
    ins[field] = (word >> offset) & ((1 << siz) - 1);
  });
  return ins;
};

 ///////////////////////////////////////////////////////
////                                                 ////
////   INDIVIDUAL INSTRUCTION ASSEMBLY/DISASSEMBLY   ////
////                                                 ////
 ///////////////////////////////////////////////////////

function assemble(labels, line, address) {
  const insName = line.split(' ')[0];
  if (insName == '.org' || (insName.substring(insName.length - 1) == ':' && !nullish(labels[insName.substring(0, insName.length - 1)]))) return 'continue';
  const insFmt = instructionTable[insName];
  const args = line.indexOf(' ') < 0 ? null : line.substring(line.indexOf(' ')).replace(/\s*/g, "").split(',');
  if (insName == '.word') {
    if (!args || args.length != 1) throw "! Illegal syntax for .word: " + line;
    const arg = args[0];
    let word;
    if (arg.match(/^[0-9]+$/))
      word = parseInt(arg, 10);
    else if (arg.match(/^0x[0-9a-f]+$/))
      word = parseInt(arg.substring(2), 16);
    if (nullish(word)) throw "! Illegal syntax for .word: " + line;
    if (word > 0xFFFFFFFF) throw "! .word: " + arg + " too large";
    return word; 
  }

  if (!insFmt) throw "! Unknown instruction " + insName;
  for (const i in args) {
    // turn "x(y)" into [x, y]
    const matches = args[i].match(/^([^)]+)\(([^)]+)\)$/);
    if (matches && matches.length == 3) args[i] = [matches[1], matches[2]]; 
  }

  let ins = {};
  for (const k in insFmt) ins[k] = insFmt[k];
  const syntax = insFmt.syntax || insFmt.optsyntax;
  if (!(!args && insFmt.optsyntax) && (args || syntax)) {
    if (!syntax || !args)
      throw "! Invalid syntax for " + insName;

    function match(fmt, arg, dest) {
      if (Array.isArray(fmt)) {
        if (arg.length != fmt.length) throw "! Invalid syntax for " + insName;
        for (let i = 0; i < arg.length; i++) {
          const field = fmt[i];
          match(field, arg[i], dest);
        }
      } else {
        //assert(typeof(fmt) == 'string');
        if (['rt','rs','rd'].includes(fmt)) { // base registers
          const regIdx = regName2Idx(arg);
          //console.log(fmt);
          if (nullish(regIdx)) throw "! Invalid register name " + arg;
          dest[fmt] = regIdx;
        } else if (fmt == 'sa') { // shift amount
          let shamt;
          if (arg.match(/^[0-9]+$/))
            shamt = parseInt(arg, 10);
          else if (arg.match(/^0x[0-9a-f]+$/))
            shamt = parseInt(arg.substring(2), 16);
          if (nullish(shamt)) throw "! Invalid shift amount " + arg;
          if (shamt < 0 || shamt > 31) throw "! Shift amount out of range";
          dest.sa = shamt;
        } else if (['fs'].includes(fmt)) { // floating point registers
          try {
            const regIdx = parseInt(arg.match(/^\$?f([0-9]+)$/)[1], 10);
            if (regIdx < 0 || regIdx > 31) throw "";
            dest[fmt] = regIdx;
          } catch {
            throw "! Invalid floating-point register name " + arg;
          }
        } else if (fmt == 'imm16' || fmt == 'imm16.u') { // 16-bit immediates
          let negate = false;
          if (Array.isArray(arg) && arg.length == 2 && ['%hi','%lo'].includes(arg[0])) {
            if (!nullish(labels[arg[1]]))
              dest.imm16 = (labels[arg[1]] >> (arg[0] == '%hi' ? 16 : 0)) & 0xFFFF;
            else
              throw "! No such label: " + arg[1];
          } else if (typeof arg === 'string') {
            let str = arg;
            if (str.substring(0,1) == '-') {
              negate = true;
              str = str.substring(1);
            }
            let n;
            let hex = false;
            if (str.match(/^[0-9]+$/)) n = parseInt(str, 10);
            else if (str.match(/^0x[0-9a-fA-F]+$/)) {
              n = parseInt(str.substring(2), 16);
              hex = true;
            }
            if (nullish(n)) throw "! Invalid syntax for immediate value " + arg;
            if (negate) n = -n;
            
            let min, max;
            if (hex) { min = -0x7FFF - 1, max = 0xFFFF; }
            else if (fmt == 'imm16') { min = -0x7FFF - 1, max = 0x7FFF; }
            else /*fmt == 'imm16.u'*/{ min = 0, max = 0xFFFF; }
            if (n > max || n < min) throw "! Immediate value out of range " + arg;
            dest.imm16 = n & 0xFFFF;
          } else throw "! Bad arg: " + arg;
        } else if (fmt == 'imm16.rel') { // 16 (18)-bit address/relative branch offset
          const baseAddr = address + 4;
          let absolute = true;
          let negate = false;
          let str = arg;
          if (str.substring(0,1) == '+') {
            absolute = false;
            str = str.substring(1);
          } else if (str.substring(0,1) == '-') {
            absolute = false;
            negate = true;
            str = str.substring(1);
          }
          let target;
          if (!absolute && str.match(/^[0-9]+$/))
            target = parseInt(str, 10);
          else if (str.match(absolute ? /^(0x)?[0-9a-f]+$/ : /^0x[0-9a-f]+$/))
            target = parseInt(str.replace(/^0x/, ""), 16);
          else if (absolute) {
            target = labels[str];
            if (nullish(target)) throw "! No such label: " + str;
          }
          
          if (nullish(target)) throw "! Invalid syntax for branch target " + arg;
          if (negate) target = -target;
          if (!absolute) target = baseAddr + target * 4;
          if (target & 3) throw "! Unaligned branch target " + line;
          const disp = (target - baseAddr) >> 2;
          if (disp < -0x8000 || disp > 0x7FFF) throw "! Jump target " + int2hex(target) + " out of range";
          dest.imm16 = disp & 0xFFFF;            
        } else if (fmt == 'imm26.j') { // j and jal
          const baseAddr = address + 4;
          let target;
          if (arg.match(/^(0x)?[0-9a-f]+$/))
            target = parseInt(arg.replace(/^0x/, ""), 16);
          else {
            target = labels[arg];
            if (nullish(target)) throw "! No such label: " + arg;
          }
          
          if (nullish(target)) throw "! Invalid syntax for branch target " + arg;
          if (target & 3) throw "! Unaligned branch target";
          if ((baseAddr & 0xF0000000) != (target & 0xF0000000)) throw "! Branch target " + int2hex(target) + " out of range";
          dest.imm26 = (target >> 2) & 0x03FFFFFF;
        } else if (fmt == 'brkcode' || fmt == 'syscode') { // break/syscall code
            let str = arg;
            let n;
            if (str.match(/^[0-9]+$/)) n = parseInt(str, 10);
            else if (str.match(/^0x[0-9a-fA-F]+$/))
              n = parseInt(str.substring(2), 16);
            else
              throw "! Invalid syntax for immediate value " + arg;
            
            const max = (fmt == 'brkcode') ? 0x3FF : 0xFFFFF;  
            if (n < 0 || n > max) throw "! Immediate value out of range " + arg;
            dest[fmt] = n;
        } else throw "! Unimplemented syntax " + fmt;
      }
    }

    match(syntax, args, ins);
  }

  return encode(ins);
};

function disassemble(word, address, showNote) {
  if (word === 0) return 'nop';
  const ins = decode(word);
  let name;
  for (const insName in instructionTable) {
    const insFmt = instructionTable[insName];
    let matches = true;
    for (const k in insFmt) {
      if (!k.match(/syntax/) && insFmt[k] != ins[k]) { matches = false; break; }
    }
    if (matches) { name = insName; break; }
  }

  if (nullish(name)) return '??';

  let note = '';
  function display(fmt, ins, depth=0) {
    if (!fmt) return "";
    if (Array.isArray(fmt)) {
      if (depth == 0 || fmt.length != 2) {
        // arg1,arg2,...
        let s = '';
        for (const i in fmt) {
          s += display(fmt[i], ins, depth + 1);
          if (i != fmt.length - 1) s += ',';
        }
        return s;
      } else {
        // arg1(arg2)
        return display(fmt[0], ins, depth + 1) + '('+display(fmt[1], ins, depth + 1)+')';
      }
    } else {
      if (['rs','rt','rd'].includes(fmt)) // basic register
        return regIdx2Name(ins[fmt]);
      else if (fmt == 'sa') // shift amount
        return ins.sa+'';
      else if (['fs'].includes(fmt)) // float regiser
        return '$f'+ins[fmt];
      else if (fmt == 'imm16') { // signed 16-bit immediate
        const n = (ins.imm16 << 16) >> 16; // sign extension
        if (n > 9 || n < -9)
          note = leftpad(n+'', 6) + ' = '+n.toString(16).replace(/^-/, "-0x").replace(/^([^-])/, "0x$1")
        return ''+n;
      } else if (fmt == 'imm16.u') { // unsigned 16-bit immediate
        const n = ins.imm16;
        const paddedHex = '0x'+rightpad(n.toString(16), 4, '0');
        if (n > 9 || n < -9)
          note = paddedHex + ' = ' + n;
        return paddedHex;
      } else if (fmt == 'imm16.rel') { // relative branch offset
        const offst = (ins.imm16 << 16) >> 16;
        const dispStr = offst >= 0 ? '+0x'+offst.toString(16)
                                   : '-0x'+(-offst).toString(16);
        if (nullish(address)) {
          return dispStr;
        } else {
          const target = address + 4 + (offst << 2);
          note = dispStr;
          return int2hex(target);
        }
      } else if (fmt == 'imm26.j') { // j and jal
        if (nullish(address))
          return int2hex(ins.imm26 << 2);
        return ((address >> 28) & 0xF).toString(16)+int2hex(ins.imm26 << 2).substring(1);
      } else if (fmt == 'brkcode' || fmt == 'syscode') { // break/syscall code
        return ins[fmt] ? '0x'+ins[fmt].toString(16) : '';
      } else throw "! Unimplemented syntax " + fmt;

    }
  };
  const syntax = instructionTable[name].syntax || instructionTable[name].optsyntax;
  const base = leftpad(name, 8) + display(syntax, ins);
  if ((word & ~instrUsedBits[name]) != 0) note = "* non-zero unused bits";
  if (note && showNote) return leftpad(base, 27) + ' ; ' + note;
  return base;
};

 ////////////////////////////////////////////////
////                                          ////
////   "WHOLE-PROGRAM" ASSEMBLY/DISASSEMBLY   ////
////                                          ////
 ////////////////////////////////////////////////

function assembleListing(input) {
  let lines = input.split('\n');
  for (const i in lines) {
    lines[i] = lines[i]
                 .toLowerCase()            // normalize case
                 .replace(/^\s+/, "")      // trim leading whitespace
                 .replace(/\s*(;.*)?$/,"") // trim trailing whitespace and comments
                 .replace(/\s+/, " ");     // simplify whitespace
  }
  lines = lines.filter(s => s.length != 0); // remove empty lines

  // map lines -> addresses, also find labels
  let addresses = [];
  let lastAddress = -4;
  let labels = {};
  for (const line of lines) {
    if (line.match(/^\.org.*/)) {
      try {
        const matches = [...line.matchAll(/^\.org\s+(0x)?([a-zA-Z0-9]+)$/g)];
        const addr = parseInt(matches[0][2], 16);
        addresses.push(addr);
        lastAddress = addr - 4;
      } catch {
        throw "! Invalid .org syntax (should be ex: .org 800ABCD0)"
      }
      if (lastAddress+4 > 0xFFFFFFFF) throw "! .org: address out of range"
      if (lastAddress & 3) throw "! Unaligned address is disallowed"
    } else if (line.match(/^[_a-zA-Z$][_a-zA-Z0-9$]*:$/)) { // label
      addresses.push(lastAddress+4);
      const label = line.replace(/:$/, "");
      if (labels[label] !== undefined) throw "! Redefining label " + label;
      labels[label] = lastAddress+4;
    } else {
      lastAddress += 4;
      addresses.push(lastAddress);
    }
  }

  let output = [];
  for (const i in lines) {
    const res = assemble(labels, lines[i], addresses[i]);
    if (res === 'continue') continue;
    output.push([addresses[i], res]);
  }

  return output;
};

function disassembleListing(input, orgAddr, littleEndian, showNote) {
  // remove punctuation and whitespace
  input = input.replace(/([-.,]|\^|\s|[\n])/g, "");
  if (input.length % 8 != 0) throw "! Hex words expected (incorrect bit length in input)";

  let addr = orgAddr;
  let output = [];
  for (let i = 0; i < input.length; i += 8) {
    const hex = input.substring(i, i + 8);
    const word = hex.match(/^[0-9A-Fa-f]+$/) ? parseInt(hex, 16) : null;
    if (nullish(word)) throw "! Invalid hex word: " + hex;
    output.push([addr, word, disassemble(littleEndian ? bswap32(word) : word, addr, showNote)]);
    addr += 4;
  }

  return output;
};

 ////////////////////////////////////////
////                                  ////
////   'DOM' INTERFACE INPUT/OUTPUT   ////
////                                  ////
 ////////////////////////////////////////

function assembleAndPresent() {
  let out = $('assembler-output');
  try {
    const insns = assembleListing($('assembler-input').value);
    const hideAddr = $('assembler-hideaddr').checked;
    const hideMnemonic = $('assembler-hidemnemonic').checked;
    const hideNote = $('assembler-hidenote').checked;
    const bigEndian = $('assembler-endian').value === 'big';

    out.value = '';
    insns.sort((x, y) => y[0] < x[0]);
    let lastAddr;
    for (const insn of insns) {
      if (lastAddr !== undefined) {
        if (lastAddr >= insn[0]) throw "! Overwriting instructions at address " + int2hex(insn[0]);
        if (lastAddr < insn[0] - 4) out.value += "........\n";
      } 

      const [addr, word] = insn;
      if (!hideAddr) out.value += int2hex(addr) + ':   ';
      out.value += int2hex(bigEndian ? word : bswap32(word));
      if (!hideMnemonic) out.value += '    ' + disassemble(word, addr, !hideNote);
      out.value += '\n';

      lastAddr = addr;
    };
  } catch (e) {
    console.error(e);
    out.value = "! Error!!\n" + e;
  }
}

function disassembleAndPresent() {
  let out = $('disassembler-output');
  try {
    const hideAddr = $('disassembler-hideaddr').checked;
    const hideHex = $('disassembler-hidehex').checked;
    const hideNote = $('disassembler-hidenote').checked;
    const bigEndian = $('disassembler-endian').value === 'big';
    const org = parseInt($('disassembler-org').value, 16) || 0;
    if (org > 0xFFFFFFFF || org < 0)
      throw "! Invalid starting address (out of range) " + rightpad(org.toString(16), 8, "0");
    else if ((org & 3) != 0)
      throw "! Invalid starting address (unaligned) " + rightpad(org.toString(16), 8, "0");

    const insns = disassembleListing($('disassembler-input').value, org, !bigEndian, !hideNote);

    out.value = '';
    for (const insn of insns) {
      const [addr, word, mnemonic] = insn;

      if (!hideAddr) out.value += int2hex(addr) + ':   ';
      if (!hideHex) out.value += int2hex(word) + '    ';
      out.value += mnemonic;
      out.value += '\n';
    }
  } catch (e) {
    console.error(e);
    out.value = "! Error!!\n" + e;
  }
}

window.onload = () => {
  let disasmOrgPrevVal = $('disassembler-org').value || 0;
  $('disassembler-org').oninput = (e) => {
    // revert edit if not a valid hex address
    const newval = e.target.value;
    if (newval.length && !newval.match(/^[0-9A-Fa-f]+$/))
      e.target.value = disasmOrgPrevVal;
    else
      disasmOrgPrevVal = e.target.value;
  };
};
