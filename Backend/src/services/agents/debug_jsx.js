const line = "function App() { return <div className={task-item ${status}}>Test</div>; }";
console.log("Original line:", line);

const patterns = [
  /className=\{([^}]*?)\$\{([^}]*?)\}/g,
  /className=\{([^{}]*(?:\$\{[^{}]*\}[^{}]*)*)\}/g,
  /className=\{([^}]*)\}/g
];

patterns.forEach((regex, i) => {
  console.log(`\nPattern ${i + 1}:`, regex);
  let match;
  while ((match = regex.exec(line)) !== null) {
    console.log("Match:", match[0]);
    for (let j = 1; j < match.length; j++) {
      console.log(`Group ${j}:`, match[j]);
    }
  }
});
