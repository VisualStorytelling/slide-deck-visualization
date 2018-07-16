import * as d3 from 'd3';

import './style.css';

import { IProvenanceSlide, ProvenanceSlide, IProvenanceSlidedeck } from '@visualstorytelling/provenance-core';

function firstArgThis(f: (...args: any[]) => any) {
    return function (this: any, ...args: any[]) {
        return f(this, ...args);
    };
}

type IndexedSlide = { slide: IProvenanceSlide, startTime: number };

export class SlideDeckVisualization {
    private _slideDeck: IProvenanceSlidedeck;
    private _root: d3.Selection<HTMLDivElement, any, null, undefined>;
    private _slideTable: d3.Selection<SVGElement, any, null, undefined>;

    private _tableHeight = 1000;
    private _tableWidth = 300;
    private _minimumSlideDuration = 3100;
    private _barHeightTimeMultiplier = .01;
    private _barWidth = 300;
    private _barPadding = 5;
    private _resizebarheight = 5;

    private _maxSlides = 20;

    private _timeIndexedSlides: IndexedSlide[] = [];

    private _index = (slide: IProvenanceSlide): number => {
        return this._slideDeck.slides.indexOf(slide);
    }

    private onDelete = (slide: IProvenanceSlide) => {
        this._slideDeck.removeSlide(slide);
    }

    private onSelect = (slide: IProvenanceSlide) => {
        if (d3.event.defaultPrevented) return;

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

    private moveDragStarted(draggedObject: any) {
        d3.select<any, any>(this).raise().classed("active", true);
    }

    private moveDragged = (that: any, draggedObject: any) => {
        d3.select<any, any>(that).attr("transform", (slide: IProvenanceSlide) => {
            const originalY = this.previousSlidesHeight(slide);
            const draggedY = d3.event.y;
            const myIndex = this._slideDeck.slides.indexOf(slide);

            if (draggedY < originalY && myIndex > 0) {
                // check upwards                
                const previousSlide = this._slideDeck.slides[myIndex-1];
                let previousSlideCenterY = this.previousSlidesHeight(previousSlide) + (this.barTotalHeight(previousSlide) / 2);

                if (draggedY < previousSlideCenterY) {
                    this._slideDeck.moveSlide(myIndex, myIndex -1);
                }

            } else if (draggedY > originalY && myIndex < this._slideDeck.slides.length - 1) {                
                // check downwards
                const nextSlide = this._slideDeck.slides[myIndex + 1];
                let nextSlideCenterY = this.previousSlidesHeight(nextSlide) + (this.barTotalHeight(nextSlide) / 2);

                if (draggedY > nextSlideCenterY) {
                    this._slideDeck.moveSlide(myIndex, myIndex + 1);
                }
            }

            return "translate(0," + d3.event.y + ")";
        });
    }

    private moveDragended = (that: any, draggedObject: any) => {
        d3.select<any, any>(that).classed("active", false)
            .attr("transform", (slide: IProvenanceSlide) => { 
                return "translate(0," + this.previousSlidesHeight(slide) + ")"; 
            });
    }

    private delayDragged = (that: any, slide: IProvenanceSlide) => {
        slide.delay = Math.max(0, d3.event.y) / this._barHeightTimeMultiplier;
        this.update();
    }

    private delaySubject = (that: any, slide: IProvenanceSlide) => {
        return {y: this.barDelayHeight(slide)};
    }

    private durationDragged = (that: any, slide: IProvenanceSlide) => {
        slide.duration = Math.max(0, d3.event.y) / this._barHeightTimeMultiplier;
        this.update();
    }

    private durationSubject = (that: any, slide: IProvenanceSlide) => {
        return {y: this.barDurationHeight(slide)};
    }

    private barDelayHeight(slide: IProvenanceSlide) {
        let calculatedHeight = this._barHeightTimeMultiplier * slide.delay;
        return Math.max(calculatedHeight, 0);
    }

    private barDurationHeight(slide: IProvenanceSlide) {
        let calculatedHeight = this._barHeightTimeMultiplier * slide.duration;
        return Math.max(calculatedHeight, this._minimumSlideDuration * this._barHeightTimeMultiplier);
    }

    private barTotalHeight(slide: IProvenanceSlide) {
        let calculatedHeight = this.barDelayHeight(slide) + this.barDurationHeight(slide) + 2 * this._resizebarheight;

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
                .clickDistance([2, 2])
                .on('start', this.moveDragStarted)
                .on('drag', firstArgThis(this.moveDragged))
                .on('end', firstArgThis(this.moveDragended)));

        newNodes.append('rect')
            .attr('class', 'slides_delay_resize')
            .attr('x', this._barPadding)
            .attr('width', this._barWidth - 2 * this._barPadding)
            .attr('height', this._resizebarheight)
            .attr('cursor', 'ns-resize')
            .call((d3.drag() as any)
                .subject(firstArgThis(this.delaySubject))
                .on('drag', firstArgThis(this.delayDragged)));

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
            .attr('cursor', 'move')
            .on('click', this.onSelect);

        newNodes.append('rect')
            .attr('class', 'slides_duration_resize')
            .attr('x', this._barPadding)
            .attr('width', this._barWidth - 2 * this._barPadding)
            .attr('height', this._resizebarheight)
            .attr('cursor', 'ns-resize')
            .call((d3.drag() as any)
            .subject(firstArgThis(this.durationSubject))
                .on('drag', firstArgThis(this.durationDragged)));

        newNodes.append('text')
            .attr('class', 'slides_text')
            .attr('x', 2 * this._barPadding)
            .attr("dy", ".35em");

        newNodes.append('text')
            .attr('class', 'slides_delaytext')
            .attr('x', this._barWidth /2 + 2 * this._barPadding)
            .attr("dy", ".35em");

        newNodes.append('text')
            .attr('class', 'slides_durationtext')
            .attr('x', this._barWidth /2 + 2 * this._barPadding)
            .attr("dy", ".35em");

        // newNodes.append('rect')
        //     .attr('class', 'slides_delete_rect')
        //     .attr('x', this._barWidth - 50 + 2 * this._barPadding)
        //     .attr('width', 50 - 4 * this._barPadding)
        //     .attr('height', 50 - 4 * this._barPadding)
        //     .attr('id', (data: IProvenanceSlide) => { return 'delete_' + data.id; })
        //     .on('click', this.onDelete);

        newNodes.append('image')
            .attr('class', 'slides_delete_icon')
            .attr("xlink:href", "https://upload.wikimedia.org/wikipedia/commons/7/7d/Trash_font_awesome.svg")
            .attr('x', this._barWidth - 50 + 2 * this._barPadding)
            .attr("width", 32)
            .attr("height", 32)
            .on('click', this.onDelete);

        // Update all nodes
        const allNodes = newNodes.merge(allExistingNodes)
            .attr("transform", (slide: IProvenanceSlide) => { 
                return "translate(0," + this.previousSlidesHeight(slide) + ")"; 
            });

        allNodes.select('rect.slides_delay_rect')
            .attr('height', (slide: IProvenanceSlide) => { return this.barDelayHeight(slide); });

        allNodes.select('rect.slides_delay_resize')
            .attr('y', (slide: IProvenanceSlide) => { return this.barDelayHeight(slide); });

        allNodes.select('rect.slides_rect')
            .attr('selected', (slide:IProvenanceSlide)  => { return this._slideDeck.selectedSlide === slide; })
            .attr('y', (slide: IProvenanceSlide) => { return this.barDelayHeight(slide) + this._resizebarheight; })
            .attr('height', (slide: IProvenanceSlide) => { return this.barDurationHeight(slide); });

        allNodes.select('rect.slides_duration_resize')
            .attr('y', (slide: IProvenanceSlide) => { return this.barTotalHeight(slide) - this._resizebarheight; });
            
        // allNodes.select('rect.slides_delete_rect')
        //     .attr('y', (slide: IProvenanceSlide) => { return this.barDelayHeight(slide) + this._resizebarheight; });
            
        allNodes.select('image.slides_delete_icon')
            .attr('y', (slide: IProvenanceSlide) => { return this.barDelayHeight(slide) + this._resizebarheight; });

        allNodes.select('text.slides_text')
            .attr('y', (slide: IProvenanceSlide) => { return this.barDelayHeight(slide) + this._resizebarheight + 2*this._barPadding; })
            .text((slide: IProvenanceSlide) => { return slide.name; });

        allNodes.select('text.slides_delaytext')
            .attr('y', (slide: IProvenanceSlide) => { return this.barDelayHeight(slide) + this._resizebarheight + 1*this._barPadding; })
            .text((slide: IProvenanceSlide) => { return 'transition: ' + slide.delay /1000; });

        allNodes.select('text.slides_durationtext')
            .attr('y', (slide: IProvenanceSlide) => { return this.barDelayHeight(slide) + this._resizebarheight + 4*this._barPadding; })
            .text((slide: IProvenanceSlide) => { return 'duration: ' + slide.duration /1000; });

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