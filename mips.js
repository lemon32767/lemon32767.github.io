const $ = x => document.getElementById(x);
const nullish = x => x === null || x === undefined || Number.isNaN(x);

const registerNames = [
  'zero', 'at', 'v0', 'v1', 'a0', 'a1', 'a2', 'a3',
    't0', 't1', 't2', 't3', 't4', 't5', 't6', 't7',
    's0', 's1', 's2', 's3', 's4', 's5', 's6', 's7',
    't8', 't9', 'k0', 'k1', 'gp', 'sp', 's8', 'ra'
];
const regIdx2Name = i => registerNames[i];
const regName2Idx = function(name) {
  const asIdx = name.substring(0,1) == '$' ? parseInt(name.substring(1), 10) : null;
  if (!nullish(asIdx) && asIdx >= 0 && asIdx < 32) return asIdx;
  const asName = registerNames.indexOf(name.replace(/^\$/, ""));
  if (asName >= 0) return asName;
};

function leftpad(s, count, pad=' ') {
  return s.length >= count ? s : s + pad.repeat(count - s.length);
}
function rightpad(s, count, pad=' ') {
  return s.length >= count ? s : pad.repeat(count - s.length) + s;
}

const int2hex = function(n) {
  function pad(s) { return "0".repeat(4-s.length)+s; };
  return pad(((n >> 16) & 0xFFFF).toString(16)) + pad((n & 0xFFFF).toString(16));
};

const syntax = {
  'regArith': ['rd', 'rs', 'rt'],
  'shiftImm': ['rd', 'rt', 'sa'],
  'shiftReg': ['rd', 'rt', 'rs'],
  'arithImm': []
};
const instructionTable = {
  'add'  : { 'op': 0x00, 'funct': 32, 'syntax': syntax.regArith },
  'addu' : { 'op': 0x00, 'funct': 33, 'syntax': syntax.regArith },
  'sub'  : { 'op': 0x00, 'funct': 34, 'syntax': syntax.regArith },
  'subu' : { 'op': 0x00, 'funct': 35, 'syntax': syntax.regArith },
  'and'  : { 'op': 0x00, 'funct': 36, 'syntax': syntax.regArith },
  'or'   : { 'op': 0x00, 'funct': 37, 'syntax': syntax.regArith },
  'xor'  : { 'op': 0x00, 'funct': 38, 'syntax': syntax.regArith },
  'nor'  : { 'op': 0x00, 'funct': 39, 'syntax': syntax.regArith },
  'sll'  : { 'op': 0x00, 'funct':  0, 'syntax': syntax.shiftImm },
  'srl'  : { 'op': 0x00, 'funct':  2, 'syntax': syntax.shiftImm },
  'sra'  : { 'op': 0x00, 'funct':  3, 'syntax': syntax.shiftImm },
  'sllv' : { 'op': 0x00, 'funct':  4, 'syntax': syntax.shiftReg },
  'srlv' : { 'op': 0x00, 'funct':  6, 'syntax': syntax.shiftReg },
  'srav' : { 'op': 0x00, 'funct':  7, 'syntax': syntax.shiftReg },
  'mfhi' : { 'op': 0x00, 'funct': 16, 'syntax': ['rd']          },
  'mflo' : { 'op': 0x00, 'funct': 18, 'syntax': ['rd']          },
  'mthi' : { 'op': 0x00, 'funct': 17, 'syntax': ['rs']          },
  'mtlo' : { 'op': 0x00, 'funct': 19, 'syntax': ['rs']          },
  'mult' : { 'op': 0x00, 'funct': 24, 'syntax': ['rs', 'rt']    },
  'multu': { 'op': 0x00, 'funct': 25, 'syntax': ['rs', 'rt']    },
  'div'  : { 'op': 0x00, 'funct': 26, 'syntax': ['rs', 'rt']    },
  'divu' : { 'op': 0x00, 'funct': 27, 'syntax': ['rs', 'rt']    },
  'slt'  : { 'op': 0x00, 'funct': 42, 'syntax': syntax.regArith },
  'sltu' : { 'op': 0x00, 'funct': 43, 'syntax': syntax.regArith },
  'jr'   : { 'op': 0x00, 'funct':  8, 'syntax': ['rs']       },
  'jalr' : { 'op': 0x00, 'funct':  9, 'syntax': ['rs']       },
  'j'    : { 'op': 0x02, 'syntax': ['imm26.j']               },
  'jal'  : { 'op': 0x03, 'syntax': ['imm26.j']               },
  'beq'  : { 'op': 0x04, 'syntax': ['rs', 'rt', 'imm16.rel'] },
  'bne'  : { 'op': 0x05, 'syntax': ['rs', 'rt', 'imm16.rel'] },
  'blez' : { 'op': 0x06, 'syntax': ['rs', 'imm16.rel']       },
  'bgtz' : { 'op': 0x07, 'syntax': ['rs', 'imm16.rel']       },
  'beql' : { 'op': 0x14, 'syntax': ['rs', 'rt', 'imm16.rel'] },
  'bnel' : { 'op': 0x15, 'syntax': ['rs', 'rt', 'imm16.rel'] },
  'blezl': { 'op': 0x16, 'syntax': ['rs', 'imm16.rel']       },
  'bgtzl': { 'op': 0x17, 'syntax': ['rs', 'imm16.rel']       },
  'addi' : { 'op': 0x08, 'syntax': ['rt', 'rs', 'imm16']   },
  'addiu': { 'op': 0x09, 'syntax': ['rt', 'rs', 'imm16']   },
  'slti' : { 'op': 0x0A, 'syntax': ['rt', 'rs', 'imm16']   },
  'sltiu': { 'op': 0x0B, 'syntax': ['rt', 'rs', 'imm16']   },
  'andi' : { 'op': 0x0C, 'syntax': ['rt', 'rs', 'imm16.u'] },
  'ori'  : { 'op': 0x0D, 'syntax': ['rt', 'rs', 'imm16.u'] },
  'xori' : { 'op': 0x0E, 'syntax': ['rt', 'rs', 'imm16.u'] },
  'lui'  : { 'op': 0x0F, 'syntax': ['rt', 'imm16.u']       },
  'lb'   : { 'op': 0x20, 'syntax': ['rt', ['imm16', 'rs']] },
  'lbu'  : { 'op': 0x24, 'syntax': ['rt', ['imm16', 'rs']] },
  'lh'   : { 'op': 0x21, 'syntax': ['rt', ['imm16', 'rs']] },
  'lhu'  : { 'op': 0x25, 'syntax': ['rt', ['imm16', 'rs']] },
  'lw'   : { 'op': 0x23, 'syntax': ['rt', ['imm16', 'rs']] },
  'sb'   : { 'op': 0x28, 'syntax': ['rt', ['imm16', 'rs']] },
  'sh'   : { 'op': 0x29, 'syntax': ['rt', ['imm16', 'rs']] },
  'sw'   : { 'op': 0x2B, 'syntax': ['rt', ['imm16', 'rs']] },
  'mfc0' : { 'op': 0x10, 'rs': 0, 'syntax': ['rt', 'rd'] },
  'mfc1' : { 'op': 0x11, 'rs': 0, 'syntax': ['rt', 'fs'] },
  'mtc0' : { 'op': 0x10, 'rs': 4, 'syntax': ['rt', 'rd'] },
  'mtc1' : { 'op': 0x11, 'rs': 4, 'syntax': ['rt', 'fs'] },
  'syscall': { 'op': 0x00, 'funct': 12 },
  'break'  : { 'op': 0x00, 'funct': 13 },
  'nop'    : { 'op': 0x00 }
}; Object.freeze(instructionTable);

function assemble(input) {
  let lines = input.split('\n');
  for (let i = 0; i < lines.length; i++) {
    lines[i] = lines[i]
                 .toLowerCase()            // normalize case
                 .replace(/^\s+/, "")      // trim leading whitespace
                 .replace(/\s*(;.*)?$/,"") // trim trailing whitespace and comments
                 .replace(/\s+/, " ");     // simplify whitespace
  }
  lines = lines.filter(s => s.length != 0); // remove empty lines

  let addresses = [];
  let lastAddress = -4;
  for (const line of lines) {
    if (line.match(/^.org.*/)) {
      try {
        const matches = [...line.matchAll(/^.org\s+0x([a-zA-Z0-9]+)$/g)];
        const addr = parseInt(matches[0][1], 16);
        addresses.push(addr);
        lastAddress = addr - 4;
      } catch {
        throw "! Invalid .org syntax (should be ex: .org 0x800ABCD0)"
      }
      if (lastAddress+4 > 0xFFFFFFFF) throw "! .org: address out of range"
      if (lastAddress & 3) throw "! Unaligned address is disallowed"
    } else if (line.match(/[_a-zA-Z][_a-zA-Z0-9]*:/)) { // label
      addresses.push(lastAddress+4);
    } else {
      lastAddress += 4;
      addresses.push(lastAddress);
    }
  }

  // find labels
  let labels = {};
  for (let i = 0; i < lines.length; i++) {
    const matches = lines[i].match(/[._a-zA-Z][._a-zA-Z0-9]*:/);
    if (matches) {
      const label = matches[0].substring(0,matches[0].length-1);
      if (labels[label] !== undefined) throw "! Redefining label " + label;
      labels[label] = addresses[i];
    }
  }

  let output = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const insName = line.split(' ')[0];
    if (insName == '.org' || (insName.substring(insName.length - 1) == ':' && !nullish(labels[insName.substring(0, insName.length - 1)]))) continue;
    const insFmt = instructionTable[insName];
    if (!insFmt) throw "! Unknown instruction " + insName;
    const args = line.indexOf(' ') < 0 ? undefined : line.substring(line.indexOf(' ')).replace(/\s*/g, "").split(',');
    for (const i in args) {
      const matches = args[i].match(/^([^)]+)\(([^)]+)\)$/);
      if (matches && matches.length == 3) args[i] = [matches[1], matches[2]]; 
    }
    let ins = {};
    for (k in insFmt) if (k != 'syntax') ins[k] = insFmt[k];
    if (args || insFmt.syntax) {
      if (!insFmt.syntax || args.length != insFmt.syntax.length) throw "! Invalid syntax for " + insName;

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
          } else if (fmt == 'imm16.rel') { // 16 (18)-bit address/relative branch offset
            const baseAddr = addresses[i] + 4;
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
            if (str.match(/^[0-9]+$/))
              target = parseInt(str, 10);
            else if (str.match(/^0x[0-9a-f]+$/))
              target = parseInt(str.substring(2), 16);
            else if (absolute) {
              target = labels[str];
              if (nullish(target)) throw "! No such label: " + str;
            }
            
            if (nullish(target)) throw "! Invalid syntax for branch target " + arg;
            if (negate) target = -target;
            if (!absolute) target = baseAddr + target * 4;
            if (target & 3) throw "! Unaligned branch target";
            const disp = (target - baseAddr) >> 2;
            if (disp < -0x8000 || disp > 0x7FFF) throw "! Jump target " + int2hex(target) + " out of range";
            dest.imm16 = disp & 0xFFFF;            
          } else if (fmt == 'imm26.j') { // j and jal
            const baseAddr = addresses[i] + 4;
            let target;
            if (arg.match(/^[0-9]+$/))
              target = parseInt(arg, 10);
            else if (arg.match(/^0x[0-9a-f]+$/))
              target = parseInt(arg.substring(2), 16);
            else {
              target = labels[arg];
              if (nullish(target)) throw "! No such label: " + arg;
            }
            
            if (nullish(target)) throw "! Invalid syntax for branch target " + arg;
            if (target & 3) throw "! Unaligned branch target";
            if ((baseAddr & 0xF0000000) != (target & 0xF0000000)) throw "! Branch target " + int2hex(target) + " out of range";
            dest.imm26 = (target >> 2) & 0x03FFFFFF;
          } else throw "! Unimplemented syntax " + fmt;
        }
      }

      match(insFmt.syntax, args, ins);
    }
    //console.log(ins);
    let word = ins.op << 26;
    if (!nullish(ins.funct)) word |= ins.funct;
    if (!nullish(ins.rs)) word |= ins.rs << 21;
    if (!nullish(ins.rt)) word |= ins.rt << 16;
    if (!nullish(ins.rd)) word |= ins.rd << 11;
    if (!nullish(ins.fs)) word |= ins.fs << 11;
    if (!nullish(ins.sa)) word |= ins.sa << 6;
    if (!nullish(ins.imm16)) word |= ins.imm16 & 0xFFFF;
    if (!nullish(ins.imm26)) word |= ins.imm26 & 0x03FFFFFF;
    output.push([addresses[i], word]);
  }

  return output;
};

function decode(word) {
  const bitfield = (start, siz) => (word >> start) & ((1 << siz) - 1);
  return {
    'op'   : bitfield(26, 6),
    'rs'   : bitfield(21, 5),
    'rt'   : bitfield(16, 5),
    'rd'   : bitfield(11, 5),
    'sa'   : bitfield(6,  5),
    'funct': bitfield(0,  6),
    'imm16': bitfield(0, 16),
    'imm26': bitfield(0, 26),
    'fs'   : bitfield(11, 5)
  };
};

function disassemble(word, address) {
  if (word === 0) return 'nop';
  const ins = decode(word);
  let name;
  for (const insName in instructionTable) {
    const insFmt = instructionTable[insName];
    let matches = true;
    for (const k in insFmt) {
      if (k == 'syntax') continue;
      if (insFmt[k] != ins[k]) { matches = false; break; }
    }
    if (matches) { name = insName; break; }
  }
  if (!nullish(name)) {
    let note = '';
    function display(fmt, ins, depth=0) {
      if (!fmt.length) return "";
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
          return ins.sa;
        else if (['fs'].includes(fmt)) // float regiser
          return '$f'+ins[fmt];
        else if (fmt == 'imm16') { // signed 16-bit immediate
          const n = (ins.imm16 << 16) >> 16; // sign extension
          note = leftpad(n+'', 6) + ' = '+n.toString(16).replace(/^-/, "-0x").replace(/^([^-])/, "0x$1")
          return ''+n;
        } else if (fmt == 'imm16.u') { // unsigned 16-bit immediate
          const n = ins.imm16;
          const paddedHex = '0x'+leftpad(n.toString(16), 4, '0');
          note = paddedHex + ' = ' + n;
          return paddedHex;
        } else if (fmt == 'imm16.rel') { // relative branch offset
          const offst = (ins.imm16 << 16) >> 16;
          const dispStr = offst >= 0 ? '+0x'+offst.toString(16)
                                     : '-0x'+(-offst).toString(16);
          if (nullish(address)) {
            return dispStr;
          } else {
            const target = address + (offst << 2);
            note = dispStr;
            return '0x'+int2hex(target);
          }
        } else if (fmt == 'imm26.j') { // j and jal
          if (nullish(address))
            return '0x'+int2hex(ins.imm26 << 2);
          return '0x'+((address >> 28) & 0xF).toString(16)+int2hex(ins.imm26 << 2).substring(1);
        } else throw "! Unimplemented syntax " + fmt;

      }
    };
    const base = leftpad(name, 8) + " " + display(instructionTable[name].syntax, ins);
    if (note) return leftpad(base, 30) + ' ; ' + note;
    return base;
  }
};

function assembleAndPresent() {
  let out = $('assembler-output');
  try {
    let insns = assemble($('assembler-input').value);
    out.value = '';
    insns.sort((x, y) => y[0] < x[0]);
    let lastAddr;
    for (const insn of insns) {
      if (lastAddr !== undefined) {
        if (lastAddr == insn[0]) throw "! Overwriting instructions at address " + int2hex(lastAddr);
        if (lastAddr < insn[0] - 4) out.value += "........\n";
      } 
      out.value += int2hex(insn[0]) + ':   ' + int2hex(insn[1]) + '     '
                 + disassemble(insn[1], insn[0]) + '\n';
      lastAddr = insn[0];
    };
  } catch (e) {
    out.value = "! Error!!\n" + e;
  }
}
