const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

// Files to obfuscate
const filesToObfuscate = [
  path.join(__dirname, 'public', 'js', 'claim.js'),
  path.join(__dirname, 'public', 'js', 'subscription.js'),
  path.join(__dirname, 'public', 'js', 'protect.js')
];

// Obfuscation options
const obfuscationOptions = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.7,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.4,
  debugProtection: true,
  debugProtectionInterval: true,
  disableConsoleOutput: true,
  identifierNamesGenerator: 'hexadecimal',
  log: false,
  numbersToExpressions: true,
  renameGlobals: false,
  selfDefending: true,
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 10,
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayEncoding: ['base64'],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 2,
  stringArrayWrappersType: 'function',
  stringArrayThreshold: 0.75,
  transformObjectKeys: true,
  unicodeEscapeSequence: false
};

// Function to obfuscate a file
function obfuscateFile(filePath) {
  console.log(`Obfuscating ${path.basename(filePath)}...`);
  
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const obfuscatedCode = JavaScriptObfuscator.obfuscate(
      fileContent,
      obfuscationOptions
    ).getObfuscatedCode();
    
    // Create backup of the original file
    const backupPath = `${filePath}.backup`;
    if (!fs.existsSync(backupPath)) {
      fs.writeFileSync(backupPath, fileContent);
      console.log(`Original file backed up to ${path.basename(backupPath)}`);
    }
    
    // Write the obfuscated code
    fs.writeFileSync(filePath, obfuscatedCode);
    console.log(`Successfully obfuscated ${path.basename(filePath)}`);
  } catch (error) {
    console.error(`Error obfuscating ${path.basename(filePath)}:`, error);
  }
}

// Obfuscate each file
filesToObfuscate.forEach(obfuscateFile);
console.log('Obfuscation complete!');
