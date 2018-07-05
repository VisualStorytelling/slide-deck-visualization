import * as d3 from 'd3';
const Sortable = require('sortablejs');

import './style.css';
import { IProvenanceSlide, IProvenanceSlidedeck } from './api';

export class ProvenanceSlidedeckVisualization {
  private _slideDeck: IProvenanceSlidedeck;
  private _root: d3.Selection<HTMLDivElement, any, null, undefined>;
  private _slideTable: d3.Selection<HTMLTableElement, any, null, undefined>;

  private onDelete = (slide: IProvenanceSlide) => {
    this._slideDeck.removeSlide(slide);
  }

  private onSelect = (slide: IProvenanceSlide) => {
    this._slideDeck.selectedSlide = slide;
  }

  private onAdd = () => {
    this._slideDeck.addSlide();
  }

  public update() {
    const oldNodes = this._slideTable
      .selectAll('tr')
      .data(this._slideDeck.slides);

    const newNodes = oldNodes.enter();

    const tableRow = newNodes.append('tr')
      .on('click', this.onSelect);
    tableRow.append('td').attr('class', 'slide__name')
      .text((data: IProvenanceSlide) => { return data.name; });
    tableRow.append('td').attr('class', 'slide__delay')
      .text((data: IProvenanceSlide) => { return data.delay; });
    tableRow.append('td').attr('class', 'slide__duration')
      .text((data: IProvenanceSlide) => { return data.duration; });
    const deleteButton = tableRow.append('td').attr('class', 'slide__delete')      
      .append<HTMLButtonElement>('button')
      .attr('id', (data: IProvenanceSlide) => {return 'delete_' + data.id; })
      .text('delete');
    deleteButton.on('click', this.onDelete);

    oldNodes.exit().remove();

    const sortable = Sortable.create(this._slideTable.node(), {});
  }

  constructor(slideDeck: IProvenanceSlidedeck, elm: HTMLDivElement) {
    this._slideDeck = slideDeck;
    this._root = d3.select(elm);
    this._slideTable = this._root.append<HTMLTableElement>('table').attr('class', 'slide__table');
    slideDeck.on('slideAdded', () => this.update());
    slideDeck.on('slideRemoved', () => this.update());
    slideDeck.on('slidesMoved', () => this.update());
    slideDeck.on('slideSelected', () => this.update());

    const addSlideButton = this._root.append<HTMLButtonElement>('button').text('add slide');
    addSlideButton.on('click', this.onAdd);

    this.update();
  }
}