import * as d3 from 'd3';

import './style.css';
import { IProvenanceSlide, IProvenanceSlidedeck } from './api';
import { ProvenanceSlide } from "./provenance-slide";

function firstArgThis(f: (...args: any[]) => any) {
    return function (this: any, ...args: any[]) {
        return f(this, ...args);
    };
}

type IndexedSlide = { slide: IProvenanceSlide, startTime: number };

export class ProvenanceSlidedeckVisualization {
    private _slideDeck: IProvenanceSlidedeck;
    private _root: d3.Selection<HTMLDivElement, any, null, undefined>;
    private _slideTable: d3.Selection<SVGElement, any, null, undefined>;

    private _tableHeight = 1000;
    private _tableWidth = 300;
    private _barHeight = 50;
    private _barHeightTimeMultiplier = .01;
    private _barWidth = 300;
    private _barPadding = 5;

    private _maxSlides = 20;

    private _timeIndexedSlides: IndexedSlide[] = [];

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
      const slide = new ProvenanceSlide(node.label, 5000, 0, [], node);
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
        d3.select<any, any>(that).attr("transform", (slide: IProvenanceSlide) => {
            const originalY = this.previousSlidesHeight(slide);
            const draggedY = d3.event.y;
            const myIndex = this._slideDeck.slides.indexOf(slide);

            if (draggedY < originalY && myIndex > 0) {
                // check upwards                
                const previousSlide = this._slideDeck.slides[myIndex-1];
                let previousSlideCenterY = this.previousSlidesHeight(previousSlide) + (this.barTotalHeight(previousSlide) / 2);

                console.log('up ' + draggedY + ' prev: ' + previousSlideCenterY);
                if (draggedY < previousSlideCenterY) {
                    this._slideDeck.moveSlide(myIndex, myIndex -1);
                }

            } else if (draggedY > originalY && myIndex < this._slideDeck.slides.length - 1) {                
                // check downwards
                const nextSlide = this._slideDeck.slides[myIndex + 1];
                let nextSlideCenterY = this.previousSlidesHeight(nextSlide) + (this.barTotalHeight(nextSlide) / 2);

                console.log('down ' + draggedY + ' next: ' + nextSlideCenterY);
                if (draggedY > nextSlideCenterY) {
                    this._slideDeck.moveSlide(myIndex, myIndex + 1);
                }
            }

            return "translate(0," + d3.event.y + ")";
        });
    }

    private dragended = (that: any, draggedObject: any) => {
        d3.select<any, any>(that).classed("active", false)
            .attr("transform", (slide: IProvenanceSlide) => { 
                return "translate(0," + this.previousSlidesHeight(slide) + ")"; 
            });
    }

    private barDelayHeight(slide: IProvenanceSlide) {
        let calculatedHeight = this._barHeightTimeMultiplier * slide.delay;
        return Math.max(calculatedHeight, this._barPadding);
    }

    private barDurationHeight(slide: IProvenanceSlide) {
        let calculatedHeight = this._barHeightTimeMultiplier * slide.duration;
        return Math.max(calculatedHeight, this._barHeight);
    }

    private barTotalHeight(slide: IProvenanceSlide) {
        let calculatedHeight = this.barDelayHeight(slide) + this.barDurationHeight(slide);

        return calculatedHeight;
    }

    private previousSlidesHeight(slide: IProvenanceSlide) {        
        let myIndex = this._slideDeck.slides.indexOf(slide);
        let calculatedHeight = 0;

        for (let i = 0; i < myIndex; i++) { 
            calculatedHeight += this.barTotalHeight(this._slideDeck.slides[i]);
        }

        return calculatedHeight;
    }

    private updateTimeIndices(slideDeck: IProvenanceSlidedeck) {
        this._timeIndexedSlides = [];
        let timeIndex = 0;
        slideDeck.slides.forEach(slide => {
            this._timeIndexedSlides.push({slide: slide, startTime: timeIndex});
            timeIndex += slide.delay + slide.duration;
        });
    }

    public update() {
        this.updateTimeIndices(this._slideDeck);

        const allExistingNodes = this._slideTable.selectAll('g')
            .data<any>(this._slideDeck.slides, (d: IProvenanceSlide) => { return d.id; });
        
        const that = this;
        const newNodes = allExistingNodes.enter().append('g')
            .call((d3.drag() as any)
                .on('start', this.dragstarted)
                .on('drag', firstArgThis(this.dragged))
                .on('end', firstArgThis(this.dragended)));

        newNodes.append('rect')
            .attr('class', 'slides_delay_rect')
            .attr('x', this._barPadding)
            .attr('y', 0)
            .attr('width', this._barWidth - 2 * this._barPadding)
            .on('click', this.onSelect);

        newNodes.append('rect')
            .attr('class', 'slides_rect')
            .attr('x', this._barPadding)
            .attr('width', this._barWidth - 2 * this._barPadding)
            .on('click', this.onSelect);

        newNodes.append('text')
            .attr('class', 'slides_text')
            .attr('x', 2 * this._barPadding)
            .attr('y', this._barHeight/2)
            .attr("dy", ".35em");

        newNodes.append('rect')
            .attr('class', 'slides_delete_rect')
            .attr('x', this._barWidth - this._barHeight + 2 * this._barPadding)
            .attr('height', this._barHeight - 4 * this._barPadding)
            .attr('width', this._barHeight - 4 * this._barPadding)
            .attr('id', (data: IProvenanceSlide) => { return 'delete_' + data.id; })
            .on('click', this.onDelete);

        // Update all nodes
        const allNodes = newNodes.merge(allExistingNodes)
            .attr("transform", (slide: IProvenanceSlide) => { 
                return "translate(0," + this.previousSlidesHeight(slide) + ")"; 
            });

        allNodes.select('rect.slides_delay_rect')
            .attr('height', (slide: IProvenanceSlide) => { return this.barDelayHeight(slide); });

        allNodes.select('rect.slides_rect')
            .attr('selected', (slide:IProvenanceSlide)  => { return this._slideDeck.selectedSlide === slide; })
            .attr('y', (slide: IProvenanceSlide) => { return this.barDelayHeight(slide); })
            .attr('height', (slide: IProvenanceSlide) => { return this.barDurationHeight(slide); });
            
        allNodes.select('rect.slides_delete_rect')
            .attr('y', (slide: IProvenanceSlide) => { return this.barDelayHeight(slide); } );

        allNodes.select('text.slides_text')
            .text((slide: IProvenanceSlide) => { return slide.name; });

        allExistingNodes.exit().remove();
    }

    constructor(slideDeck: IProvenanceSlidedeck, elm: HTMLDivElement) {
        this._slideDeck = slideDeck;
        this._root = d3.select(elm);
        this._slideTable = this._root.append<SVGElement>('svg')
            .attr('class', 'slide__table')
            .attr('height', this._tableHeight).attr('width', this._tableWidth);
        this._slideTable.append('rect')
            .attr('class', 'slides_background_rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('height', this._tableHeight)
            .attr('width', this._tableWidth);

        slideDeck.on('slideAdded', () => this.update());
        slideDeck.on('slideRemoved', () => this.update());
        slideDeck.on('slidesMoved', () => this.update());
        slideDeck.on('slideSelected', () => this.update());

        const addSlideButton = this._root.append<HTMLButtonElement>('button').text('add slide');
        addSlideButton.on('click', this.onAdd);

        this.update();
    }
}