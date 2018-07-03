import * as d3 from 'd3';

import { ProvenanceSlidedeck } from './provenance-slide-deck';
import { ProvenanceSlide } from './provenance-slide';


export class ProvenanceSlidedeckVisualization {
  private _slideDeck: ProvenanceSlidedeck;
  private _root: d3.Selection<HTMLDivElement, any, null, undefined>;
  private static slideTemplate: (data: ProvenanceSlide) => string = data => `
      <header>test</header>
      <span class="slide__name">${data.name}</span>
  `

  public update() {
    this._root.classed('slidedeck', true);

    const oldNodes = this._root
      .selectAll('div')
      .data(this._slideDeck.slides);

    const newNodes = oldNodes
      .enter()
      .append('div')
      .attr("draggable", true);

    oldNodes.merge(newNodes).html(ProvenanceSlidedeckVisualization.slideTemplate);
  }

  constructor(slideDeck: ProvenanceSlidedeck, elm: HTMLDivElement) {
    this._slideDeck = slideDeck;
    this._root = d3.select(elm);
    this.update();
  }


}