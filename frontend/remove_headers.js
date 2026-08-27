const fs = require('fs');
const path = require('path');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Regular expression to match <header> ... </header>
    // Including any attributes on <header> and all content inside
    // Use non-greedy match .*? with s flag (dotAll) so . matches newlines
    const headerRegex = /<header[\s\S]*?<\/header>/g;
    
    if (headerRegex.test(content)) {
        console.log(`Removing header from ${filePath}`);
        // Remove the header block
        content = content.replace(headerRegex, '');
        fs.writeFileSync(filePath, content, 'utf8');
    }
}

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            walkDir(fullPath);
        } else if (fullPath.endsWith('.tsx') && !fullPath.includes('layout.tsx')) {
            processFile(fullPath);
        }
    }
}

walkDir('src/app');
console.log('Done.');
