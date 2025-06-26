// Test for regex infinite loop issue
const pattern = 'test';
const text = 'this is a test line with test content';

// This can cause infinite loop if not handled properly
const searchRegex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');

console.log('Testing regex...');
let match;
let count = 0;
while ((match = searchRegex.exec(text)) !== null) {
  count++;
  console.log(`Match ${count}: ${match[0]} at position ${match.index}`);
  
  // Safety check to prevent infinite loop
  if (count > 100) {
    console.error('Potential infinite loop detected!');
    break;
  }
  
  // The key issue: if the regex matches an empty string, lastIndex doesn't advance
  if (match[0] === '') {
    searchRegex.lastIndex++;
  }
}
console.log('Regex test completed');