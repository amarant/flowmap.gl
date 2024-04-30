/*
 * Copyright (c) Flowmap.gl contributors
 * Copyright (c) 2018-2020 Teralytics
 * SPDX-License-Identifier: Apache-2.0
 */

import {Layer, UpdateParameters, picking, project32} from '@deck.gl/core';
import {Geometry, Model} from '@luma.gl/engine';
import FragmentShader from './FlowCirclesLayerFragment.glsl';
import VertexShader from './FlowCirclesLayerVertex.glsl';
import {FlowCirclesLayerAttributes, RGBA} from '@flowmap.gl/data';
import {LayerProps} from '../types';

export type FlowCirclesDatum = Record<string, unknown>;

export interface Props extends LayerProps {
  id: string;
  opacity?: number;
  pickable?: boolean;
  emptyColor?: RGBA;
  outlineEmptyMix?: number;
  getColor?: (d: FlowCirclesDatum) => RGBA;
  getPosition?: (d: FlowCirclesDatum) => [number, number];
  getInRadius?: (d: FlowCirclesDatum) => number;
  getOutRadius?: (d: FlowCirclesDatum) => number;
  data: FlowCirclesDatum[] | FlowCirclesLayerAttributes;
  updateTriggers?: {[key: string]: Record<string, unknown>};
}

const DEFAULT_COLOR = [0, 0, 0, 255];
const DEFAULT_EMPTY_COLOR = [255, 255, 255, 255];
const DEFAULT_OUTLINE_EMPTY_MIX = 0.4;

class FlowCirclesLayer extends Layer<Props> {
  static layerName = 'FlowCirclesLayer';

  static defaultProps = {
    ...Layer.defaultProps,
    getColor: {type: 'accessor', value: DEFAULT_COLOR},
    emptyColor: {type: 'accessor', value: DEFAULT_EMPTY_COLOR},
    outlineEmptyMix: {type: 'accessor', value: DEFAULT_OUTLINE_EMPTY_MIX},
    getPosition: {type: 'accessor', value: (d: FlowCirclesDatum) => d.position},
    getInRadius: {type: 'accessor', value: 1},
    getOutRadius: {type: 'accessor', value: 1},
    parameters: {
      depthTest: false,
    },
  };

  declare state: Layer['state'] & {
    model: Model;
  };

  constructor(props: Props) {
    super(props);
  }

  getShaders() {
    return super.getShaders({
      vs: VertexShader,
      fs: FragmentShader,
      modules: [project32, picking],
    });
  }

  initializeState() {
    this.getAttributeManager()?.addInstanced({
      instancePositions: {
        size: 3,
        type: 'float64',
        fp64: this.use64bitPositions(),
        transition: true,
        accessor: 'getPosition',
      },
      instanceInRadius: {
        size: 1,
        transition: true,
        accessor: 'getInRadius',
        defaultValue: 1,
      },
      instanceOutRadius: {
        size: 1,
        transition: true,
        accessor: 'getOutRadius',
        defaultValue: 1,
      },
      instanceColors: {
        size: 4,
        transition: true,
        type: 'uint8',
        accessor: 'getColor',
        defaultValue: DEFAULT_COLOR,
      },
    });
  }

  updateState({props, oldProps, context, changeFlags}: UpdateParameters<this>) {
    super.updateState({props, oldProps, context, changeFlags});
    if (changeFlags.extensionsChanged) {
      this.state.model?.destroy();
      this.setState({model: this._getModel()});
      this.getAttributeManager()?.invalidateAll();
    }
  }

  draw({uniforms}: any) {
    const {emptyColor, outlineEmptyMix} = this.props;
    this.state.model.setUniforms({
      ...uniforms,
      emptyColor,
      outlineEmptyMix,
    });
    this.state.model.draw(this.context.renderPass);
  }

  _getModel() {
    // a square that minimally cover the unit circle
    const positions = [-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0];

    return new Model(this.context.device, {
      id: this.props.id,
      ...this.getShaders(),
      bufferLayout: this.getAttributeManager()!.getBufferLayouts(),
      geometry: new Geometry({
        topology: 'triangle-fan-webgl',
        vertexCount: 4,
        attributes: {
          positions: {size: 3, value: new Float32Array(positions)},
        },
      }),
      isInstanced: true,
    });
  }
}

export default FlowCirclesLayer;
