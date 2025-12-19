import { lazy, useEffect } from 'react'
import './App.css'
import initGame from './scene/game'

// store
import { useAtom } from 'jotai'
// import { gameState } from './store/game'
import { setting } from './store/setting'

// Components
// Data
// import playerData from './data/player.json'

// Game init
initGame()

function App() {
  const [param, setParam] = useAtom(setting)
  const gameWidth = param.width
  const gameHeight = param.height
  // const menuOpen = useSelector(state => state.game.menuOpen)
  // const label = useSelector((state) => state.game.textLabel)
  // const dialogue = useSelector(state => state.dialogue)  
  // const dispatch = useDispatch()

  // #region Scale UI
  // Reference from: https://jslegenddev.substack.com/p/how-to-display-an-html-based-ui-on
  const scaleUI = () => {
    const value = Math.min(
      window.innerWidth / gameWidth,
      window.innerHeight / gameHeight
    )

    setParam(prev => ({
      ...prev,
      scale: value
    }))

    console.log('window.innerHeight', window.innerHeight)
    console.log('gameHeight', gameHeight)

    setParam(prev => ({
      ...prev,
      uiOffsetV: (window.innerWidth - gameWidth) / 2,
      uiOffsetH: (window.innerHeight > gameHeight)? (window.innerHeight - gameHeight) / 2 : 0
    }))
    
    document.documentElement.style.setProperty("--scale", String(value));
  }

  useEffect(() => {
    window.addEventListener('resize', scaleUI)

    // Fire the function on the first time
    scaleUI()        

    // Store player data


    // Cleanup: Remove event listener on component unmount
    return () => {
      window.removeEventListener('resize', scaleUI)
    }
  }, [])
  // #endregion


  return (
    <>
      {/* {
        menuOpen > 0?
        <Menu /> : null
      }

      {
        label.length || dialogue.length?
        <Dialogue /> : null
      } */}
    </>
  )
}

export default App