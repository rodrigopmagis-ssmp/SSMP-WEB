const fs = require('fs');
const parser = require('@babel/parser');

const code = fs.readFileSync(process.argv[2], 'utf-8');

try {
    parser.parse(code, {
        sourceType: 'module',
        plugins: [
            'jsx',
            'typescript'
        ]
    });
    console.log('Parsed successfully!');
} catch (err) {
    console.error('Babel Parsing Error:');
    console.error(err.message);
    if (err.loc) {
        console.error(`Line: ${err.loc.line}, Col: ${err.loc.column}`);
        const lines = code.split('\n');
        console.error('---');
        for (let i = Math.max(0, err.loc.line - 5); i < Math.min(lines.length, err.loc.line + 5); i++) {
            if (i === err.loc.line - 1) {
                console.error(`> ${i + 1} | ${lines[i]}`);
                console.error(`  ${' '.repeat(err.loc.column + String(i + 1).length + 2)}^`);
            } else {
                console.error(`  ${i + 1} | ${lines[i]}`);
            }
        }
        console.error('---');
    }
}
