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
    background: '#000000'
  })

export default k