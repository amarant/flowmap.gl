/*
 * Copyright (c) Flowmap.gl contributors
 * Copyright (c) 2018-2020 Teralytics
 * SPDX-License-Identifier: Apache-2.0
 */
export default `\
#version 300 es
#define SHADER_NAME flow-circles-layer-fragment-shader
#define SOFT_OUTLINE 0.05
#define EPS 0.05
precision highp float;

in vec4 vColor;
in vec2 unitPosition;
in float unitInRadius;
in float unitOutRadius;

uniform vec4 emptyColor;
uniform float outlineEmptyMix;

out vec4 color;

float when_gt(float x, float y) {
  return max(sign(x - y), 0.0);
}

void main(void) {
  geometry.uv = unitPosition;
  float distToCenter = length(unitPosition);
  if (distToCenter > 1.0) {
    discard;
  }

  // See https://stackoverflow.com/questions/47285778
  vec4 ringColor = mix(
    emptyColor / 255., vColor,
    when_gt(unitInRadius, unitOutRadius)
  );
  vec4 outlineColor = mix(
    mix(vColor, emptyColor / 255., outlineEmptyMix),
    vColor,
    when_gt(unitInRadius, unitOutRadius)
  );
  
  float innerR = min(unitInRadius, unitOutRadius) * (1.0 - SOFT_OUTLINE);
  
  // Inner circle
  float step2 = innerR - 2.0 * EPS; 
  float step3 = innerR - EPS;
  
  // Ring
  float step4 = innerR;
  // float step5 = 1.0 - SOFT_OUTLINE - EPS;
  // float step6 = 1.0 - SOFT_OUTLINE;
  float step5 = 1.0 - 5.0 * EPS;
  float step6 = 1.0;
  
  color = vColor;
  color = mix(color, emptyColor / 255., smoothstep(step2, step3, distToCenter));
  color = mix(color, ringColor, smoothstep(step3, step4, distToCenter));
  color = mix(color, outlineColor, smoothstep(step5, step6, distToCenter));
  // color = mix(color, emptyColor / 255., smoothstep(step6, 1.0, distToCenter));
  color.a = vColor.a;
  color.a *= smoothstep(0.0, SOFT_OUTLINE, 1.0 - distToCenter);
  DECKGL_FILTER_COLOR(color, geometry);
}
`;
