import type { GameObj } from "kaplay";
import k from "../lib/kaplay";

const {
    // area,
    anchor,
    // circle,
    color,
    fixed,
    // Line,
    // polygon,
    pos,
    rect,
    stay,
    text,
    vec2,
} = k

export const setUIElements = (player: GameObj, map: GameObj) => {
    const ui = map.add([
        pos(0, 0),
        fixed(),
        stay()
    ])

    const hpBar = ui.add([
        rect(k.width() / 4, k.width() / 8, {
            fill: true,
            radius: 4
        }),
        color(0, 0 ,0),
        pos(k.width() * 1/4, k.height() / 4)
    ])

    const mpBar = ui.add([
        rect(k.width() / 4, k.width() / 8, {
            fill: true,
            radius: 4
        }),
        color(0, 0 ,0),
        pos(k.width() * 3/4, k.height() / 4)
    ])    

    hpBar.add([
        rect(k.width() / 4, k.width() / 8),
        color(150, 0, 0)
    ])

    mpBar.add([
        rect(k.width() / 4, k.width() / 8),
        color(0, 0, 150)
    ])    

    const expRing = ui.add([
        anchor('center'),
        text(player.lv, { align: 'center' }),
        pos(k.width() / 2, k.width() / 8)
    ])

    expRing.onDraw(() => {
        const exp = 10
        const target = 100
        const radius = 16

        const angle = (exp / target) * Math.PI * 2

        const curveVec = vec2(Math.cos(angle) * radius, Math.sin(angle) * radius)

        const points = [
            vec2(k.width() / 2, k.width() / 8),
            vec2(k.width() / 2, k.width() / 8),
        ]
    })

    // const expCircle = ui.add([
    //     anchor('center'),
    //     circle(15),
    //     pos(0,0),
    //     ,
    // ])
}