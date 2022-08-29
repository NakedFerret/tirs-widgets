import './app.css'
// import App from './App.svelte'
import Playground from './Playground.svelte'

const app = new Playground({
  target: document.getElementById('app')
})

export default app
