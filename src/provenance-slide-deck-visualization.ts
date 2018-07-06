import * as d3 from 'd3';

import './style.css';
import { IProvenanceSlide, IProvenanceSlidedeck } from './api';
import { ProvenanceSlide } from "./provenance-slide";

function firstArgThis(f: (...args: any[]) => any) {
    return function (this: any, ...args: any[]) {
        return f(this, ...args);
    };
}


export class ProvenanceSlidedeckVisualization {
    private _slideDeck: IProvenanceSlidedeck;
    private _root: d3.Selection<HTMLDivElement, any, null, undefined>;
    private _slideTable: d3.Selection<SVGElement, any, null, undefined>;

    private _tableHeight = 1000;
    private _tableWidth = 300;
    private _barHeight = 50;
    private _barWidth = 300;
    private _barPadding = 5;

    private _maxSlides = 20;

    private _linearScale = d3.scaleLinear()
        .domain([0, this._maxSlides])
        .range([0, this._maxSlides]);

    private _index = (slide: IProvenanceSlide): number => {
        return this._slideDeck.slides.indexOf(slide);
    }

    private onDelete = (slide: IProvenanceSlide) => {
        this._slideDeck.removeSlide(slide);
    }

    private onSelect = (slide: IProvenanceSlide) => {
        this._slideDeck.selectedSlide = slide;
    }

    private onAdd = () => {
      let slideDeck = this._slideDeck;
      const node = slideDeck.graph.current;
      const slide = new ProvenanceSlide(node.label, 1000, 0, [], node);
      slideDeck.addSlide(slide,
        slideDeck.selectedSlide
        ? slideDeck.slides.indexOf(slideDeck.selectedSlide) + 1
        : slideDeck.slides.length
      );
    }

    private dragstarted(draggedObject: any) {
        d3.select<any, any>(this).raise().classed("active", true);
    }

    private dragged = (that: any, draggedObject: any) => {
        d3.select<any, any>(that).attr("transform", (d: IProvenanceSlide, i: number) => {
            const index = this._index(d);
            const y = this._linearScale.invert(d3.event.y);
            console.log('d3.event.y' + d3.event.y + 'y' + y);
            return "translate(0," + y + ")";
        });
    }

    private dragended(draggedObject: any) {
        d3.select<any, any>(this).classed("active", false);
    }

    public update() {
        const interspace = (this._barHeight - this._barPadding);

        const oldNodes = this._slideTable
            .selectAll('g')
            .data<any>(this._slideDeck.slides, (d: IProvenanceSlide) => { return d.id; });

        const newNodes = oldNodes.enter();
        const that = this;
        const tableRow = newNodes.append('g')
            .attr("transform", function(d, i) { return "translate(0," + i * interspace + ")"; })

            .call((d3.drag() as any)
                // .origin((d: IProvenanceSlide) => {
                //     const index = this._index(d);
                //     const y = this._linearScale.invert(index);
                //     return {y:y};
                // })
                .on('start', this.dragstarted)
                .on('drag', firstArgThis(this.dragged))
                //  function(draggedObject: any) {
                    // this = Slide
                    // that = ProvenanceSlideViz
                    // draggedObject = g thing
                  //  return that.dragged(draggedObject)
                // )
                .on('end', this.dragended));

        const rowBorder = tableRow.append('rect')
            .attr('x', this._barPadding)
            .attr('y', this._barPadding)
            .attr('height', this._barHeight - 2 * this._barPadding)
            .attr('width', this._barWidth - 2 * this._barPadding)
            .attr('fill', 'red')
            .on('click', this.onSelect);

        tableRow.append('text')
            .attr('x', 2 * this._barPadding)
            .attr('y', this._barHeight/2)
            .attr("dy", ".35em")
            .attr('fill', 'black')
            .text((data) => { return data.name; });

        tableRow.append('rect')
            .attr('x', this._barWidth - this._barHeight + 2 * this._barPadding)
            .attr('y', this._barPadding + this._barPadding)
            .attr('height', this._barHeight - 4 * this._barPadding)
            .attr('width', this._barHeight - 4 * this._barPadding)
            .attr('fill', 'white')
            .attr('id', (data: IProvenanceSlide) => { return 'delete_' + data.id; })
            .on('click', this.onDelete);

        // tableRow.append('td').attr('class', 'slide__name')
        //     .text((data: IProvenanceSlide) => { return data.name; });
        // tableRow.append('td').attr('class', 'slide__delay')
        //     .text((data: IProvenanceSlide) => { return data.delay; });
        // tableRow.append('td').attr('class', 'slide__duration')
        //     .text((data: IProvenanceSlide) => { return data.duration; });

        // const deleteButton = tableRow.append('td').attr('class', 'slide__delete')
        //     .append<HTMLButtonElement>('button')
        //     .attr('id', (data: IProvenanceSlide) => { return 'delete_' + data.id; })
        //     .text('delete');
        // deleteButton.on('click', this.onDelete);

        // tableRow.call((d3.drag() as any)
        //     .on('start', this.dragstarted.bind(tableRow))
        //     .on('drag', this.dragged.bind(tableRow))
        //     .on('end', this.dragended.bind(tableRow)));

        oldNodes.exit().remove();
    }

    constructor(slideDeck: IProvenanceSlidedeck, elm: HTMLDivElement) {
        this._slideDeck = slideDeck;
        this._root = d3.select(elm);
        this._slideTable = this._root.append<SVGElement>('svg')
            .attr('class', 'slide__table')
            .attr('height', this._tableHeight).attr('width', this._tableWidth);
        this._slideTable.append('rect')
            .attr('x', 0).attr('y', 0).attr('height', this._tableHeight).attr('width', this._tableWidth).attr('fill', 'blue');

        slideDeck.on('slideAdded', () => this.update());
        slideDeck.on('slideRemoved', () => this.update());
        slideDeck.on('slidesMoved', () => this.update());
        slideDeck.on('slideSelected', () => this.update());

        const addSlideButton = this._root.append<HTMLButtonElement>('button').text('add slide');
        addSlideButton.on('click', this.onAdd);

        this.update();
    }
}