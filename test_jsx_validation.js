// Test JSX validation
const { testerAgent } = require('./Backend/src/services/agents/tester.agent.js');

const testFiles = {
  'src/App.jsx': 'function App() { return <div className={task-item ${status}}>Test</div>; }',
  'index.html': '<html></html>',
  'package.json': '{"name":"test"}'
};

testerAgent(testFiles).then(result => {
  console.log('Test result:', JSON.stringify(result, null, 2));
}).catch(err => {
  console.error('Error:', err.message);
});