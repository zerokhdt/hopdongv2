import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the email templates file
const templatesFile = path.join(__dirname, 'google_app_scrip_Email Templates.js');
const content = fs.readFileSync(templatesFile, 'utf8');

// Parse the EMAIL_TEMPLATES object by finding the object literal
const startMarker = 'const EMAIL_TEMPLATES = {';
const startIndex = content.indexOf(startMarker);
if (startIndex === -1) {
  console.error('Could not find EMAIL_TEMPLATES constant');
  process.exit(1);
}

// Start from the opening brace after the equals sign
let braceCount = 0;
let inString = false;
let stringChar = '';
let i = startIndex + startMarker.length - 1; // position at '{'

for (; i < content.length; i++) {
  const char = content[i];
  const prevChar = i > 0 ? content[i - 1] : '';
  
  // Handle string literals
  if (!inString && (char === '"' || char === "'" || char === '`')) {
    inString = true;
    stringChar = char;
  } else if (inString && char === stringChar && prevChar !== '\\') {
    inString = false;
  }
  
  // Count braces only when not inside a string
  if (!inString) {
    if (char === '{') braceCount++;
    if (char === '}') {
      braceCount--;
      if (braceCount === 0) {
        break; // Found the matching closing brace
      }
    }
  }
}

const objectContent = content.substring(startIndex + startMarker.length - 1, i + 1);

// Use Function to evaluate the object safely (since it's our own file)
const templates = eval(`(${objectContent})`);

// Write HTML files
const outputDir = path.join(__dirname, '..', 'email_templates');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

let count = 0;
for (const [templateName, langs] of Object.entries(templates)) {
  for (const [lang, data] of Object.entries(langs)) {
    const filename = `${templateName}_${lang}.html`;
    const filepath = path.join(outputDir, filename);
    fs.writeFileSync(filepath, data.body.trim());
    console.log(`✓ Written ${filename}`);
    count++;
  }
}

console.log(`\nExtraction complete. ${count} HTML files created in ${outputDir}`);