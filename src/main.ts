import './app.css'
// import App from './App.svelte'
// import Playground from './Playground.svelte'
import CodeEditor from './CodeEditor.svelte'

const app = new CodeEditor({
  target: document.getElementById('app')
})

export default app
