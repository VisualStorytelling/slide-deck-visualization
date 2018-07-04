import * as d3 from 'd3';
const Sortable = require('sortablejs');

import './style.css';
import { ProvenanceSlidedeck } from './provenance-slide-deck';
import { ProvenanceSlide } from './provenance-slide';

export class ProvenanceSlidedeckVisualization {
  private _slideDeck: ProvenanceSlidedeck;
  private _root: d3.Selection<HTMLDivElement, any, null, undefined>;
  private static slideTemplate: (data: ProvenanceSlide) => string = data => {
    return `
      <header>${data.name}</header>
      <span class="slide__name">${data.name}</span>
      <span class="slide__delay">Delay: ${data.delay}</span>
      <span class="slide__duration">Duration: ${data.duration}</span>
      <button class="slide__delete">Delete</button>
    `;
  }

  public update() {
    this._root.classed('slidedeck', true);

    const oldNodes = this._root
      .selectAll('div')
      .data(this._slideDeck.slides);

    const newNodes = oldNodes
      .enter()
      .append('div');

    oldNodes.merge(newNodes).html(ProvenanceSlidedeckVisualization.slideTemplate);

    const sortable = Sortable.create(this._root.node(), {});
  }

  constructor(slideDeck: ProvenanceSlidedeck, elm: HTMLDivElement) {
    this._slideDeck = slideDeck;
    this._root = d3.select(elm);
    this.update();
  }


}