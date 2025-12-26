import kaplay from 'kaplay'

// Store
import { createStore } from 'jotai'
import { setting } from '../store/setting'
const defaultSetting = createStore()
const { width, height } = defaultSetting.get(setting)

// Initialize the game
const k = kaplay({
    width: width,
    height: height,
    letterbox: true,
    background: '#000000',
    broadPhaseCollisionAlgorithm: 'grid',
    narrowPhaseCollisionAlgorithm: 'box'
  })

if (
  // Make sure to load it only in development mode
  import.meta.env.DEV &&
  // I like to enable it only when ?inspector is available in the URL (this is optional)
  // This gives you an easy way to enable or disable it
  new URLSearchParams(window.location.search).get("inspector") !== null
) {
  console.log('MODE: DEV')
  import("@stanko/kaplay-inspector/dist/styles.css");
  import("@stanko/kaplay-inspector").then(({ default: init }) => {
    // Pass the "k" instance to the inspector
    init(k);
  });
}

console.log(import.meta.env)
console.log(window.location.search)

export default k