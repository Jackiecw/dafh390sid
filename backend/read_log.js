const fs = require('fs');
try {
    const content = fs.readFileSync('test_error.log', 'utf8');
    console.log(content);
} catch (e) {
    console.error('Error reading log:', e);
}
