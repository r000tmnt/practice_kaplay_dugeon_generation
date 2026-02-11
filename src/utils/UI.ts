import type { GameObj } from "kaplay";
import k from "../lib/kaplay";
import type { pickableItem } from '../model/item'

const {
    mousePos,
    vec2,
} = k

// #region Utils
export const arcPoint = (t: number, radius: number) => {
    const angle = t * Math.PI * 2

    return vec2(Math.cos(angle) * radius, Math.sin(angle) * radius)    
}

// Custom drag component
// Reference: https://play.kaplayjs.com/?example=drag
export const drag = (self: GameObj) => {
    let offset = vec2(0)

    return {
        // Name of the component
        id: "drag",
        // This component requires the "pos" and "area" component to work
        require: ["pos", "area"],
        dragging: false,
        pick() {
            // Set the current global dragged object to this
            this.dragging = true;
            offset = mousePos().sub(self.pos);

            self.trigger("drag");
        },
        // "update" is a lifecycle method gets called every frame the obj is in scene
        update() {
            if (this.dragging) {
                self.pos = mousePos().sub(offset);
                self.trigger("dragUpdate");
            }
        },
        onDrag(action: () => void) {
            return self.on("drag", action);
        },
        onDragUpdate(action: () => void) {
            return self.on("dragUpdate", action);
        },
        onDragEnd(action: () => void) {
            return self.on("dragEnd", action);
        },
    }
}

export const isPickable = (obj: unknown): obj is pickableItem => {
    const result = 
        typeof obj === 'object' && 
        obj !== null && 
        'pick' in obj && 
        typeof (obj as any).pick === 'function' && 
        'onDrag' in obj &&
        typeof (obj as any).onDrag === 'function' &&
        'onDragUpdate' in obj &&
        typeof (obj as any).onDragUpdate === 'function';  
        
    return result
}
// #endregion  