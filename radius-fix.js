const fs = require('fs');
const path = require('path');

const dirs = [
  path.join(__dirname, 'client', 'src'),
  path.join(__dirname, 'admin', 'src')
];

let filesModified = 0;

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
      processFile(fullPath);
    }
  }
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  const original = content;

  // Replace size variants (or no size) -> rounded-lg
  // (?<!-) ensures we don't match something-rounded
  // \brounded(?:-(?:sm|md|xl|2xl|3xl))?\b matches rounded, rounded-sm, etc.
  // (?!-) ensures it's not followed by a hyphen (like rounded-none, rounded-full, rounded-lg)
  content = content.replace(/(?<!-)\brounded(?:-(?:sm|md|xl|2xl|3xl))?\b(?!-)/g, 'rounded-lg');

  // Replace directional variants -> rounded-[dir]-lg
  content = content.replace(/(?<!-)\brounded-(t|b|l|r|tl|tr|bl|br)(?:-(?:sm|md|xl|2xl|3xl))?\b(?!-)/g, 'rounded-$1-lg');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    filesModified++;
    console.log(`Modified: ${filePath}`);
  }
}

console.log('Starting border radius standardization...');
for (const dir of dirs) {
  if (fs.existsSync(dir)) {
    processDirectory(dir);
  }
}
console.log(`Finished! Modified ${filesModified} files.`);
