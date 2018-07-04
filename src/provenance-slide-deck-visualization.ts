import * as d3 from 'd3';
const Sortable = require('sortablejs');

import './style.css';
import { ProvenanceSlidedeck } from './provenance-slide-deck';
import { ProvenanceSlide } from './provenance-slide';

export class ProvenanceSlidedeckVisualization {
  private _slideDeck: ProvenanceSlidedeck;
  private _root: d3.Selection<HTMLDivElement, any, null, undefined>;
  private _slideTable: d3.Selection<HTMLTableElement, any, null, undefined>;

  private static slideTemplate: (data: ProvenanceSlide) => string = (data) => {
    return `      
      <td class="slide__name">${data.name}</td>
      <td class="slide__delay">Delay: ${data.delay}</td>
      <td class="slide__duration">Duration: ${data.duration}</td>
      <td><button id="delete" class="slide__delete">Delete</button></td>
    `;
  }

  private onDelete = (slide: ProvenanceSlide) => {
    this._slideDeck.removeSlide(slide);
  }

  public update() {
    this._slideTable.classed('slide_table', true);

    const oldNodes = this._slideTable
      .selectAll('tr')
      .data(this._slideDeck.slides);

    const newNodes = oldNodes
      .enter()
      .append('tr');

    oldNodes.merge(newNodes).html(ProvenanceSlidedeckVisualization.slideTemplate);

    const sortable = Sortable.create(this._slideTable.node(), {});
  }

  constructor(slideDeck: ProvenanceSlidedeck, elm: HTMLDivElement) {
    this._slideDeck = slideDeck;
    this._root = d3.select(elm);
    this._slideTable = this._root.append<HTMLTableElement>('table');

    this.update();
  }


}