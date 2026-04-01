import k from '../lib/kaplay'

const { 
    loadSprite,
    loadSpriteAtlas,
    loadShaderURL,
} = k

export const loadAssets = async () => {
    // loadSpriteAtlas('player/demo_player_spritesheet.png', 'player/demo_player_spritesheet.json')
    loadSpriteAtlas('player/demo_player_68x68_alter.png', 'player/demo_player_spritesheet.json')
    loadSpriteAtlas('enemy/demo_enemy_spritesheet.png', 'enemy/demo_enemy_spritesheet.json')

    loadSprite('card', 'map/card.png')

    loadSprite('pot', 'map/demo_pot_16x16.png', {
        sliceX: 2,
        sliceY: 2,
        anims: {
            break: { from: 1, to: 2, loop: false }
        }
    })        

    loadSprite('item', 'map/demo_item.png', {
        sliceX: 5,
        sliceY: 2,
        anims: {
            open: { from: 3, to: 4, loop: false }
        }
    })

    loadSprite('equipment', 'map/equipment.png', {
        sliceX: 3,
        sliceY: 3
    })        

    loadSprite('shrine', 'map/shrine.png', {
        sliceX: 2,
    })        

    loadShaderURL("fadeTransition", null, 'shaders/fade_transition.frag')
}