const fs = require('fs');
const path = require('path');

const publicPortalsDir = path.join(__dirname, '..', 'public', 'portals');
fs.mkdirSync(publicPortalsDir, { recursive: true });

function transform(fileName) {
  const filePath = path.join(__dirname, '..', fileName);
  let text = fs.readFileSync(filePath, 'utf8');

  // Replace hardcoded localhost API base
  text = text.replaceAll('http://localhost:3001/api', '/api');

  // Replace hardcoded socket io url
  text = text.replaceAll("io('http://localhost:3001')", "io(window.location.origin)");
  text = text.replaceAll('io("http://localhost:3001")', "io(window.location.origin)");
  text = text.replaceAll("http://localhost:3001", "");

  // Replace legacy index.html navigation
  text = text.replaceAll("window.location.href = 'index.html'", "window.top.location.href = '/'");
  text = text.replaceAll('window.location.href = "index.html"', 'window.top.location.href = "/"');

  // Ensure socket.io client script CDN is used with fallback
  text = text.replaceAll(
    '<script src="/socket.io/socket.io.js"></script>',
    '<script src="https://cdn.socket.io/4.8.1/socket.io.min.js"></script>'
  );

  const outPath = path.join(publicPortalsDir, fileName);
  fs.writeFileSync(outPath, text, 'utf8');
  console.log(`Successfully generated public/portals/${fileName}`);
}

transform('student.html');
transform('teacher.html');
transform('admin.html');
