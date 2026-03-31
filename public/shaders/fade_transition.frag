precision mediump float;

uniform float u_progress; // 0.0 = fully visible, 1.0 = fully black

vec4 frag(vec2 pos, vec2 uv, vec4 color, sampler2D tex) {
    // Sample the current scene color
    vec4 sceneColor = texture2D(tex, uv);
    
    // Calculate fade amount (smoothstep for smooth transition)
    float fade = smoothstep(0.0, 1.0, u_progress);
    
    // Mix the scene color with black based on fade amount
    vec4 finalColor = mix(sceneColor, vec4(0.0, 0.0, 0.0, 1.0), fade);
    return finalColor;
}