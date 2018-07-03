import * as d3 from 'd3';
import { ProvenanceSlidedeck } from './provenance-slide-deck';
import { ProvenanceSlide } from './provenance-slide';


export class ProvenanceSlidedeckVisualization {
  private _slideDeck: ProvenanceSlidedeck;
  private _root: d3.Selection<HTMLDivElement, any, null, undefined>;
  private static slideTemplate: (data: ProvenanceSlide) => string = data => `
    <div class="slide">
      <span class="slide__name">${data.name}</span>
      
    </div>
  `

  public update() {
    this._root
      .classed('slidedeck', true)
      .selectAll('div')
      .data(this._slideDeck.slides)
      .enter()
      .append('div')
      .html(ProvenanceSlidedeckVisualization.slideTemplate);
  }

  constructor(slideDeck: ProvenanceSlidedeck, elm: HTMLDivElement) {
    this._slideDeck = slideDeck;
    this._root = d3.select(elm);
    this.update();
  }


}