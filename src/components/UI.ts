import type { GameObj, KEventController } from "kaplay";
import k from "../lib/kaplay";
import { getOptionValue } from "../store/setting";
import { getGameStoreValue, gameStore, effectAtom } from "../store/game";
// import { door, cardLimit } from "../model/door";

import { rectangleGauge, ringGauge } from "./gauge";
import { createToolBar } from "./toolBar";
import type { effect } from "../model/effect";
import { drag, isPickable } from '../utils/UI'

const {
    add,
    area,
    anchor,
    color,
    drawText,
    drawRect,
    // drawLine,
    // drawSprite,
    easings,
    fixed,
    getData,
    get,
    // loop,
    layer,
    pos,
    polygon,
    rect,
    Rect,
    rgb,
    readd,
    setData,
    sprite,
    stay,
    scale,
    tween,
    text,
    vec2,
    // wait
} = k

let currentDragging: GameObj | null
let cardPageStart = 0
let cardPageEnd = 9

const effectTimer: KEventController[] = []

const displayTextOnBar = (bar:GameObj, barHeight: number, tileWidth: number ) => {
    const { unit, attribute, worldPos, area } = bar

    drawText({
        text: `${unit.attribute[attribute]}/${unit.max[attribute]}`,
        pos: vec2(worldPos.x, worldPos.y + ((barHeight - (tileWidth / 2)) / 2)),
        align: 'center',
        width: area.shape.width,
        size: tileWidth / 2
    })         
}

const placeCards = (
    wrapper: GameObj, 
    tileWidth: number, 
    defaultX: number, 
    deckHeight: number, 
    gap: number, 
    start: number, 
    end: number
) => {
    const { door, inventory } = getGameStoreValue()

    // Cards from inventory
    const cards = inventory.space.filter((s) => s && s.item.id.includes('card'))

    // Created sprites
    const oldCards = wrapper.get('card')

    // Pagination
    // const pages = Math.floor(door.card / maxCardsPerPage)
    const limit = 10
    const page = limit * Math.floor((end + 1) / limit)

    for(let card=start; card <= end; card++){
        const index = limit > (card + 1)? card : card - (limit * page)
        if(oldCards[index] && oldCards[index].data.id !== cards[index]?.item.id){
            // Replace sprite
        }

        if(!oldCards[index] && cards[index]){
            // Create sprite
            const mx = defaultX + ((tileWidth * 1.5) * (index + 1)) + (gap * (index + 1))
            const my = deckHeight - (k.height() * (1/10)) + gap
            const mapCard = wrapper.add([
                sprite('card'),
                area(),
                pos(mx, my),
                scale(0.5),
                fixed(),
                {
                    spawn: { x: mx, y: my },
                    data: cards[card]?.item,
                    chosen: false
                },
                // tags
                'card'
            ])

            mapCard.use(drag(mapCard))

            mapCard.onMousePress(() => {
                if(wrapper.hidden) return
                if('dragging' in mapCard && mapCard.dragging === true) return
                if(currentDragging && currentDragging.id === mapCard.id) return
                if(mapCard.isHovering() && isPickable(mapCard)){
                    currentDragging = mapCard
                    mapCard.pick()
                }                        
            })

            mapCard.onMouseRelease(() => {
                if('dragging' in mapCard && mapCard.dragging === true){
                    currentDragging = null
                    console.log('mapCard on drag end')
                    mapCard.trigger("dragEnd");
                    mapCard.dragging = false                             
                }
            }) 
            
            if(isPickable(mapCard)) {
                mapCard.onDrag(() => {
                    if('dragging' in mapCard && mapCard.dragging === true){
                        readd(mapCard)
                    }
                }) 
                
                mapCard.onDragEnd(() => {
                    // Check position
                    for(let i=0; i < door.card; i++){
                        const left = ((tileWidth * 3) * (i + 1)) + (gap * (i + 1))
                        const right = left + (tileWidth * 3)
                        const top = (k.height() / 2) - (tileWidth * 2.5)
                        const down = top + (tileWidth * 5)

                        const { x, y } = mapCard.worldPos

                        if(
                            x >= left && x <= right &&
                            y >= top && y <= down
                        ){
                            mapCard.pos = vec2(left, top)
                            mapCard.scale = vec2(1)
                            mapCard.unuse('drag')
                            mapCard.chosen = true
                            mapCard.untag('card')
                            mapCard.tag('chosen')

                            // If cards selected
                            const chosen = wrapper.get('chosen')
                            if(chosen.length === door.card){
                                // Merge and move to center
                                const center = { 
                                    x: (k.width() / 2) - ((tileWidth * 3) / 2),
                                    y: (k.height() / 2) - (tileWidth * 2.5)
                                }
                                
                                chosen.forEach(c => {
                                    tween(
                                        c.pos,
                                        vec2(center.x, center.y),
                                        0.5,
                                        (p) => c.pos = p,
                                        easings.easeInBounce
                                    )
                                })

                                const go = wrapper.get('proceed')

                                if(go.length){
                                    go[0].hidden = false
                                }else{
                                    // Display GO button
                                    const go = wrapper.add([
                                        text('GO', {
                                            size: tileWidth / 2
                                        }),
                                        area(),
                                        pos(center.x, center.y),
                                        stay(),
                                        // tags
                                        'proceed'
                                    ])

                                    go.onClick(() => {
                                        // Transition

                                        // Destroy GameObjs

                                        // Go to the next level
                                        // go('game')
                                    })                                    
                                }


                            }

                            break
                        }
                    }
                    
                    if(!mapCard.chosen){
                        // Put the card back
                        mapCard.pos = vec2(mapCard.spawn.x, mapCard.spawn.y)
                    }
                })
            }                
        }
    }
}

export const setEffectTimer = (effect: effect) => {
    const { tileWidth } = getOptionValue()

    const time = effect.time * 60 // frames
    const index = effectTimer.length > 0? effectTimer.length : 0
    const barHeight = k.height() / 20
    const hpBar = get('ui')[0].get('hp')[0]
    const player = get('player')[0]

    let percentage = 0

    const toCut: Record<string, number> = {}

    // Apply effect
    Object.entries(effect).forEach(([key, value]) => {
        const isInt = Number.isInteger(value)

        if(player.secondary[key]){
            toCut[key] = (isInt)?
                    value :    
                    Math.floor(player.secondary[key] * value)

            player.secondary[key] += toCut[key]
        }

        if(player.resist[key]) {
            player.resist[key] += value
            toCut[key] = value
        }

        if(key === 'hp' || key === 'mp'){
            toCut[key] = (isInt)?
                    value : 
                    Math.floor(player.max[key] * value)

            player.max[key] += toCut[key]       
        }else
        if(player.attribute[key]){
            toCut[key] = 
                (isInt)?
                    value : 
                    Math.floor(player.attribute[key] * value)   

            player.attribute[key] += toCut[key]
        }
    });

    effectTimer[index] = hpBar.onDraw(() => {
        const add = 1/time
        percentage = (percentage + add > 1)? 1 : percentage + add       

        console.log(percentage)
    
        drawRect({
            width: tileWidth / 2,
            height: tileWidth / 2,
            pos: vec2(((tileWidth / 2) * index) + (10 * index), -barHeight),
            color: rgb(50, 50, 50)
        })

        drawRect({
            width: tileWidth / 2,
            height: (tileWidth / 2) * percentage,
            pos: vec2(((tileWidth / 2) * index) + (10 * index), -barHeight + (tileWidth / 2)),
            color: rgb(133, 188, 233),
            anchor: 'botleft'
        })              

        if(percentage === 1){ 
            effectTimer[index].cancel()  
        
            // Remove effect
            const storedEffect = getGameStoreValue().effect

            storedEffect.splice(index, 1)

            gameStore.set(effectAtom, storedEffect)    
            
            Object.entries(effect).forEach(([key]) => {
                if(player.secondary[key]){
                    player.secondary[key] -= toCut[key]
                }

                if(player.resist[key]) player.resist[key] -= toCut[key]

                if(key === 'hp' || key === 'mp'){
                    player.max[key] -= toCut[key]

                    if(player.attribute[key] > player.max[key]) player.attribute[key] = player.max[key]
                }else
                if(player.attribute[key]){
                    player.attribute[key] -= toCut[key]
                }                
            });            
        }      
    })
}

export const setCardUI = (open: boolean) => {
    const { door } = getGameStoreValue()
    
    const cardsMenu = get('ui')[0].get('cards')

    const gap = 10

    const deckHeight = k.height() * (8/10)

    if(open){
        // Pause every thing
        get('player')[0].enterState('pause')
        get('enemy').forEach((e) => e.paused = true)        
    }else{
        // Un-Pause every thing
        get('player')[0].enterState('active')
        get('enemy').forEach((e) => e.paused = false)
    }

    setData('card_selecting', open)

    // Display or create menu
    if(cardsMenu.length){
        cardsMenu[0].hidden = !open
    }else{
        const ui = get('ui')[0]

        const { tileWidth } = getOptionValue()

        const wrapper = ui.add([
            rect(k.width(), k.height(), { fill: false }),
            pos(0, 0),
            fixed(),
            // tags
            'cards'
        ])

        wrapper.onDraw(() => {
            drawRect({
                width: k.width(),
                height: k.height(),
                pos: vec2(0, 0),
                color: rgb(0, 0, 0),
                opacity: 0.75
            })

            // Door info
            // Require cards (type)
            drawText({
                text: `Require cards: ${door.card}`,
                size: tileWidth,
                pos: vec2(tileWidth, tileWidth)
            })

            for(let i=0; i < door.card; i++){
                drawRect({
                    width: tileWidth * 3,
                    height: tileWidth * 5,
                    pos: vec2(((tileWidth * 3) * (i + 1)) + (gap * (i + 1)) , (k.height() / 2) - (tileWidth * 2.5)),
                    outline: { width: 4, color: k.rgb(door.type[i]) },
                    fill: false
                })
            }

            // Need sprites for cards

            // Card grid
            // Scrollable or pagination
            // const deckWidth = k.width() * (2/3)

            drawRect({
                width: k.width() * 0.75,
                height: k.height() * (2/10),
                pos: vec2(k.width() / 2, deckHeight),
                color: rgb(0, 0, 0),
                anchor: "center",
                outline: { width: 4, color: rgb(50, 50, 50) }
            })   
        })

        const defaultX = (k.width() / 2) - ((k.width() * 0.75) / 2)

        // If card objects created
        const cardsObj = wrapper.get('card')

        if(cardsObj.length){
            // Replace or hide cards
            placeCards(
                wrapper,
                tileWidth,
                defaultX,
                deckHeight,
                gap,
                cardPageStart,
                cardPageEnd
            )
        }else{
            placeCards(
                wrapper,
                tileWidth,
                defaultX,
                deckHeight,
                gap,
                cardPageStart,
                cardPageEnd                
            )
            
            // Place arrows 
            // Left
            const left = wrapper.add([
                polygon([
                        vec2(defaultX - (tileWidth + gap), deckHeight),
                        vec2(defaultX - gap, deckHeight - (tileWidth / 2)),
                        vec2(defaultX - gap, deckHeight + (tileWidth / 2)),
                    ],
                    {
                        colors: [
                            rgb(50, 50, 50),
                            rgb(75, 75, 75),
                            rgb(75, 75, 75),
                        ]
                    }
                ),
                area(),
                anchor('center'),
                // tags
                'page'                
            ]) 

            const rArrowX = defaultX + (k.width() * 0.75)

            // Right
            const right = wrapper.add([
                polygon([
                        vec2(rArrowX + gap + tileWidth, deckHeight),
                        vec2(rArrowX + gap, deckHeight - (tileWidth / 2)),
                        vec2(rArrowX + gap, deckHeight + (tileWidth / 2)),
                    ],
                    {
                        colors: [
                            rgb(50, 50, 50),
                            rgb(75, 75, 75),
                            rgb(75, 75, 75),
                        ]
                    }                    
                ),
                area(),
                anchor('center'),
                // tags
                'page'
            ])
            
            left.onClick(() => {
                if(cardPageStart > 0){
                    cardPageStart -= 1
                    cardPageEnd -= 1

                    placeCards(
                        wrapper,
                        tileWidth,
                        defaultX,
                        deckHeight,
                        gap,
                        cardPageStart,
                        cardPageEnd                
                    )                    
                }
            })

            right.onClick(() => {
                const cards = getGameStoreValue().inventory.space.filter((s) => s && s.item.id.includes('card'))

                if((cardPageEnd + 1) < cards.length){
                    cardPageStart += 1
                    cardPageEnd += 1

                    placeCards(
                        wrapper,
                        tileWidth,
                        defaultX,
                        deckHeight,
                        gap,
                        cardPageStart,
                        cardPageEnd                
                    )                     
                }
            })
        }       
    }
}

export const setUIElements = (player: GameObj) => {
    const { tileWidth } = getOptionValue()

    const ui = add([
        area({ shape: new Rect(vec2(0), k.width(), k.height()) }),
        pos(0, 0),
        fixed(),
        layer('fg'),
        // stay(),
        'ui'
    ])

    const barWidth = k.width() / 4
    const barHeight = k.height() / 20  

    ui.onClick(() => {
        const isHovering = getData('hovering')
        console.log('ui wrapper clicked', isHovering)        
        if(!isHovering) setData('listOpen', false)
    })

    // #region Enemy Health bar
    ui.onDraw(() => {
        const targeting = getData('targeting', null)

        if(!targeting) return

        const target = JSON.parse(targeting)

        const barX = (k.width() / 2) - (barWidth / 2)
        const barY = tileWidth

        const percentage = target.current / target.max      

        // Enemy name
        drawText({
            text: `LV${target.lv} ${target.name}`,
            pos: vec2(barX, tileWidth / 2),
            align: 'left',
            width: barWidth,
            size: tileWidth / 2
        })  

        // outer bar
        drawRect({
            width: barWidth,
            height: barHeight,
            pos: vec2(barX, barY),
            color: rgb(50, 50 ,50),
            // radius
        })
        
        // Inner bar
        drawRect({
            width: barWidth * percentage,
            height: barHeight,
            pos: vec2(barX + barWidth, barY),
            color: rgb(150, 0 ,0),
            // radius,
            anchor: 'topright'
        })       

        // HP number
        drawText({
            text: `${target.current}/${target.max}`,
            pos: vec2(barX, barY + ((barHeight - (tileWidth / 2)) / 2)),
            align: 'center',
            width: barWidth,
            size: tileWidth / 2
        })            
    })
    // #endregion

    // #region HP, MP, LV UI
    // Place invisible area for both HP and MP bar.
    const hpBar = rectangleGauge({
        parent: ui,
        direction: 'horizontal',
        position: vec2(k.width() * 0.2, k.height() * 5/6),
        color: {
            inner: rgb(150, 0 ,0),
            outer: rgb(50, 50 ,50)
        },
        clickable: true,
        reverse: true,
        width: barWidth,
        height: barHeight,
        reference: {
            unit: player,
            attribute: 'hp'
        },
        border: {
            width: tileWidth / 4,
            color: rgb(50, 50, 50)
        },
        action: {
            event: 'draw',
            call: () => {
                if(hpBar.bar?.displayText){
                    displayTextOnBar(hpBar.bar, barHeight, tileWidth)
                }
            }
        },        
        option: { displayText: false }        
    })

    const mpBar = rectangleGauge({
        parent: ui,
        direction: 'horizontal',
        position: vec2(k.width() * 0.55, k.height() * 5/6),
        color: {
            inner: rgb(0, 0, 150),
            outer: rgb(50, 50, 50)
        },
        clickable: true,
        width: barWidth,
        height: barHeight,
        reference: {
            unit: player,
            attribute: 'mp'
        },
        action: {
            event: 'draw',
            call: () => {
                if(mpBar.bar?.displayText){
                    displayTextOnBar(mpBar.bar, barHeight, tileWidth)       
                }
            }
        },          
        border: {
            width: tileWidth / 4,
            color: rgb(50, 50, 50)
        },
        option: { displayText: false }        
    })

    hpBar.bar?.onClick(() => {
        const isHovering = getData('hovering') 
        if(isHovering) return

        console.log('hp', isHovering)
        hpBar.bar.displayText = !hpBar.bar.displayText
    }, 'left')

    mpBar.bar?.onClick(() => {
        const isHovering = getData('hovering') 
        if(isHovering) return
                
        console.log('mp')
        mpBar.bar.displayText = !mpBar.bar.displayText
    }, 'left')      

    // const hpBar = ui.add([
    //     rect(barWidth, barHeight, {
    //         fill: true,
    //         radius: 4
    //     }),
    //     area(),
    //     color(150, 0 ,0),
    //     pos(k.width() * 0.2, k.height() * 5/6),
    // ])

    // const mpBar = ui.add([
    //     rect(barWidth, barHeight, {
    //         fill: true,
    //         radius: 4
    //     }),
    //     area(),
    //     color(50, 50, 50),
    //     pos(k.width() * 0.55, k.height() * 5/6),
    // ])    

    // hpBar.add([
    //     rect(0, barHeight),
    //     color(50, 50, 50),
    //     'HP'
    // ])

    // mpBar.add([
    //     rect(barWidth, barHeight),
    //     color(0, 0, 150),
    //     'MP'
    // ])      

    // EXP gauge
    ringGauge({
        parent: ui,
        radius: Math.floor(k.width() / 40),
        position: vec2(k.width() / 2, k.height() * 5/6),
        color: {
            inner: rgb(0, 150, 0),
            outer: rgb(50, 50, 50)
        },
        reference: {
            unit: player,
            attribute: 'exp',
        },
        option: { text: 'lv' }        
    })

    createToolBar(
        ui,
        k.width()/ 2, 
        barHeight,
        vec2(k.width()/ 2, k.height() - barHeight),
        false,
        {
            width: tileWidth / 4,
            color: rgb(50, 50, 50)
        }
    )
    // #endregion 
}