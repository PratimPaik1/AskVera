import { testerAgent } from "./tester.agent.js";

const testFiles = {
  "src/App.jsx": "function App() { return <div className={task-item ${status}}>Test</div>; }",
  "index.html": "<html></html>",
  "package.json": "{\"name\":\"test\"}"
};

try {
  const result = await testerAgent(testFiles);
  console.log("Test result:", JSON.stringify(result, null, 2));
} catch (error) {
  console.error("Error:", error.message);
}
